"""Descriptive agreement/stability metrics; never relevance or accuracy labels."""

from collections import Counter
import math
import statistics


def top3_ids(result):
    return [item["major_id"] for item in result.get("top3", [])]


def unique_top1(result):
    if result.get("status") != "SUCCESS":
        return None
    first = [item["major_id"] for item in result.get("all_rankings", []) if item["rank"] == 1]
    return first[0] if len(first) == 1 else None


def jaccard(left, right):
    a, b = set(left), set(right)
    return len(a & b) / len(a | b) if a or b else None


def compare(left, right, same_scope=True):
    if not same_scope:
        return {"evaluable": False, "reason": "CANDIDATE_SCOPE_MISMATCH"}
    if left.get("status") != "SUCCESS" or right.get("status") != "SUCCESS":
        return {"evaluable": False, "reason": "NON_SUCCESS", "jaccard_at_3": None}
    a, b = top3_ids(left), top3_ids(right)
    if len(a) != 3 or len(b) != 3 or len(set(a)) != 3 or len(set(b)) != 3:
        return {"evaluable": False, "reason": "INVALID_TOP3", "jaccard_at_3": None}
    first_a, first_b = unique_top1(left), unique_top1(right)
    ordered = all(len({m["rank"] for m in r["top3"]}) == 3 for r in [left, right])
    shared = set(a) & set(b)
    scores_a = {m["major_id"]: m["pearson_r"] for m in left["top3"]}
    scores_b = {m["major_id"]: m["pearson_r"] for m in right["top3"]}
    return {
        "evaluable": True, "overlap_count": len(shared), "jaccard_at_3": jaccard(a, b),
        "same_top3_set": set(a) == set(b), "top1_evaluable": first_a is not None and first_b is not None,
        "same_unique_top1": first_a == first_b if first_a is not None and first_b is not None else None,
        "order_evaluable": ordered, "same_top3_order": a == b if ordered else None,
        "common_top3_score_changes": {key: scores_b[key]-scores_a[key] for key in sorted(shared)},
    }


def describe(values):
    values = sorted(values)
    if not values:
        return {"n": 0, "min": None, "median": None, "mean": None, "p95": None, "max": None}
    at = .95 * (len(values)-1)
    lo, hi = math.floor(at), math.ceil(at)
    return {"n": len(values), "min": values[0], "median": statistics.median(values),
            "mean": statistics.fmean(values), "p95": values[lo]+(values[hi]-values[lo])*(at-lo),
            "max": values[-1]}


def summarize_comparisons(rows, total):
    valid = [r for r in rows if r.get("evaluable")]
    def rate(field):
        available = [r[field] for r in valid if r.get(field) is not None]
        count = sum(available)
        return {"count": count, "denominator": len(available),
                "rate": count/len(available) if available else None,
                "rate_all_pairs": count/total if total else None}
    return {"total_pairs": total, "evaluable_pairs": len(valid), "not_evaluable": total-len(valid),
            "not_evaluable_reasons": dict(Counter(r.get("reason") for r in rows if not r.get("evaluable"))),
            "same_top3_set": rate("same_top3_set"), "same_unique_top1": rate("same_unique_top1"),
            "same_top3_order": rate("same_top3_order"),
            "overlap_counts": {str(k): sum(r["overlap_count"] == k for r in valid) for k in range(4)},
            "jaccard_at_3": describe([r["jaccard_at_3"] for r in valid])}


def summarize_distribution(results, candidate_ids):
    n = len(results)
    statuses = Counter(r["status"] for r in results)
    successful = [r for r in results if r["status"] == "SUCCESS"]
    counts = Counter(key for r in successful for key in top3_ids(r))
    values = [counts[key] for key in candidate_ids]
    slots = sum(values)
    probabilities = [v/slots for v in values if v] if slots else []
    entropy = -sum(p*math.log(p) for p in probabilities) if slots else None
    gini = sum(abs(a-b) for a in values for b in values)/(2*len(values)*slots) if slots else None
    return {
        "n": n, "statuses": dict(statuses), "status_rates": {k: v/n for k, v in statuses.items()} if n else {},
        "success_count": len(successful), "top3_slots": slots,
        "candidate_coverage_count": sum(v > 0 for v in values), "candidate_count": len(values),
        "candidate_coverage_rate": sum(v > 0 for v in values)/len(values) if values else None,
        "frequency": [{"major_id": key, "top3_count": counts[key],
                       "share_of_slots": counts[key]/slots if slots else None,
                       "share_of_success_profiles": counts[key]/len(successful) if successful else None}
                      for key in candidate_ids],
        "unique_top3_sets": len({tuple(sorted(top3_ids(r))) for r in successful}),
        "gini": gini, "entropy_nats": entropy,
        "normalized_entropy": entropy/math.log(len(values)) if slots and len(values) > 1 else None,
        "effective_candidate_count": math.exp(entropy) if entropy is not None else None,
    }
