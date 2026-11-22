"""Offline paired evaluation; B-12 command line accepts declared synthetic demos only."""
from collections import Counter
import json
import math
from pathlib import Path
import statistics

try:
    from .contracts import HERE, RESEARCH, DEMO_STATUS, RESEARCH_STATUS, load_contract, native_module, sha256
    from .metrics import score_top3
    from .validate_input import load_document, validate_document
except ImportError:
    from contracts import HERE, RESEARCH, DEMO_STATUS, RESEARCH_STATUS, load_contract, native_module, sha256
    from metrics import score_top3
    from validate_input import load_document, validate_document


class NativeRankers:
    def __init__(self, contract):
        self.contract = contract
        self.p0 = native_module("b12_native_p0", RESEARCH / "riasec27_top3_b1_v0/prototype.py")
        module = native_module("b12_native_p2", RESEARCH / "riasec27_ml_top3_v0/ranker.py")
        self.p2 = module.MLTop3Ranker()
        if tuple(self.p0.QUESTION_ORDER) != contract["question_order"] or tuple(self.p2.question_order) != contract["question_order"]:
            raise ValueError("NATIVE_FEATURE_ORDER_MISMATCH")
        self.same_scope = True

    def call(self, method, ordered_answers):
        try:
            if method == "P0":
                return self.p0.rank_majors(ordered_answers, reference_data=self.contract["reference"])
            result = self.p2.rank(ordered_answers)
            if result.get("status") in {"SUCCESS", "TIED_BOUNDARY"}:
                a = {m["major_id"]: (m["soc_code"], m["oi_vector"]) for m in self.p2._ready_majors}
                b = {m["major_id"]: (m["soc_code"], m["oi_vector"]) for m in self.contract["reference"]["majors"] if m["status"] == "READY_FOR_PROTOTYPE"}
                self.same_scope = self.same_scope and a == b and len(a) == 21
            return result
        except Exception:
            # Do not echo exception messages, payloads, paths or tracebacks.
            return {"status": "ERROR", "top3": [], "all_rankings": []}


def safe_ranking(result, candidate_ids):
    """Keep only the actual status and minimal ranking output, never Q5/answers."""
    if not isinstance(result, dict) or not isinstance(result.get("status"), str):
        return {"status": "ERROR", "error_code": "INVALID_RANKER_CONTRACT", "top3": []}
    status = result["status"]
    if status not in {"SUCCESS", "ABSTAIN_FLAT_PROFILE", "TIED_BOUNDARY"}:
        return {"status": "ERROR", "error_code": "RANKER_FAILURE", "top3": []}
    if status != "SUCCESS":
        if result.get("top3"):
            return {"status": "ERROR", "error_code": "UNSAFE_NON_SUCCESS_TOP3", "top3": []}
        return {"status": status, "top3": []}
    try:
        top3, all_rankings = result["top3"], result["all_rankings"]
        ids = [m["major_id"] for m in all_rankings]
        if len(ids) != 21 or set(ids) != set(candidate_ids) or len(top3) != 3 or top3 != all_rankings[:3]:
            raise ValueError("INVALID_POOL_OR_TOP3")
        if any(type(m["rank"]) is not int or not math.isfinite(m["pearson_r"]) or not -1 <= m["pearson_r"] <= 1 for m in all_rankings):
            raise ValueError("INVALID_SCORE_OR_RANK")
        if all_rankings[2]["rank"] == all_rankings[3]["rank"]:
            raise ValueError("SLICED_BOUNDARY_TIE")
        return {"status": "SUCCESS", "top3": [{k: m[k] for k in ["major_id", "rank", "pearson_r"]} for m in top3]}
    except (KeyError, TypeError, ValueError, IndexError):
        return {"status": "ERROR", "error_code": "INVALID_RANKER_CONTRACT", "top3": []}


def fraction(count, denominator):
    return {"count": count, "denominator": denominator, "rate": count/denominator if denominator else None}


def evaluate(document, contract=None, rankers=None):
    contract = contract or load_contract()
    validations = validate_document(document, contract)
    # Injection is for contract/formula tests; CLI always instantiates NativeRankers.
    rankers = rankers or NativeRankers(contract)
    records = document["records"]
    rows = []
    for index, (record, validation) in enumerate(zip(records, validations)):
        row = {"row_number": index+1, "participant_id": validation["participant_id"],
               "valid": validation["valid"], "validation_errors": validation["errors"],
               "missing_label_count": validation["missing_labels"],
               "evaluation_status": "NOT_EVALUABLE", "not_evaluable_reasons": [], "paired_metrics": None}
        if not validation["valid"]:
            row.update({m: {"status": "NOT_RUN_INVALID_INPUT", "top3": []} for m in ["P0", "P2"]})
            row["not_evaluable_reasons"].append("INVALID_INPUT")
            if validation["missing_labels"]:
                row["not_evaluable_reasons"].append("INSUFFICIENT_LABELS")
            rows.append(row)
            continue
        answers = [record["answers"][q] for q in contract["question_order"]]
        for method in ["P0", "P2"]:
            # Same values and independent copies; labels never enter either ranker.
            row[method] = safe_ranking(rankers.call(method, answers.copy()), contract["candidate_ids"])
        if not rankers.same_scope:
            row["not_evaluable_reasons"].append("CANDIDATE_SCOPE_MISMATCH")
        if any(row[m]["status"] != "SUCCESS" for m in ["P0", "P2"]):
            row["not_evaluable_reasons"].append("NON_SUCCESS")
        if validation["missing_labels"]:
            row["not_evaluable_reasons"].append("INSUFFICIENT_LABELS")
        if not row["not_evaluable_reasons"]:
            labels = record["major_interest_labels"]
            try:
                scores = {m: score_top3(row[m]["top3"], labels, contract["candidate_ids"]) for m in ["P0", "P2"]}
                row["paired_metrics"] = {**scores, "p2_minus_p0_ndcg_at_3": scores["P2"]["ndcg_at_3"]-scores["P0"]["ndcg_at_3"]}
                row["evaluation_status"] = "EVALUABLE_COMPLETE_21"
            except ValueError:
                row["not_evaluable_reasons"].append("INVALID_NATIVE_RANKS")
        rows.append(row)
    paired = [r for r in rows if r["paired_metrics"] is not None]
    total, valid = len(rows), sum(r["valid"] for r in rows)
    mean = lambda values: statistics.fmean(values) if values else None
    methods = {}
    for method in ["P0", "P2"]:
        counts = Counter(r[method]["status"] for r in rows)
        statuses = {key: counts[key] for key in ["SUCCESS", "ABSTAIN_FLAT_PROFILE", "TIED_BOUNDARY", "ERROR", "NOT_RUN_INVALID_INPUT"]}
        methods[method] = {"statuses": statuses,
                           "status_rates_all_profiles": {key: fraction(value, total) for key, value in statuses.items()},
                           "coverage_all_profiles": fraction(counts["SUCCESS"], total),
                           "coverage_valid_profiles": fraction(counts["SUCCESS"], valid),
                           "paired_metric_denominator": len(paired),
                           **{"mean_"+key: mean([r["paired_metrics"][method][key] for r in paired])
                              for key in ["ndcg_at_3", "precision_at_3", "hit_at_3"]}}
    vectors = [tuple(record["answers"][q] for q in contract["question_order"])
               for record, v in zip(records, validations) if v["valid"]]
    summary = {"total_profiles": total, "valid_profiles": valid, "invalid_profiles": total-valid,
               "missing_label_profiles": sum(r["missing_label_count"] > 0 for r in rows),
               "complete_label_valid_profiles": sum(r["valid"] and r["missing_label_count"] == 0 for r in rows),
               "paired_evaluable_profiles": len(paired), "not_evaluable_profiles": total-len(paired),
               "not_evaluable_reasons_nonexclusive": dict(Counter(reason for r in rows for reason in r["not_evaluable_reasons"])),
               "idcg_zero_paired_profiles": sum(r["paired_metrics"]["P0"]["idcg_zero"] for r in paired),
               "unique_answer_vectors_valid_profiles": len(set(vectors)),
               "mean_paired_difference_ndcg_at_3": mean([r["paired_metrics"]["p2_minus_p0_ndcg_at_3"] for r in paired]),
               "methods": methods}
    return {"schema_version": "1.0.0", "data_kind": DEMO_STATUS, "research_status": RESEARCH_STATUS,
            "analysis_scope": "COMPLETE_OBSERVED_LABELS_ALL_21_READY_PAIRED_SUCCESS_ONLY",
            "metric_policy": {"gain": "2**relevance - 1", "discount": "1/log2(position+1), positions 1..3",
                              "binary_relevant_minimum": 2, "idcg_candidate_count": 21,
                              "idcg_zero": "NDCG=0, included in paired means and counted separately",
                              "missing": "NOT_EVALUABLE; no zero fill or MAR assumption",
                              "within_top3_ties": "Expected DCG over permutations within native tied ranks"},
            "candidate_ids": list(contract["candidate_ids"]), "same_candidate_scope": rankers.same_scope,
            "source_sha256": contract["source_sha256"], "summary": summary, "rows": rows}


def markdown_report(result):
    s = result["summary"]
    lines = ["# B-12 — Demo công cụ đánh giá theo cặp", "", DEMO_STATUS, "", RESEARCH_STATUS, "",
             "Nhãn được sinh độc lập với dự đoán chỉ để kiểm tra công thức/luồng xử lý. Không phải nhãn học sinh, không phải kiểm định khoa học và không phải độ phù hợp nghề nghiệp khách quan.", "",
             "## Quy tắc khóa trước demo", "",
             "Gain=2^rel−1; discount=1/log2(k+1); IDCG lấy ba relevance lớn nhất trên đúng 21 READY. Precision@3 và Hit@3 coi rel≥2 là có quan tâm. Không đổi ngưỡng để P2 thắng. Nhãn null không bằng 0; thiếu một nhãn ngoài Top-3 cũng không đủ điều kiện phân tích chính.", "",
             "IDCG=0: NDCG=0 theo B-08, giữ trong mẫu số paired, báo số lượng riêng. Nếu đồng hạng nằm trọn trong Top-3, DCG lấy kỳ vọng trên hoán vị trong nhóm; không phá hòa theo ID. TIED_BOUNDARY/ABSTAIN/ERROR không có Top-3 thay thế.", "",
             "## Thống kê", "", "```json", json.dumps(s, ensure_ascii=False, indent=2), "```", "",
             "## Từng hồ sơ", "", "| Dòng | Hợp lệ | Thiếu nhãn | P0 | P2 | Điều kiện | NDCG P0 | NDCG P2 | Δ P2−P0 |", "|---|---|---|---|---|---|---|---|---|"]
    def number(value):
        return "N/A" if value is None else f"{value:.8f}"
    for row in result["rows"]:
        metrics = row["paired_metrics"]
        values = [row["row_number"], row["valid"], row["missing_label_count"], row["P0"]["status"], row["P2"]["status"], row["evaluation_status"],
                  number(metrics["P0"]["ndcg_at_3"] if metrics else None), number(metrics["P2"]["ndcg_at_3"] if metrics else None), number(metrics["p2_minus_p0_ndcg_at_3"] if metrics else None)]
        lines.append("| " + " | ".join(str(v) for v in values) + " |")
    lines += ["", "## Diễn giải và giới hạn", "",
              "Không suy từ chênh lệch số học trên demo thành P2 tốt hơn P0. Các trung bình chỉ dùng chung các hồ sơ paired đủ 21 nhãn; coverage báo riêng trên toàn bộ đầu vào và trên hồ sơ hợp lệ. Không bỏ hồ sơ thiếu/abstain/tied/error khỏi tổng đếm. Các lý do loại trừ có thể chồng lấp, không cộng chúng như một flow loại trừ rời nhau.", "",
              "Dữ liệu giả không cung cấp p-value, khoảng tin cậy dân số hoặc bằng chứng chất lượng Top-3. Khi có nghiên cứu thật được duyệt: khóa nhãn trước gợi ý, kế hoạch loại trừ và phân tích theo cặp trước khi xem điểm; CI/kiểm định cần xét cụm trường/lớp/người và vector lặp, không mặc định độc lập hay MAR. Schema B-12 chưa chứa mã cụm; phải thiết kế quản trị dữ liệu riêng trước suy luận thống kê chính thức.", ""]
    return "\n".join(lines)


def main():
    import argparse
    parser = argparse.ArgumentParser(description=DEMO_STATUS)
    parser.add_argument("--input", type=Path, default=HERE / "synthetic_fixture.json")
    args = parser.parse_args()
    try:
        document = load_document(args.input)
        result = evaluate(document)
    except Exception:
        print(json.dumps({"data_kind": DEMO_STATUS, "status": "INPUT_OR_DEPENDENCY_REJECTED"}, ensure_ascii=False))
        return 2
    (HERE / "synthetic_demo_results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    (HERE / "synthetic_demo_report.md").write_text(markdown_report(result), encoding="utf-8")
    print(json.dumps({"data_kind": DEMO_STATUS, "summary": result["summary"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
