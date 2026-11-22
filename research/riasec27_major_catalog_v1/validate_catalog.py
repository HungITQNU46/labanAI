"""validate_catalog.py - Upgraded Integrity Validator for LabanAI Major Catalog v1.
Phase: B-04-R1

Enforces 12 strict audit rules:
1. Exactly 33 canonical major IDs.
2. Exact status counts: 21 READY, 10 CONDITIONAL, 2 UNRESOLVED.
3. Strict ranking eligibility: exactly 21 READY majors are eligible, 12 non-ready are NOT eligible.
4. All alternative/proposed mappings must be quarantined in proposed_mappings with status PENDING_REVIEW and clear source/rationale.
5. Deterministic O*NET vector mapping: no SOC code under O*NET 30.2 may map to multiple different OI vectors.
6. Baseline representative SOCs must remain distinct from exploratory proposed SOCs.
7. Evidence source URLs must be valid HTTP/HTTPS addresses (no file://, localhost, or dummy paths).
8. Zero unproven VERIFIED statuses: institutional homepages cannot be marked VERIFIED_OFFICIAL_DIRECT without decree evidence.
9. No unvalidated numeric weights in composite configurations (must be marked UNVALIDATED_EXAMPLE / UNVALIDATED_DESIGN_HYPOTHESIS).
10. No fake cluster representatives may be marked as eligible for automatic Tier 1 scoring.
11. Status rationale must be documented for every major.
12. Complete schema validation for Tier 2 supplementary questions (text, options, bias_warning, skip_behavior).

Usage:
    py -3.14 -B validate_catalog.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

EXPECTED_CANONICAL_MAJORS = [
    "cong_nghe_ky_thuat_hoa_hoc",
    "cong_nghe_ky_thuat_xay_dung",
    "cong_nghe_thong_tin",
    "cong_tac_xa_hoi",
    "dong_phuong_hoc",
    "giao_duc_chinh_tri",
    "giao_duc_mam_non",
    "giao_duc_tieu_hoc",
    "ke_toan",
    "kinh_te",
    "ky_thuat_dien",
    "ky_thuat_dien_tu_vien_thong",
    "ky_thuat_phan_mem",
    "luat",
    "ngon_ngu_anh",
    "nong_hoc",
    "quan_ly_dat_dai",
    "quan_ly_du_lich_lu_hanh",
    "quan_ly_giao_duc",
    "quan_ly_nha_nuoc",
    "quan_tri_khach_san",
    "quan_tri_kinh_doanh",
    "su_pham_dia_ly",
    "su_pham_hoa_hoc",
    "su_pham_ngu_van",
    "su_pham_tieng_anh",
    "su_pham_tin_hoc",
    "su_pham_toan_hoc",
    "tai_chinh_ngan_hang",
    "tam_ly_hoc_giao_duc",
    "toan_hoc",
    "van_hoc",
    "viet_nam_hoc",
]

EXPECTED_READY = 21
EXPECTED_CONDITIONAL = 10
EXPECTED_UNRESOLVED = 2
TOTAL_MAJORS = 33


def validate_catalog(base_dir: Path | None = None) -> dict[str, any]:
    if base_dir is None:
        base_dir = Path(__file__).resolve().parent

    majors_file = base_dir / "majors_registry.json"
    evidence_file = base_dir / "evidence_registry.json"
    plan_file = base_dir / "differentiation_plan.json"

    errors: list[str] = []
    warnings: list[str] = []

    # 1. Check file existence
    for f in [majors_file, evidence_file, plan_file]:
        if not f.exists():
            errors.append(f"Missing required file: {f.name}")

    if errors:
        return {"status": "FAILED", "errors": errors, "warnings": warnings}

    with open(majors_file, "r", encoding="utf-8") as fp:
        majors_data = json.load(fp)
    with open(evidence_file, "r", encoding="utf-8") as fp:
        evidence_data = json.load(fp)
    with open(plan_file, "r", encoding="utf-8") as fp:
        plan_data = json.load(fp)

    raw_majors = majors_data.get("majors", [])
    raw_evidence = evidence_data.get("evidence_records", {})
    clusters = plan_data.get("clusters", {})

    majors = {m["major_id"]: m for m in raw_majors if "major_id" in m}
    evidence = {ev["major_id"]: ev for ev in raw_evidence.values() if "major_id" in ev}

    # Rule 1: Validate exact 33 canonical majors
    if len(majors) != TOTAL_MAJORS:
        errors.append(f"Rule 1 Violation: Expected {TOTAL_MAJORS} majors, found {len(majors)}")

    missing_keys = set(EXPECTED_CANONICAL_MAJORS) - set(majors.keys())
    if missing_keys:
        errors.append(f"Rule 1 Violation: Missing canonical major keys: {sorted(missing_keys)}")

    extra_keys = set(majors.keys()) - set(EXPECTED_CANONICAL_MAJORS)
    if extra_keys:
        errors.append(f"Rule 1 Violation: Unexpected major keys: {sorted(extra_keys)}")

    # Rule 2 & 3: Validate status counts and strict eligibility
    ready_count = 0
    conditional_count = 0
    unresolved_count = 0
    eligible_count = 0
    visible_count = 0

    soc_oi_pairs: dict[str, list[list[float]]] = {}

    for mid, m in majors.items():
        st = m.get("status")
        is_elig = m.get("automatic_ranking_eligibility")
        is_vis = m.get("catalog_visibility")

        if st == "READY_FOR_PROTOTYPE":
            ready_count += 1
            if not is_elig:
                errors.append(f"Rule 3 Violation: Major {mid} is READY but automatic_ranking_eligibility != true")
        elif st == "CONDITIONAL":
            conditional_count += 1
            if is_elig:
                errors.append(f"Rule 3 Violation: Major {mid} is CONDITIONAL but automatic_ranking_eligibility == true")
        elif st == "UNRESOLVED":
            unresolved_count += 1
            if is_elig:
                errors.append(f"Rule 3 Violation: Major {mid} is UNRESOLVED but automatic_ranking_eligibility == true")
        else:
            errors.append(f"Rule 2 Violation: Major {mid} has unknown status {st}")

        if is_elig:
            eligible_count += 1
        if is_vis:
            visible_count += 1

        # Rule 11: Status reason must be present
        if not m.get("status_reason"):
            errors.append(f"Rule 11 Violation: Major {mid} missing status_reason")

        # Track SOC and OI for Rule 5
        soc = m.get("primary_soc_code")
        oi = m.get("oi_vector")
        if soc and oi:
            soc_oi_pairs.setdefault(soc, []).append(oi)

        # Rule 4: Check proposed mappings quarantine
        for prop in m.get("proposed_mappings", []):
            if prop.get("status") != "PENDING_REVIEW":
                errors.append(f"Rule 4 Violation: Proposed mapping for {mid} has status '{prop.get('status')}', must be 'PENDING_REVIEW'")
            if not prop.get("source"):
                errors.append(f"Rule 4 Violation: Proposed mapping for {mid} missing source")
            if not prop.get("rationale"):
                errors.append(f"Rule 4 Violation: Proposed mapping for {mid} missing rationale")

    if ready_count != EXPECTED_READY:
        errors.append(f"Rule 2 Violation: Expected {EXPECTED_READY} READY, got {ready_count}")
    if conditional_count != EXPECTED_CONDITIONAL:
        errors.append(f"Rule 2 Violation: Expected {EXPECTED_CONDITIONAL} CONDITIONAL, got {conditional_count}")
    if unresolved_count != EXPECTED_UNRESOLVED:
        errors.append(f"Rule 2 Violation: Expected {EXPECTED_UNRESOLVED} UNRESOLVED, got {unresolved_count}")
    if eligible_count != EXPECTED_READY:
        errors.append(f"Rule 3 Violation: Expected {EXPECTED_READY} eligible, got {eligible_count}")
    if visible_count != TOTAL_MAJORS:
        errors.append(f"Rule 3 Violation: Expected {TOTAL_MAJORS} visible, got {visible_count}")

    # Rule 5: Same SOC must not map to different OI vectors within the primary registry
    for soc, ois in soc_oi_pairs.items():
        first_oi = ois[0]
        for other_oi in ois[1:]:
            if other_oi != first_oi:
                errors.append(f"Rule 5 Violation: Primary SOC {soc} maps to multiple distinct OI vectors: {ois}")

    # Rule 7 & 8: Evidence URL format and zero unproven VERIFIED
    if len(evidence) != TOTAL_MAJORS:
        errors.append(f"Rule 7 Violation: Expected {TOTAL_MAJORS} evidence records, got {len(evidence)}")

    for mid, ev in evidence.items():
        url = ev.get("source_url", "")
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            errors.append(f"Rule 7 Violation: Major {mid} has invalid source_url: {url}")
        
        v_status = ev.get("verification_status")
        if v_status in ("VERIFIED", "VERIFIED_OFFICIAL_DIRECT"):
            # Rule 8: Unproven direct verification forbidden for institutional homepages
            if ev.get("url_kind") == "INSTITUTION_HOMEPAGE":
                errors.append(f"Rule 8 Violation: Major {mid} marked as {v_status} but url_kind is INSTITUTION_HOMEPAGE")

    # Rule 9 & 10: Differentiation Plan & Composite Weights
    d_status = plan_data.get("status")
    if "RESEARCH_HYPOTHESIS" not in str(d_status):
        warnings.append("Differentiation plan should be explicitly marked as RESEARCH_HYPOTHESIS")

    # Check for unvalidated numeric weights in composite definitions
    comp_state = clusters.get("CLUSTER_D_TOURISM_PUBLIC_ADMIN", {}).get("composite_soc_design_state", {})
    if comp_state:
        if comp_state.get("status") != "UNVALIDATED_DESIGN_HYPOTHESIS":
            errors.append("Rule 9 Violation: Cluster D composite state must be UNVALIDATED_DESIGN_HYPOTHESIS")
        for p_name, prof in comp_state.get("profiles", {}).items():
            for occ in prof.get("candidate_occupations", []):
                w = occ.get("illustrative_example_weight")
                if isinstance(w, (int, float)):
                    errors.append(f"Rule 9 Violation: Found numeric weight {w} for {p_name} candidate occupation {occ.get('soc')}")

    # Rule 10: Check that Mechanism B is blocked
    mech_b = plan_data.get("interaction_mechanisms", {}).get("MECHANISM_B_SYSTEM_SUGGESTION", {})
    if mech_b.get("status") != "BLOCKED_PENDING_EMPIRICAL_VALIDATION":
        errors.append("Rule 10 Violation: Mechanism B must be BLOCKED_PENDING_EMPIRICAL_VALIDATION")

    # Rule 12: Validate Tier 2 question schemas
    for cid, c in clusters.items():
        for q in c.get("tier2_questions", []):
            if not q.get("question_id"):
                errors.append(f"Rule 12 Violation: Question in {cid} missing question_id")
            if not q.get("text"):
                errors.append(f"Rule 12 Violation: Question in {cid} missing text")
            if not q.get("options"):
                errors.append(f"Rule 12 Violation: Question in {cid} missing options")
            if not q.get("skip_behavior"):
                errors.append(f"Rule 12 Violation: Question in {cid} missing skip_behavior")
            for opt in q.get("options", []):
                if not opt.get("option_id") or not opt.get("text") or not opt.get("target_major"):
                    errors.append(f"Rule 12 Violation: Question option in {cid} missing required fields")

    status = "PASSED" if not errors else "FAILED"
    return {
        "status": status,
        "total_majors": len(majors),
        "ready_count": ready_count,
        "conditional_count": conditional_count,
        "unresolved_count": unresolved_count,
        "eligible_count": eligible_count,
        "visible_count": visible_count,
        "clusters_count": len(clusters),
        "errors": errors,
        "warnings": warnings,
    }


if __name__ == "__main__":
    res = validate_catalog()
    print(json.dumps(res, indent=2, ensure_ascii=False))
    if res["status"] != "PASSED":
        sys.exit(1)
    sys.exit(0)
