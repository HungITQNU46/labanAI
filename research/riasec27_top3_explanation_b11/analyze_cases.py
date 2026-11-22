"""Replay only B-10's 21 disjoint P2 pairs; audit frozen inference, never fit."""

from collections import Counter
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
import pandas as pd
import xgboost as xgb

HERE = Path(__file__).resolve().parent
B10 = HERE.parent / "riasec27_recommendation_quality_v1"
sys.path.insert(0, str(B10))
from evaluate_profiles import EvaluationContext, compact, check_output, digest, table
from generate_profiles import DOMAINS, FEATURE_ORDER_27, RESEARCH_STATUS


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def model_evidence(context, before, after):
    frame = pd.DataFrame([before, after], columns=FEATURE_ORDER_27)
    evidence = {}
    for domain, model in context.p2._models.items():
        classifier = model.steps[-1][1]
        row = {"class": type(classifier).__name__,
               "predicted_binary_classes": [int(x) for x in model.predict(frame)]}
        if type(classifier).__name__ == "XGBClassifier":
            matrix = xgb.DMatrix(frame, feature_names=list(FEATURE_ORDER_27))
            booster = classifier.get_booster()
            leaves = booster.predict(matrix, pred_leaf=True)
            changed = np.flatnonzero(leaves[0] != leaves[1]).tolist()
            row.update({"tree_count": len(leaves[0]), "changed_leaf_count": len(changed),
                        "changed_tree_indices_0based": changed,
                        "raw_margins": [float(x) for x in booster.predict(matrix, output_margin=True)]})
        else:
            row["raw_margins"] = [float(x) for x in model.decision_function(frame)]
        row["binary_class_changed"] = row["predicted_binary_classes"][0] != row["predicted_binary_classes"][1]
        evidence[domain] = row
    return evidence


def audit_cases():
    historical = read(B10 / "comparison_results.json")  # Read every B-10 record, not a pasted sample.
    manifest = read(B10 / "profiles_manifest.json")
    lookup = {p["profile_id"]: p for p in manifest["profiles"]}
    bases = {p["profile_id"]: p for p in historical["base_results"]}
    perturbations = historical["perturbation_results"]
    selected = [p for p in perturbations if p["P2"]["comparison"].get("overlap_count") == 0]
    assert len(perturbations) == 6561 and len(selected) == 21
    assert sum(p["P0"]["comparison"].get("overlap_count") == 0 for p in perturbations) == 9
    assert sum(p["P2"]["comparison"].get("evaluable", False) for p in perturbations) == 6340
    context = EvaluationContext()
    assert context.same_scope
    protected_prefixes = ("riasec27_top3_b1_v0/", "riasec27_ml_top3_v0/", "riasec27_q5_models_v1/")
    locked = {k: v for k, v in historical["provenance"]["dependency_sha256"].items()
              if k.startswith(protected_prefixes)}
    assert all(digest(HERE.parent / key) == value for key, value in locked.items())
    cases = []
    for saved in selected:
        profile_id, position = saved["profile_id"], saved["position_0based"]
        before = lookup[profile_id]["answers"].copy()
        after = before.copy()
        after[position] += saved["delta"]
        assert sum(abs(a-b) for a, b in zip(before, after)) == 1
        assert FEATURE_ORDER_27[position] == saved["feature_id"]
        fresh = {"before": {}, "after": {}}
        for method in ["P0", "P2"]:
            for stage, answers in [("before", before), ("after", after)]:
                output = context.run(method, answers)
                assert not check_output(output, context.candidate_ids)
                fresh[stage][method] = compact(output)
            assert fresh["before"][method] == bases[profile_id][method], (profile_id, method, "before")
            assert fresh["after"][method] == saved[method]["after"], (profile_id, method, "after")
        p2_before, p2_after = fresh["before"]["P2"], fresh["after"]["P2"]
        p_delta = {d: p2_after["ml_probabilities"][d]-p2_before["ml_probabilities"][d] for d in DOMAINS}
        z_delta = {d: p2_after["standardized_vector"][d]-p2_before["standardized_vector"][d] for d in DOMAINS}
        for domain in DOMAINS:
            assert np.isclose(z_delta[domain], p_delta[domain]/context.p2.sig_params[domain], rtol=0, atol=1e-14)
        a = {p["major_id"]: p for p in p2_before["all_rankings"]}
        b = {p["major_id"]: p for p in p2_after["all_rankings"]}
        before_ids = {p["major_id"] for p in p2_before["top3"]}
        after_ids = {p["major_id"] for p in p2_after["top3"]}
        assert not before_ids & after_ids
        margins = {stage: fresh[stage]["P2"]["all_rankings"][2]["pearson_r"] - fresh[stage]["P2"]["all_rankings"][3]["pearson_r"]
                   for stage in ["before", "after"]}
        cases.append({"case_id": profile_id + ":" + saved["feature_id"], "profile_id": profile_id,
                      "category": saved["category"], "feature_id": saved["feature_id"],
                      "position_0based": position, "value_before": before[position], "value_after": after[position],
                      "answers_before": dict(zip(FEATURE_ORDER_27, before)),
                      "answers_after": dict(zip(FEATURE_ORDER_27, after)),
                      "fresh_outputs": fresh, "probability_changes": p_delta, "z_score_changes": z_delta,
                      "p2_centered_z_norm": {stage: float(np.linalg.norm(np.array(list(fresh[stage]["P2"]["standardized_vector"].values())) - np.mean(list(fresh[stage]["P2"]["standardized_vector"].values())))) for stage in ["before", "after"]},
                      "p2_boundary_margins": margins,
                      "exited_top3": sorted(before_ids), "entered_top3": sorted(after_ids),
                      "p2_rank_changes_all_21": [{"major_id": key, "rank_before": a[key]["rank"],
                                                 "rank_after": b[key]["rank"], "r_before": a[key]["pearson_r"],
                                                 "r_after": b[key]["pearson_r"], "delta_r": b[key]["pearson_r"]-a[key]["pearson_r"]}
                                                for key in context.candidate_ids],
                      "model_path_evidence": model_evidence(context, before, after),
                      "replay_matches_b10": True})
    assert context.before == context.snapshot()
    summary = {"case_count": len(cases), "replayed_native_rank_calls": 84,
               "category_counts": dict(Counter(c["category"] for c in cases)),
               "changed_question_counts": dict(Counter(c["feature_id"] for c in cases)),
               "max_abs_probability_change": {d: max(abs(c["probability_changes"][d]) for c in cases) for d in DOMAINS},
               "max_abs_z_change": {d: max(abs(c["z_score_changes"][d]) for c in cases) for d in DOMAINS},
               "xgb_changed_leaf_count_range": {d: [min(c["model_path_evidence"][d]["changed_leaf_count"] for c in cases),
                                                     max(c["model_path_evidence"][d]["changed_leaf_count"] for c in cases)] for d in "ISC"},
               "class_flip_count": {d: sum(c["model_path_evidence"][d]["binary_class_changed"] for c in cases) for d in DOMAINS},
               "cases_without_any_binary_class_flip": sum(not any(v["binary_class_changed"] for v in c["model_path_evidence"].values()) for c in cases),
               "cases_without_any_xgb_leaf_change": sum(all(c["model_path_evidence"][d]["changed_leaf_count"] == 0 for d in "ISC") for c in cases),
               "boundary_margin_range": {stage: [min(c["p2_boundary_margins"][stage] for c in cases),
                                                  max(c["p2_boundary_margins"][stage] for c in cases)] for stage in ["before", "after"]}}
    result = {"research_status": RESEARCH_STATUS, "source_b10_sha256": digest(B10 / "comparison_results.json"),
              "source_profiles_sha256": digest(B10 / "profiles_manifest.json"),
              "locked_scoring_dependency_sha256": locked,
              "normalization": context.p2.config["standardization_parameters"],
              "models": {d: {"steps": [{"name": name, "class": type(step).__name__} for name, step in model.steps],
                              "classifier_parameters": {key: "NaN (missing-value sentinel)" if isinstance(value, float) and np.isnan(value) else value
                                                        for key, value in model.steps[-1][1].get_params().items()}}
                         for d, model in context.p2._models.items()},
              "summary": summary, "cases": cases}
    return result


def report(result):
    lines = ["# B-11 — Đối soát 21 trường hợp P2 đổi cả Top-3", "", RESEARCH_STATUS, "",
             "Tái lập riêng 21 cặp từ B-10 bằng ranker gốc: 84 lời gọi P0/P2 trước–sau; không fit, không đọc workbook hoặc Test 947. Tất cả đầu ra compact khớp chính xác B-10, không chỉ so mã ngành.", "",
             "## Kết quả tổng hợp", "", "```json", json.dumps(result["summary"], ensure_ascii=False, indent=2), "```", "",
             "## Diễn giải có căn cứ", "",
             "Tầng Q5: các xác suất trước–sau là đầu ra thật của sáu pipeline đã khóa. Với I/S/C, số cây đổi leaf và raw margin được kiểm tra trực tiếp trên booster của artifact. Nếu số leaf thay đổi >0, có bằng chứng cặp đầu vào đi qua các nhánh cây khác nhau; chưa phải giải thích nhân quả về sở thích của người trả lời.", "",
             "Tầng Z-score: Δz_d = Δp_d/σ_d được kiểm tra với σ cố định (khoảng 0,228–0,267). Đây là phép đổi thang riêng từng chiều, không fit lại và không phải calibration. LR cũng có thay đổi margin/xác suất; không quy mọi biến động cho XGBoost.", "",
             "Tầng Pearson: r dựa vào hướng của vector sáu chiều sau trừ trung bình và chia chuẩn. Vector có độ phân hóa thấp có thể nhạy với thay đổi hướng. Báo centered-z norm và gap r hạng 3/4 thực tế, không đặt ngưỡng gần/xa tùy ý hoặc ngưỡng ổn định khoa học.", "",
             "Mốc lớp nhị phân được ghi từ model.predict để đối chiếu; ranker thực tế dùng predict_proba, không dùng lớp nhị phân hoặc mốc 0,5 để chọn ngành. Một lần đổi lớp không tự chứng minh nguyên nhân đổi Top-3.", "",
             "Đối soát cụ thể: 8/21 cặp đổi cả Top-3 dù không đổi lớp nhị phân nào; random_122:R1 không đổi leaf ở cả ba mô hình XGBoost nhưng vẫn đổi cả Top-3. Vì vậy không thể giải thích toàn bộ 21 cặp bằng ranh giới lớp 0,5 hoặc chỉ bằng XGBoost.", "",
             "Không phát hiện sai khác suy luận hoặc bug ranking trong 21 cặp. Đây là hành vi nhạy cần trình bày minh bạch; chưa chứng nhận chất lượng hướng nghiệp và không chứng minh P2 hơn P0.", ""]
    lines += [table(["Hồ sơ", "Câu", "Trước→sau", "Gap 3/4 trước", "Gap 3/4 sau"],
                    [[c["profile_id"], c["feature_id"], f"{c['value_before']}→{c['value_after']}",
                      f"{c['p2_boundary_margins']['before']:.8f}", f"{c['p2_boundary_margins']['after']:.8f}"] for c in result["cases"]]), ""]
    for case in result["cases"]:
        outputs = case["fresh_outputs"]
        lines += ["## " + case["case_id"], "", f"Câu {case['feature_id']}: {case['value_before']} → {case['value_after']}. Đầu vào tổng hợp đầy đủ:", "",
                  table(["Mã câu", "Trước", "Sau"], [[q, case["answers_before"][q], case["answers_after"][q]] for q in FEATURE_ORDER_27]), "",
                  table(["Chiều", "Mean trước", "Mean sau", "p trước", "p sau", "z trước", "z sau"],
                        [[d] + [f"{outputs[s]['P2'][key][d]:.8f}" for key in ["domain_means", "ml_probabilities", "standardized_vector"] for s in ["before", "after"]] for d in DOMAINS]), "",
                  table(["Phương pháp", "Thời điểm", "Hạng", "Ngành", "r"],
                        [[m, s, row["rank"], row["major_id"], f"{row['pearson_r']:.10f}"] for m in ["P0", "P2"] for s in ["before", "after"] for row in outputs[s][m]["top3"]]), "",
                  "Rời Top-3 P2: " + ", ".join(case["exited_top3"]) + ".", "",
                  "Gia nhập Top-3 P2: " + ", ".join(case["entered_top3"]) + ".", "",
                  table(["Ngành", "Hạng trước", "Hạng sau", "r trước", "r sau", "Δr"],
                        [[row["major_id"], row["rank_before"], row["rank_after"], f"{row['r_before']:.8f}", f"{row['r_after']:.8f}", f"{row['delta_r']:.8f}"] for row in case["p2_rank_changes_all_21"]]), "",
                  "Bằng chứng tầng mô hình (không phải attribution nhân quả):", "", "```json", json.dumps(case["model_path_evidence"], ensure_ascii=False, indent=2), "```", ""]
    return "\n".join(lines)


if __name__ == "__main__":
    result = audit_cases()
    (HERE / "case_audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    (HERE / "case_report.md").write_text(report(result), encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False, indent=2))
