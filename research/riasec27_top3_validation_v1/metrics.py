"""Ranking quality against observed self-reported interest, not career truth."""
import math

RELEVANT_MINIMUM = 2


def score_top3(top3, labels, candidate_ids):
    """Average DCG within native tied ranks, without inventing a preference order."""
    if set(labels) != set(candidate_ids) or len(candidate_ids) != 21:
        raise ValueError("EXACT_21_LABEL_KEYS_REQUIRED")
    if any(type(value) is not int or not 0 <= value <= 3 for value in labels.values()):
        raise ValueError("ALL_21_OBSERVED_LABELS_REQUIRED")
    ids = [item["major_id"] for item in top3]
    if len(ids) != 3 or len(set(ids)) != 3 or not set(ids) <= set(candidate_ids):
        raise ValueError("THREE_DISTINCT_READY_MAJORS_REQUIRED")
    ranks = [item["rank"] for item in top3]
    if any(type(rank) is not int for rank in ranks) or ranks != sorted(ranks):
        raise ValueError("INVALID_NATIVE_RANKS")
    gains = [2**labels[key]-1 for key in ids]
    dcg = 0.0
    start = 0
    while start < 3:
        rank = ranks[start]
        if rank != start+1:
            raise ValueError("INVALID_COMPETITION_RANKS")
        end = start+1
        while end < 3 and ranks[end] == rank:
            end += 1
        average_gain = math.fsum(gains[start:end])/(end-start)
        dcg += average_gain*math.fsum(1/math.log2(position+2) for position in range(start, end))
        start = end
    ideal = sorted(labels.values(), reverse=True)[:3]
    idcg = math.fsum((2**value-1)/math.log2(position+2) for position, value in enumerate(ideal))
    relevant = sum(labels[key] >= RELEVANT_MINIMUM for key in ids)
    return {"ndcg_at_3": dcg/idcg if idcg > 0 else 0.0,
            "precision_at_3": relevant/3, "hit_at_3": int(relevant > 0),
            "dcg_at_3": dcg, "idcg_at_3": idcg, "idcg_zero": idcg == 0}
