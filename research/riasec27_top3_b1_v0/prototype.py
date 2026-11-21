"""
LabanAI - Phase 8.5a: Independent Pearson 1-1 Prototype
Module: prototype.py

Architecture:
27 RIASEC raw answers (1-5) -> 6 domain means (R, I, A, S, E, C) -> Pearson correlation r(u, v) -> Top-3 Majors.
Restricted strictly to READY_FOR_PROTOTYPE majors (21 majors).
CONDITIONAL (10) and UNRESOLVED (2) majors are excluded from scoring.
Handles flat profiles (ABSTAIN_FLAT_PROFILE) and boundary ties (TIED_BOUNDARY) without arbitrary slicing.
"""

import json
import math
import os
from typing import Any, Dict, List, Optional, Tuple, Union

DEFAULT_REF_PATH = os.path.join(os.path.dirname(__file__), "reference.json")

# Input order is the interleaved CODEBOOK_33 order, never grouped blocks.
QUESTION_ORDER = (
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3",
    "A3", "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4",
    "E3", "I4", "A5", "E4", "C1", "E5", "C2", "C3", "C4",
)
DOMAIN_INDICES = {
    "R": [0, 3, 8, 12, 15],
    "I": [1, 4, 16, 19],
    "A": [2, 5, 9, 17, 20],
    "S": [6, 7, 10, 13],
    "E": [11, 14, 18, 21, 23],
    "C": [22, 24, 25, 26],
}
DOMAIN_ORDER = ["R", "I", "A", "S", "E", "C"]
# Numerical comparison guard only: 32 binary64 ULPs at unit correlation.
# This is NOT a threshold for career significance, confidence, or abstention.
NUMERICAL_SCORE_TOLERANCE = 32 * math.ulp(1.0)


def load_reference_catalog(path: Optional[str] = None) -> Dict[str, Any]:
    """Load JSON; ranking validates its structure, not the truth of its sources."""
    ref_path = path or DEFAULT_REF_PATH
    if not os.path.exists(ref_path):
        raise FileNotFoundError(f"Reference file not found at: {ref_path}")
    with open(ref_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


def validate_answers(answers: Any) -> List[int]:
    """
    Validates that the input answers is a list of exactly 27 integers,
    each between 1 and 5 inclusive.
    Raises TypeError or ValueError on invalid input.
    """
    if not isinstance(answers, (list, tuple)):
        raise TypeError(f"Answers must be a list or tuple, got {type(answers).__name__}.")

    if len(answers) != 27:
        raise ValueError(f"Expected exactly 27 answers, got {len(answers)}.")

    validated = []
    for idx, val in enumerate(answers):
        # In Python, bool is a subclass of int (isinstance(True, int) == True)
        if isinstance(val, bool) or not isinstance(val, int):
            raise TypeError(f"Item at index {idx} must be an integer, got {type(val).__name__} ({val!r}).")
        if val < 1 or val > 5:
            raise ValueError(f"Item at index {idx} with value {val} is out of bounds [1, 5].")
        validated.append(int(val))

    return validated


def compute_riasec_means(answers: List[int]) -> Dict[str, float]:
    """
    Computes the 6 domain means from the 27 validated raw answers.
    Returns a dict with keys ['R', 'I', 'A', 'S', 'E', 'C'].
    """
    means = {}
    for domain, indices in DOMAIN_INDICES.items():
        subset = [answers[i] for i in indices]
        means[domain] = sum(subset) / len(subset)
    return means


def compute_vector_variance(vector: List[float]) -> Tuple[float, float]:
    """
    Computes mean and population variance of a numerical vector.
    Returns (mean, variance).
    """
    n = len(vector)
    if n == 0:
        return 0.0, 0.0
    mean_val = math.fsum(vector) / n
    var_val = math.fsum((x - mean_val) ** 2 for x in vector) / n
    return mean_val, var_val


def compute_pearson(u: List[float], v: List[float]) -> Optional[float]:
    """
    Computes Pearson correlation r(u, v) between two equal-length vectors.
    Returns None at the existing numerical variance guard (< 1e-12).
    """
    if len(u) != len(v) or len(u) == 0:
        raise ValueError("Vectors must have the same non-zero length.")

    n = len(u)
    mean_u, var_u = compute_vector_variance(u)
    mean_v, var_v = compute_vector_variance(v)

    if var_u < 1e-12 or var_v < 1e-12:
        return None

    std_u = math.sqrt(var_u)
    std_v = math.sqrt(var_v)

    cov = math.fsum((u[i] - mean_u) * (v[i] - mean_v) for i in range(n)) / n
    r = cov / (std_u * std_v)

    # Clamp to [-1.0, 1.0] to guard against floating-point overshoot
    return max(-1.0, min(1.0, r))


def rank_majors(
    answers: Any,
    reference_data: Optional[Dict[str, Any]] = None,
    reference_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main ranking function for LabanAI Pearson 1-1 Prototype.

    Input:
        answers: list of 27 integers in [1, 5]
        reference_data: optional parsed catalog dict
        reference_path: optional path to reference.json

    Returns:
        Structured dictionary following the LabanAI Pearson 1-1 contract:
        - status: "SUCCESS" | "ABSTAIN_FLAT_PROFILE" | "TIED_BOUNDARY" | "INVALID_INPUT" | "INVALID_REFERENCE" | "INSUFFICIENT_CANDIDATES"
        - user_vector: dict of 6 means
        - user_vector_variance: float
        - top3_distinct: bool
        - top3: list of top candidates
        - tied_majors: list of candidates tied at the boundary
        - all_rankings: complete sorted list of READY candidates
        - metadata: execution details
    """
    # 1. Validate inputs
    try:
        clean_answers = validate_answers(answers)
    except (TypeError, ValueError) as err:
        return {
            "status": "INVALID_INPUT",
            "message": str(err),
            "user_vector": None,
            "user_vector_variance": None,
            "top3_distinct": False,
            "top3": [],
            "tied_majors": [],
            "all_rankings": [],
            "metadata": {"error_type": type(err).__name__},
        }

    # 2. Compute 6 RIASEC means
    means = compute_riasec_means(clean_answers)
    u_vector = [means[d] for d in DOMAIN_ORDER]
    u_mean, u_var = compute_vector_variance(u_vector)

    # 3. Check for flat profile (variance = 0)
    if u_var < 1e-12:
        return {
            "status": "ABSTAIN_FLAT_PROFILE",
            "message": "Hồ sơ RIASEC phẳng (phương sai xấp xỉ 0), không thể tính tương quan Pearson một cách có ý nghĩa.",
            "user_vector": means,
            "user_vector_variance": round(u_var, 6),
            "top3_distinct": False,
            "top3": [],
            "tied_majors": [],
            "all_rankings": [],
            "metadata": {
                "algorithm": "Pearson 1-1",
                "u_mean": round(u_mean, 4),
            },
        }

    # 4. Load reference catalog and filter for READY_FOR_PROTOTYPE
    try:
        if reference_data is None:
            reference_data = load_reference_catalog(reference_path)
        if not isinstance(reference_data, dict) or not isinstance(reference_data.get("majors"), list):
            raise ValueError("Reference must contain a majors list.")
        ref_metadata = reference_data.get("metadata", {})
        if not isinstance(ref_metadata, dict):
            raise ValueError("Reference metadata must be an object.")
        if ref_metadata.get("vector_dimensions", DOMAIN_ORDER) != DOMAIN_ORDER:
            raise ValueError("Reference OI dimensions must be R/I/A/S/E/C.")
        if ref_metadata.get("onet_version", "30.2") != "30.2":
            raise ValueError("This prototype requires O*NET 30.2.")
        all_majors = reference_data["majors"]
        if any(not isinstance(major, dict) for major in all_majors):
            raise ValueError("Each reference major must be an object.")
        ready_records = [m for m in all_majors if m.get("status") == "READY_FOR_PROTOTYPE"]
        ready_majors = [m for m in ready_records if m.get("oi_vector") is not None]
        seen_ids = set()
        for major in ready_majors:
            major_id = major.get("major_id")
            if not isinstance(major_id, str) or not major_id.strip() or major_id in seen_ids:
                raise ValueError("Scored major IDs must be nonempty and unique.")
            seen_ids.add(major_id)
            for field in ("major_name_vi", "moet_code", "soc_code"):
                if not isinstance(major.get(field), str) or not major[field].strip():
                    raise ValueError(f"Missing reference field {field} for {major_id}.")
            vector = major["oi_vector"]
            if (not isinstance(vector, (list, tuple)) or len(vector) != 6
                    or any(isinstance(value, bool) or not isinstance(value, (int, float))
                           or not math.isfinite(value) or not 1 <= value <= 7 for value in vector)):
                raise ValueError(f"Invalid six-dimensional OI vector for {major_id}.")
    except (OSError, ValueError, TypeError) as err:
        return {
            "status": "INVALID_REFERENCE", "message": str(err),
            "user_vector": means, "user_vector_variance": u_var,
            "top3_distinct": False, "top3": [], "tied_majors": [], "all_rankings": [],
            "metadata": {"error_type": type(err).__name__},
        }

    curriculum_unverified = [m["major_id"] for m in ready_majors
                            if not isinstance(m.get("curriculum_evidence"), dict)
                            or m["curriculum_evidence"].get("verification_status") != "PROGRAM_VERIFIED"]
    audit_metadata = {
        "algorithm": "Pearson 1-1", "input_order": list(QUESTION_ORDER),
        "ready_majors_count": len(ready_records),
        "missing_oi_count": len(ready_records) - len(ready_majors),
        "curriculum_unverified_ids": curriculum_unverified,
        "source_notice": "Research scoring status does not certify curriculum evidence or career suitability.",
        "numerical_score_tolerance": NUMERICAL_SCORE_TOLERANCE,
        "tie_policy": "Full-precision scores; numerical groups anchored at their highest score; no ID tie-break.",
    }

    if len(ready_majors) < 3:
        return {
            "status": "INSUFFICIENT_CANDIDATES",
            "message": f"Số lượng ngành READY_FOR_PROTOTYPE ({len(ready_majors)}) ít hơn 3, không thể xếp hạng Top-3.",
            "user_vector": means,
            "user_vector_variance": round(u_var, 6),
            "top3_distinct": False,
            "top3": [],
            "tied_majors": [],
            "all_rankings": [],
            "metadata": {**audit_metadata, "ready_count": len(ready_majors)},
        }

    # 5. Compute Pearson correlation for each READY major
    scored_candidates = []
    for major in ready_majors:
        v_vector = major["oi_vector"]
        r = compute_pearson(u_vector, v_vector)
        if r is not None:
            scored_candidates.append({
                "major_id": major["major_id"],
                "major_name_vi": major["major_name_vi"],
                "moet_code": major["moet_code"],
                "soc_code": major["soc_code"],
                "occupation_title_en": major.get("occupation_title_en"),
                "ih_code": major.get("ih_code"),
                "pearson_r": r,
                "onet_oi_vector": v_vector,
                "curriculum_evidence": major.get("curriculum_evidence"),
            })

    if len(scored_candidates) < 3:
        return {
            "status": "INSUFFICIENT_CANDIDATES",
            "message": "Không đủ ứng viên có tương quan hợp lệ để xếp hạng Top-3.",
            "user_vector": means,
            "user_vector_variance": round(u_var, 6),
            "top3_distinct": False,
            "top3": [],
            "tied_majors": [],
            "all_rankings": [],
            "metadata": {**audit_metadata, "scored_count": len(scored_candidates)},
        }

    # 6. Sort descending by Pearson r
    # Full precision only. Within a score group, display order is not preference.
    scored_candidates.sort(key=lambda item: item["pearson_r"], reverse=True)

    # Anchor groups at the highest score, avoiding transitive adjacent-gap chains.
    score_groups = []
    for candidate in scored_candidates:
        if (not score_groups or score_groups[-1][0]["pearson_r"] - candidate["pearson_r"]
                > NUMERICAL_SCORE_TOLERANCE):
            score_groups.append([])
        score_groups[-1].append(candidate)
    offset = 0
    for group in score_groups:
        for candidate in group:
            candidate["rank"] = offset + 1
        offset += len(group)

    # 7. Check for boundary ties at rank 3
    # Look at candidate at index 2 (the 3rd candidate) and index 3 (the 4th candidate)
    r3 = scored_candidates[2]["pearson_r"]
    r4 = scored_candidates[3]["pearson_r"] if len(scored_candidates) > 3 else None
    boundary_group = next(group for group in score_groups if scored_candidates[2] in group)
    is_boundary_tied = boundary_group[0]["rank"] + len(boundary_group) - 1 > 3

    if is_boundary_tied:
        # All candidates tied with r3 at the cutoff
        tied_group = boundary_group
        exact_tie = len({candidate["pearson_r"] for candidate in tied_group}) == 1
        # Top 3 cannot be separated cleanly; do not perform arbitrary slicing
        return {
            "status": "TIED_BOUNDARY",
            "message": "Ranh giới Top-3 đồng điểm hoặc chưa phân biệt được ở độ chính xác số học; không cắt nhóm tùy tiện.",
            "user_vector": means,
            "user_vector_variance": round(u_var, 6),
            "top3_distinct": False,
            "top3": [],
            "tied_majors": tied_group,
            "all_rankings": scored_candidates,
            "metadata": {
                **audit_metadata,
                "boundary_score": r3,
                "boundary_tied_count": len(tied_group),
                "boundary_relation": "EXACT_SCORE_TIE" if exact_tie else "NUMERICALLY_UNRESOLVED",
                "margin_rank3_rank4": r3 - r4,
            },
        }

    # 8. Clean Top-3 success
    top3 = scored_candidates[:3]
    return {
        "status": "SUCCESS",
        "message": "Top-3 có ranh giới khác nhau về số học; chưa xác nhận khác biệt có ý nghĩa hướng nghiệp.",
        "user_vector": means,
        "user_vector_variance": round(u_var, 6),
        "top3_distinct": True,
        "top3": top3,
        "tied_majors": [],
        "all_rankings": scored_candidates,
        "metadata": {
            **audit_metadata,
            "top1_r": round(top3[0]["pearson_r"], 6),
            "top2_r": round(top3[1]["pearson_r"], 6),
            "top3_r": round(top3[2]["pearson_r"], 6),
            "rank4_r": r4,
            "margin_rank3_rank4": r3 - r4 if r4 is not None else None,
        },
    }
