"""B-10: call the locked native rankers; write synthetic evaluation only here."""

from collections import Counter
import hashlib
import importlib.util
import importlib.metadata
import json
import math
from pathlib import Path
import sys

from generate_profiles import (FEATURE_ORDER_27, DOMAIN_INDICES, DOMAINS,
                               RESEARCH_STATUS, build_manifest, iter_perturbations)
from metrics import (compare, describe, summarize_comparisons,
                     summarize_distribution, top3_ids)

HERE = Path(__file__).resolve().parent
RESEARCH = HERE.parent


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def native_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class EvaluationContext:
    """Read-only access to existing inference APIs, never training APIs."""

    def __init__(self):
        self.p0 = native_module("b10_native_p0", RESEARCH / "riasec27_top3_b1_v0/prototype.py")
        self.p2_module = native_module("b10_native_p2", RESEARCH / "riasec27_ml_top3_v0/ranker.py")
        self.p2 = self.p2_module.MLTop3Ranker()
        self.p2._verify_and_load_dependencies()
        self.reference = self.p0.load_reference_catalog()
        self.catalog_path = RESEARCH / "riasec27_major_catalog_v1/majors_registry.json"
        self.catalog = read_json(self.catalog_path)
        self.ready = [m for m in self.reference["majors"] if m["status"] == "READY_FOR_PROTOTYPE"]
        self.candidate_ids = [m["major_id"] for m in self.ready]
        self.names = {m["major_id"]: m["major_name_vi"] for m in self.ready}
        assert tuple(self.p0.QUESTION_ORDER) == FEATURE_ORDER_27 == tuple(self.p2.question_order)
        assert self.p0.DOMAIN_INDICES == DOMAIN_INDICES == self.p2.domain_indices
        assert tuple(self.p2.domain_order) == DOMAINS
        p0_scope = {m["major_id"]: (m["soc_code"], m["oi_vector"]) for m in self.ready}
        p2_scope = {m["major_id"]: (m["soc_code"], m["oi_vector"]) for m in self.p2._ready_majors}
        catalog_scope = {m["major_id"]: (m["primary_soc_code"], m["oi_vector"])
                         for m in self.catalog["majors"]
                         if m["status"] == "READY_FOR_PROTOTYPE" and m["automatic_ranking_eligibility"]}
        self.same_scope = len(p0_scope) == 21 and p0_scope == p2_scope == catalog_scope
        for model in self.p2._models.values():
            assert tuple(model.feature_names_in_) == FEATURE_ORDER_27
            assert list(model.classes_) == [0, 1]
        self.before = self.snapshot()

    def snapshot(self):
        paths = [RESEARCH / "riasec27_top3_b1_v0/prototype.py",
                 RESEARCH / "riasec27_top3_b1_v0/reference.json",
                 RESEARCH / "riasec27_ml_top3_v0/ranker.py",
                 RESEARCH / "riasec27_ml_top3_v0/ranking_config.json"]
        for folder in ["riasec27_q5_models_v1", "riasec27_major_catalog_v1",
                       "riasec27_tier2_explorer_v0", "riasec27_evaluation_protocol_v1"]:
            paths.extend(p for p in (RESEARCH / folder).iterdir()
                         if p.is_file() and p.suffix in {".py", ".json", ".md", ".joblib"})
        return {p.relative_to(RESEARCH).as_posix(): digest(p) for p in sorted(set(paths))}

    def run(self, method, answers):
        try:
            if method == "P0":
                result = self.p0.rank_majors(answers, reference_data=self.reference)
            elif method == "P2":
                result = self.p2.rank(answers)
            else:
                raise ValueError("Unknown method")
            return result
        except Exception as error:
            return {"status": "ERROR", "error_type": type(error).__name__,
                    "top3": [], "all_rankings": []}

    def provenance(self):
        return {"python": sys.version, "interpreter": sys.executable,
                "libraries": {p: importlib.metadata.version(p) for p in
                              ["numpy", "pandas", "scipy", "scikit-learn", "xgboost", "joblib"]},
                "dependency_sha256": self.before, "same_candidate_scope": self.same_scope,
                "evaluation_source_sha256": {name: digest(HERE / name) for name in
                                             ["generate_profiles.py", "metrics.py", "evaluate_profiles.py", "test_evaluation.py"]},
                "candidate_ids": self.candidate_ids,
                "native_apis": {"P0": "prototype.rank_majors(list, reference_data=...)",
                                "P2": "MLTop3Ranker.rank(list); reversed-key dict equivalence checked"},
                "standardization_parameters": self.p2.config["standardization_parameters"],
                "pipelines": {d: [{"step": name, "class": type(step).__name__}
                                   for name, step in model.steps]
                              for d, model in self.p2._models.items()},
                "calibration_status": read_json(RESEARCH / "riasec27_q5_models_v1/models_manifest.json")["calibration_status"]}


def compact(result):
    """Retain native status/scores/vectors; remove repeated narrative/catalog metadata."""
    fields = ["status", "user_vector", "domain_means", "ml_probabilities",
              "standardized_vector", "error_type"]
    out = {key: result[key] for key in fields if key in result}
    for field in ["top3", "tied_majors", "all_rankings"]:
        out[field] = [{k: row[k] for k in ["major_id", "pearson_r", "rank"]}
                      for row in result.get(field, [])]
    return out


def check_output(result, candidate_ids, flat=False):
    issues = []
    status = result.get("status")
    allowed = {"SUCCESS", "ABSTAIN_FLAT_PROFILE", "TIED_BOUNDARY"}
    if status not in allowed:
        issues.append("Unexpected status: " + str(status))
    if flat and status != "ABSTAIN_FLAT_PROFILE":
        issues.append("Flat-domain guard did not abstain")
    rankings = result.get("all_rankings", [])
    ids = [r["major_id"] for r in rankings]
    if status in {"SUCCESS", "TIED_BOUNDARY"} and (len(ids) != 21 or set(ids) != set(candidate_ids)):
        issues.append("Scored candidate scope differs from 21 READY IDs")
    if any(not math.isfinite(r["pearson_r"]) or not -1 <= r["pearson_r"] <= 1 for r in rankings):
        issues.append("Non-finite or out-of-range Pearson")
    if status == "SUCCESS":
        if len(result.get("top3", [])) != 3 or result["top3"] != rankings[:3]:
            issues.append("SUCCESS Top-3 contract violated")
        if len(ids) >= 4 and rankings[2]["rank"] == rankings[3]["rank"]:
            issues.append("Boundary tie was sliced")
    elif result.get("top3"):
        issues.append("Abstained/tied/error output exposes a selected Top-3")
    probs = result.get("ml_probabilities")
    if "ml_probabilities" in result and status == "SUCCESS" and probs is None:
        issues.append("SUCCESS P2 output lacks probabilities")
    if probs is not None and (set(probs) != set(DOMAINS) or any(
            not math.isfinite(p) or not 0 <= p <= 1 for p in probs.values())):
        issues.append("Invalid six Q5 probabilities")
    z = result.get("standardized_vector")
    if "standardized_vector" in result and status == "SUCCESS" and z is None:
        issues.append("SUCCESS P2 output lacks standardized vector")
    if z is not None and (set(z) != set(DOMAINS) or any(not math.isfinite(v) for v in z.values())):
        issues.append("Invalid standardized vector")
    return issues


def documentation_findings():
    path = RESEARCH / "riasec27_tier2_explorer_v0/README.md"
    if "Cosine" not in path.read_text(encoding="utf-8"):
        return []
    return [{"severity": "LOW", "file": "riasec27_tier2_explorer_v0/README.md:20; research_flow.py:6",
             "input": "Not input-dependent: documentation inspection",
             "expected": "Documentation describes the locked Pearson ranking policy",
             "actual": "Tier 2 architecture diagram/docstring still says Cosine; actual flow delegates to Pearson P2 ranker",
             "impact": "May mislead research interpretation; no runtime modification in B-10",
             "action": "Propose a separate documentation correction; do not change similarity"}]


def probability_changes(before, after):
    a, b = before.get("ml_probabilities"), after.get("ml_probabilities")
    return {d: b[d]-a[d] for d in DOMAINS} if a is not None and b is not None else None


def all_score_changes(before, after):
    a = {r["major_id"]: r["pearson_r"] for r in before.get("all_rankings", [])}
    b = {r["major_id"]: r["pearson_r"] for r in after.get("all_rankings", [])}
    return {key: b[key]-a[key] for key in sorted(a.keys() & b.keys())}


def stability_summary(rows, method):
    comparisons = [row[method]["comparison"] for row in rows]
    transitions = Counter(row[method]["before_status"] + " -> " + row[method]["after_status"] for row in rows)
    deltas = [abs(v) for row in rows for v in row[method]["all_candidate_score_changes"].values()]
    result = summarize_comparisons(comparisons, len(rows))
    result["status_transitions"] = dict(sorted(transitions.items()))
    result["absolute_pearson_change_all_common_candidates"] = describe(deltas)
    if method == "P2":
        result["absolute_probability_change"] = {
            d: describe([abs(row["q5_probability_changes"][d]) for row in rows
                         if row["q5_probability_changes"] is not None]) for d in DOMAINS}
    return result


def evaluate(context, manifest, progress=False):
    base, perturbations, anomalies = [], [], []

    def audit(method, answers, identifier, result, flat=False):
        for issue in check_output(result, context.candidate_ids, flat):
            anomalies.append({"severity": "CRITICAL", "profile_id": identifier, "answers": answers,
                              "method": method, "expected": "Native locked status/candidate/flat/tie contract",
                              "actual": issue, "function": "prototype.rank_majors" if method == "P0" else "MLTop3Ranker.rank",
                              "impact": "Unreliable or unavailable recommendation; separate patch required"})

    for profile in manifest["profiles"]:
        answers = profile["answers"]
        row = {"profile_id": profile["profile_id"], "category": profile["category"]}
        for method in ["P0", "P2"]:
            output = context.run(method, answers)
            audit(method, answers, profile["profile_id"], output, profile["category"].startswith("flat_"))
            if output != context.run(method, answers):
                anomalies.append({"severity": "CRITICAL", "profile_id": profile["profile_id"],
                                  "answers": answers, "method": method, "expected": "Identical repeated output",
                                  "actual": "Non-deterministic repeated inference", "function": "native ranker",
                                  "impact": "Recommendation changes without an input change"})
            row[method] = compact(output)
        keyed = dict(reversed(list(zip(FEATURE_ORDER_27, answers))))
        if row["P2"] != compact(context.run("P2", keyed)):
            anomalies.append({"severity": "CRITICAL", "profile_id": profile["profile_id"],
                              "answers": answers, "method": "P2", "expected": "List and keyed input identical",
                              "actual": "Input representation mismatch", "function": "MLTop3Ranker.rank",
                              "impact": "Question order can change recommendations"})
        row["comparison"] = compare(row["P0"], row["P2"], context.same_scope)
        base.append(row)
    lookup = {row["profile_id"]: row for row in base}
    for index, change in enumerate(iter_perturbations(manifest["profiles"])):
        original = lookup[change["profile_id"]]
        row = {k: v for k, v in change.items() if k != "answers"}
        for method in ["P0", "P2"]:
            after = compact(context.run(method, change["answers"]))
            audit(method, change["answers"], change["profile_id"] + ":" + change["feature_id"], after)
            before = original[method]
            row[method] = {"before_status": before["status"], "after_status": after["status"],
                           "after": after, "comparison": compare(before, after, context.same_scope),
                           "all_candidate_score_changes": all_score_changes(before, after)}
            if method == "P2":
                row["q5_probability_changes"] = probability_changes(before, after)
        perturbations.append(row)
        if progress and (index+1) % 1000 == 0:
            print(f"Perturbations evaluated: {index+1}", flush=True)
    if context.before != context.snapshot():
        anomalies.append({"severity": "CRITICAL", "expected": "All dependency SHA-256 unchanged",
                          "actual": "Dependency changed during evaluation", "function": "EvaluationContext.snapshot",
                          "impact": "Locked provenance invalidated"})
    categories = sorted({row["category"] for row in base})
    summary = {"cross_method": summarize_comparisons([row["comparison"] for row in base], len(base)),
               "distribution": {m: summarize_distribution([r[m] for r in base], context.candidate_ids) for m in ["P0", "P2"]},
               "by_category": {}, "stability": {m: stability_summary(perturbations, m) for m in ["P0", "P2"]},
               "stability_by_category": {}}
    for category in categories:
        subset = [r for r in base if r["category"] == category]
        summary["by_category"][category] = {
            "n": len(subset), "comparison": summarize_comparisons([r["comparison"] for r in subset], len(subset)),
            **{m: summarize_distribution([r[m] for r in subset], context.candidate_ids) for m in ["P0", "P2"]}}
        changed = [r for r in perturbations if r["category"] == category]
        summary["stability_by_category"][category] = {m: stability_summary(changed, m) for m in ["P0", "P2"]}
    state = ("RECOMMENDATION_EVALUATION_BLOCKED" if anomalies else
             "RECOMMENDATION_BEHAVIOR_EVALUATED" if context.same_scope else "RECOMMENDATION_EVALUATION_CONDITIONAL")
    return {"schema_version": "1.0.0", "research_status": RESEARCH_STATUS, "evaluation_status": state,
            "provenance": context.provenance(), "profile_count": len(base),
            "perturbation_count": len(perturbations), "summary": summary,
            "documentation_findings": documentation_findings(),
            "anomalies": anomalies, "base_results": base, "perturbation_results": perturbations}


def fmt(value):
    return "N/A" if value is None else f"{value:.6f}"


def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "|" + "---|"*len(headers)] +
                     ["| " + " | ".join(str(v) for v in row) + " |" for row in rows])


LIMITS = """Không có ground truth ngành đúng, nhãn relevance hoặc khảo sát độc lập. Không tính Accuracy,
Hit@3, NDCG hay kết luận P2 tốt hơn P0. Các hồ sơ thiết kế và các perturb có chung hồ sơ gốc,
không phải mẫu học sinh độc lập; không suy rộng tần suất hay tính khoảng tin cậy dân số.
Likert là thứ bậc. Hồ sơ cực trị/ngẫu nhiên có thể ngoài phân bố huấn luyện. Xác suất Q5 chưa
được phê duyệt calibration; không phải xác suất phù hợp ngành hoặc thành công. Chỉ 21/33 ngành
tham gia; 12 ngành còn lại không được chấm. READY chỉ là điều kiện chạy prototype.
Không đặt ngưỡng đạt ổn định khoa học; không thay model, normalization, mapping hoặc tie policy.
"""


def write_reports(context, manifest, results):
    summary = results["summary"]
    distribution = summary["distribution"]
    intro = f"# B-10 — Đánh giá hành vi Top-3\n\n{RESEARCH_STATUS}\n\n{results['evaluation_status']}\n\n"
    report = intro + f"{len(manifest['profiles'])} hồ sơ tổng hợp; {results['perturbation_count']} perturb một câu, một bậc. Seed 42; perturb seed 20261121. Cùng 21 ID/SOC/OI: {context.same_scope}.\n\n"
    report += "P0 gọi prototype.rank_majors: sáu trung bình thô → Pearson. P2 gọi MLTop3Ranker.rank: sáu predict_proba → Z-score cố định → Pearson. Không viết lại ranker.\n\n"
    report += table(["Nhóm", "N", "P0 trạng thái", "P2 trạng thái", "Cặp hợp lệ", "Jaccard TB"],
                    [[c, v["n"], json.dumps(v["P0"]["statuses"]), json.dumps(v["P2"]["statuses"]),
                      v["comparison"]["evaluable_pairs"], fmt(v["comparison"]["jaccard_at_3"]["mean"])]
                     for c, v in summary["by_category"].items()])
    report += "\n\n## Trùng nhau giữa phương pháp\n\n```json\n" + json.dumps(summary["cross_method"], ensure_ascii=False, indent=2) + "\n```\n\n"
    report += "Cặp không SUCCESS hoặc khác phạm vi không được gán Jaccard=1 hay 0; được giữ trong tổng mẫu số. Top-1 đồng hạng và thứ tự trong nhóm đồng hạng là N/A, không dùng ID phá hòa.\n\n"
    report += "## Tần suất đủ 21 ngành\n\n" + table(["Ngành", "ID", "P0 số slot", "P2 số slot"],
        [[context.names[key], key, distribution["P0"]["frequency"][i]["top3_count"],
          distribution["P2"]["frequency"][i]["top3_count"]] for i, key in enumerate(context.candidate_ids)])
    report += "\n\nMỗi SUCCESS đóng góp đúng ba slot. Tỷ trọng slot = c_i/Σc; tỷ lệ hồ sơ = c_i/N_SUCCESS. ABSTAIN/TIED đóng góp 0 slot nhưng vẫn ở mẫu số trạng thái N=243.\n\n"
    report += "Gini = Σ_iΣ_j|c_i−c_j|/(2mΣc_i), m=21 gồm cả tần suất 0. Entropy = −Σ p_i ln(p_i), p_i=c_i/Σc; chuẩn hóa H/ln(21), số ngành hiệu dụng exp(H). Các chỉ số chỉ mô tả tập tổng hợp này.\n\n"
    report += table(["Phương pháp", "SUCCESS", "Slot", "Số ngành có mặt", "Tập Top-3 khác nhau", "Gini", "H/ln21"],
                    [[m, v["success_count"], v["top3_slots"], v["candidate_coverage_count"], v["unique_top3_sets"], fmt(v["gini"]), fmt(v["normalized_entropy"])] for m, v in distribution.items()])
    report += "\n\n## Bất thường kỹ thuật\n\n" + (json.dumps(results["anomalies"], ensure_ascii=False, indent=2) if results["anomalies"] else "Không phát hiện vi phạm hợp đồng kỹ thuật trong các lời gọi đã kiểm tra. Điều này không chứng nhận chất lượng hướng nghiệp.")
    report += "\n\n## Bất nhất tài liệu mức thấp\n\n```json\n" + json.dumps(results.get("documentation_findings", []), ensure_ascii=False, indent=2) + "\n```"
    report += "\n\nTần suất tổng hợp chịu trọng số thiết kế: 128/243 hồ sơ ngẫu nhiên và 34/243 anchor/biến thể anchor. Xem số liệu riêng từng nhóm trong comparison_results.json; không diễn giải bảng gộp thành phân bố dân số.\n"
    report += "\n\n## Giới hạn\n\n" + LIMITS
    (HERE / "comparison_report.md").write_text(report, encoding="utf-8")
    stability = intro.replace("Đánh giá hành vi Top-3", "Độ ổn định khi perturb")
    stability += "Mỗi câu của mỗi hồ sơ được thay đúng ±1; tại biên 1/5 chọn hướng vào trong, các mức giữa dùng seed cố định. Không chọn perturb dựa vào kết quả. N=6.561 cặp cho mỗi phương pháp.\n\n"
    for method in ["P0", "P2"]:
        stability += f"## {method}\n\n```json\n" + json.dumps(summary["stability"][method], ensure_ascii=False, indent=2) + "\n```\n\n"
    stability += "overlap_counts báo số cặp có 0/1/2/3 ngành chung, thay cho ngưỡng 'thay đổi mạnh' tùy ý. Tỷ lệ không giao Top-3 = số overlap=0 / số cặp SUCCESS hai phía; báo thêm mẫu số toàn bộ.\n\n"
    stability += "Điểm r được so trên mọi ứng viên chung có điểm; chênh lệch Top-3 chung cũng được lưu riêng. Q5 delta chỉ tính khi cả trước/sau có đủ sáu xác suất; qua flat guard là N/A. P95 nội suy tuyến tính trên chỉ số 0,95(n−1); không phải khoảng tin cậy.\n\n"
    stability += table(["Nhóm", "N cặp", "P0 Jaccard TB", "P2 Jaccard TB"],
                       [[c, v["P0"]["total_pairs"], fmt(v["P0"]["jaccard_at_3"]["mean"]), fmt(v["P2"]["jaccard_at_3"]["mean"])] for c, v in summary["stability_by_category"].items()])
    stability += "\n\n" + LIMITS
    (HERE / "stability_report.md").write_text(stability, encoding="utf-8")
    write_cases(manifest, results)


def write_cases(manifest, results):
    profiles = {p["profile_id"]: p for p in manifest["profiles"]}
    by_id = {r["profile_id"]: r for r in results["base_results"]}
    selected = []
    for category in ["single_dominant", "near_competition", "random_uniform_likert"]:
        valid = [r for r in results["base_results"] if r["category"] == category and r["comparison"]["evaluable"]]
        if valid:
            row = min(valid, key=lambda r: (r["comparison"]["jaccard_at_3"], r["profile_id"]))
            selected.append((row["profile_id"], profiles[row["profile_id"]]["answers"], row))
    valid = [r for r in results["perturbation_results"] if r["P2"]["comparison"]["evaluable"]]
    worst = min(valid, key=lambda r: (r["P2"]["comparison"]["jaccard_at_3"], r["profile_id"], r["position_0based"])) if valid else None
    if worst:
        original = by_id[worst["profile_id"]]
        selected.append((worst["profile_id"] + ":before", profiles[worst["profile_id"]]["answers"], original))
        answers = profiles[worst["profile_id"]]["answers"].copy()
        answers[worst["position_0based"]] += worst["delta"]
        selected.append((worst["profile_id"] + ":after:" + worst["feature_id"], answers,
                         {m: worst[m]["after"] for m in ["P0", "P2"]}))
    text = f"# B-10 — Các trường hợp giải thích\n\n{RESEARCH_STATUS}\n\nChọn theo quy tắc cố định trong manifest: Jaccard nhỏ nhất từng nhóm và perturb P2, hòa theo ID/vị trí. Đây là ví dụ cực trị mô tả, không đại diện dân số.\n\n"
    for identifier, answers, row in selected:
        text += f"## {identifier}\n\n" + table(["Mã câu", "Giá trị"], list(zip(FEATURE_ORDER_27, answers)))
        text += "\n\n" + table(["Chiều", "Trung bình thô P0", "p Q5 P2", "z P2"],
                                  [[d, fmt(row["P0"].get("user_vector", {}).get(d)),
                                    fmt((row["P2"].get("ml_probabilities") or {}).get(d)),
                                    fmt((row["P2"].get("standardized_vector") or {}).get(d))] for d in DOMAINS])
        text += "\n\n" + table(["Phương pháp", "Trạng thái", "Hạng", "Ngành", "Pearson r"],
            [[m, row[m]["status"], item["rank"], item["major_id"], fmt(item["pearson_r"])] for m in ["P0", "P2"] for item in row[m]["top3"]])
        text += "\n\nKhác biệt kỹ thuật: P0 tương quan vector trung bình thô với OI; P2 tương quan vector z của sáu xác suất với cùng OI. Z dùng μ/σ từng chiều đã khóa, không ước lượng lại trên hồ sơ này. Thay vector làm đổi hình dạng tương đối giữa sáu chiều và thứ hạng Pearson. Đây là giải thích phép tính xếp hạng, chưa chỉ ra đặc trưng nào gây ra dự đoán ML.\n\n"
        means = row["P0"].get("user_vector") or {}
        standardized = row["P2"].get("standardized_vector") or {}
        if means and standardized:
            high_raw = [d for d in DOMAINS if means[d] == max(means.values())]
            high_z = [d for d in DOMAINS if standardized[d] == max(standardized.values())]
            text += f"Giá trị lớn nhất: trung bình thô ở {','.join(high_raw)}; vector z ở {','.join(high_z)}. Đây chỉ là đối chiếu hai vector, không phải quy tắc 'chọn ngành theo chiều cao nhất'.\n\n"
        if row["P0"].get("all_rankings") and row["P2"].get("all_rankings"):
            margins = {m: row[m]["all_rankings"][2]["pearson_r"]-row[m]["all_rankings"][3]["pearson_r"] for m in ["P0", "P2"]}
            text += f"Khoảng cách r tại biên hạng 3/4: P0={fmt(margins['P0'])}, P2={fmt(margins['P2'])}. Đây là khoảng cách số học, không phải độ tin cậy hướng nghiệp.\n\n"
    if worst:
        text += "## Perturb đã chọn\n\n```json\n" + json.dumps({k: worst[k] for k in ["profile_id", "feature_id", "delta", "q5_probability_changes"]}, ensure_ascii=False, indent=2) + "\n```\n\n"
        text += "Không suy từ một chênh lệch đầu vào–đầu ra thành giải thích nhân quả hoặc attribution đáng tin cậy. Pearson gần nhau có thể đổi thứ tự qua perturb nhỏ; xem đầy đủ điểm và trạng thái trước–sau trong JSON.\n\n"
        text += "So sánh P2 trước–sau: " + json.dumps(worst["P2"]["comparison"], ensure_ascii=False) + "\n\n"
    text += LIMITS
    (HERE / "explainability_cases.md").write_text(text, encoding="utf-8")


def main():
    manifest = build_manifest()
    context = EvaluationContext()
    results = evaluate(context, manifest, progress=True)
    save_results(manifest, results)
    write_reports(context, manifest, results)
    print(json.dumps({"status": results["evaluation_status"], "profiles": results["profile_count"],
                      "perturbations": results["perturbation_count"], "anomalies": len(results["anomalies"])}, ensure_ascii=False), flush=True)


def save_results(manifest, results):
    """Pretty summary/base results and one compact, inspectable line per perturbation."""
    (HERE / "profiles_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    header = {k: v for k, v in results.items() if k != "perturbation_results"}
    with (HERE / "comparison_results.json").open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(header, ensure_ascii=False, indent=2, allow_nan=False)[:-2])
        stream.write(',\n  "perturbation_results": [\n')
        for index, row in enumerate(results["perturbation_results"]):
            if index:
                stream.write(",\n")
            stream.write("    " + json.dumps(row, ensure_ascii=False, separators=(",", ":"), allow_nan=False))
        stream.write("\n  ]\n}\n")


if __name__ == "__main__":
    main()
