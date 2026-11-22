"""
validate_descriptions.py — Automated Validator for Major Descriptions v1 (B-09)

Validates research/riasec27_major_descriptions_v1/major_descriptions.json and
sources_registry.json against 13 strict quality, evidence, neutrality, and consistency rules.
"""

import json
import os
import re
import sys
import urllib.parse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

DESCRIPTIONS_PATH = os.path.join(SCRIPT_DIR, "major_descriptions.json")
SOURCES_PATH = os.path.join(SCRIPT_DIR, "sources_registry.json")
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "research", "riasec27_major_catalog_v1", "majors_registry.json")

# Rule 9: Banned hype / marketing terms (case-insensitive)
BANNED_MARKETING_TERMS = [
    "hot",
    "thu nhập khủng",
    "lương nghìn đô",
    "hàng đầu",
    "100% việc làm",
    "ngành của tương lai",
    "dễ xin việc",
    "đẳng cấp",
    "thời thượng",
    "triệu phú",
    "cơ hội đổi đời",
    "thu nhập cao ngất",
    "việc nhẹ lương cao"
]

# Rule 10: Subjective fit assertions (case-insensitive)
BANNED_FIT_ASSERTIONS = [
    "phù hợp với bạn",
    "bạn nên học",
    "dành cho bạn",
    "nếu bạn là người",
    "bạn rất hợp",
    "chắc chắn bạn sẽ thích",
    "lựa chọn hoàn hảo cho bạn"
]

ALLOWED_VERIFICATION_STATUSES = {
    "VERIFIED_OFFICIAL_DIRECT",
    "VERIFIED_OFFICIAL_SUMMARY"
}

ALLOWED_DEGREE_LEVELS = {
    "UNDERGRADUATE_BACHELOR",
    "UNDERGRADUATE_ENGINEER",
    "UNDERGRADUATE_ENGINEER_OR_BACHELOR"
}


def count_words(text: str) -> int:
    return len(text.strip().split())


def validate_descriptions(
    descriptions_path=DESCRIPTIONS_PATH,
    sources_path=SOURCES_PATH,
    registry_path=REGISTRY_PATH
):
    errors = []
    warnings = []

    # Rule 13: Valid JSON format and UTF-8 encoding
    try:
        with open(descriptions_path, "r", encoding="utf-8") as f:
            desc_data = json.load(f)
    except Exception as e:
        return [f"Rule 13 Violation: Cannot load descriptions JSON: {e}"], warnings

    try:
        with open(sources_path, "r", encoding="utf-8") as f:
            src_data = json.load(f)
    except Exception as e:
        return [f"Rule 13 Violation: Cannot load sources JSON: {e}"], warnings

    try:
        with open(registry_path, "r", encoding="utf-8") as f:
            reg_data = json.load(f)
    except Exception as e:
        return [f"Rule 13 Violation: Cannot load majors_registry JSON: {e}"], warnings

    # Extract 21 READY majors from catalog
    expected_ready_majors = {
        m["major_id"]: m["moet_code"]
        for m in reg_data.get("majors", [])
        if m.get("status") == "READY_FOR_PROTOTYPE"
    }

    if len(expected_ready_majors) != 21:
        errors.append(f"Expected 21 READY_FOR_PROTOTYPE majors in catalog, got {len(expected_ready_majors)}")

    desc_majors = desc_data.get("majors", [])
    src_sources = src_data.get("sources", [])

    # Rule 1: Exactly 21 majors, no duplicates, no missing
    desc_major_ids = [m.get("major_id") for m in desc_majors]
    src_major_ids = [s.get("major_id") for s in src_sources]

    if len(desc_major_ids) != 21:
        errors.append(f"Rule 1 Violation: descriptions must have exactly 21 majors, got {len(desc_major_ids)}")

    if len(set(desc_major_ids)) != len(desc_major_ids):
        duplicates = [x for x in desc_major_ids if desc_major_ids.count(x) > 1]
        errors.append(f"Rule 1 Violation: Duplicate major_ids in descriptions: {set(duplicates)}")

    if set(desc_major_ids) != set(expected_ready_majors.keys()):
        missing = set(expected_ready_majors.keys()) - set(desc_major_ids)
        extra = set(desc_major_ids) - set(expected_ready_majors.keys())
        if missing:
            errors.append(f"Rule 1 Violation: Missing majors in descriptions: {missing}")
        if extra:
            errors.append(f"Rule 1 Violation: Extra majors in descriptions: {extra}")

    # Map sources by major_id
    src_map = {s.get("major_id"): s for s in src_sources}

    for idx, major in enumerate(desc_majors):
        mid = major.get("major_id", f"index_{idx}")

        # Rule 2: Mandatory fields
        required_fields = [
            "major_id", "major_name_vi", "moet_code",
            "hoc_nhung_gi", "hoat_dong_hoc_tap", "huong_tim_hieu_tiep",
            "nguon_va_gioi_han", "draft_status"
        ]
        for rf in required_fields:
            if rf not in major or major[rf] is None or (isinstance(major[rf], str) and not major[rf].strip()):
                errors.append(f"Rule 2 Violation ({mid}): Missing or empty required field '{rf}'")

        # MOET code matches catalog
        expected_code = expected_ready_majors.get(mid)
        if expected_code and major.get("moet_code") != expected_code:
            errors.append(f"Rule 2 Violation ({mid}): moet_code '{major.get('moet_code')}' != expected '{expected_code}'")

        # Rule 3: Required fields in nguon_va_gioi_han
        nguon = major.get("nguon_va_gioi_han", {})
        if not isinstance(nguon, dict):
            errors.append(f"Rule 3 Violation ({mid}): nguon_va_gioi_han must be an object")
            continue

        nguon_fields = ["co_so_dao_tao", "nam_ctdt", "url_tham_chieu", "muc_do_xac_minh", "gioi_han_ap_dung"]
        for nf in nguon_fields:
            if nf not in nguon or not str(nguon[nf]).strip():
                errors.append(f"Rule 3 Violation ({mid}): Missing or empty '{nf}' in nguon_va_gioi_han")

        # Rule 4: url_tham_chieu must be valid and directly point to .edu.vn or .gov.vn
        url = nguon.get("url_tham_chieu", "")
        parsed_url = urllib.parse.urlparse(url)
        if not (parsed_url.scheme in ("http", "https") and parsed_url.netloc):
            errors.append(f"Rule 4 Violation ({mid}): Invalid URL '{url}'")
        else:
            netloc = parsed_url.netloc.lower()
            if not (netloc.endswith(".edu.vn") or netloc.endswith(".gov.vn")):
                errors.append(f"Rule 4 Violation ({mid}): URL netloc '{netloc}' must end with .edu.vn or .gov.vn")

        # Rule 5: muc_do_xac_minh in allowed set
        status = nguon.get("muc_do_xac_minh")
        if status not in ALLOWED_VERIFICATION_STATUSES:
            errors.append(f"Rule 5 Violation ({mid}): Invalid muc_do_xac_minh '{status}'")

        # Rule 6: draft_status must be 'DRAFT_EVIDENCE_BACKED', never 'APPROVED_FOR_STUDY_MATERIALS'
        draft_status = major.get("draft_status")
        if draft_status != "DRAFT_EVIDENCE_BACKED":
            errors.append(f"Rule 6 Violation ({mid}): draft_status must be 'DRAFT_EVIDENCE_BACKED', got '{draft_status}'")
        if draft_status == "APPROVED_FOR_STUDY_MATERIALS":
            errors.append(f"Rule 6 CRITICAL Violation ({mid}): Unauthorized status 'APPROVED_FOR_STUDY_MATERIALS'")

        # Rule 7: degree_level check in sources_registry
        src_item = src_map.get(mid)
        if src_item:
            deg_level = src_item.get("degree_level")
            if deg_level not in ALLOWED_DEGREE_LEVELS:
                errors.append(f"Rule 7 Violation ({mid}): Invalid degree_level in source: '{deg_level}'")
        else:
            errors.append(f"Rule 12 Violation ({mid}): Major not found in sources_registry")

        # Rule 8: Length constraints
        hng = major.get("hoc_nhung_gi", "")
        hng_words = count_words(hng)
        if not (30 <= hng_words <= 120):
            errors.append(f"Rule 8 Violation ({mid}): hoc_nhung_gi has {hng_words} words (expected 30-120)")

        hdht = major.get("hoat_dong_hoc_tap", [])
        if not isinstance(hdht, list) or not (2 <= len(hdht) <= 5):
            errors.append(f"Rule 8 Violation ({mid}): hoat_dong_hoc_tap must have 2-5 items (got {len(hdht) if isinstance(hdht, list) else 'not a list'})")
        else:
            for item_idx, item in enumerate(hdht):
                item_words = count_words(str(item))
                if not (5 <= item_words <= 35):
                    errors.append(f"Rule 8 Violation ({mid}): hoat_dong_hoc_tap item {item_idx} has {item_words} words (expected 5-35)")

        htnt = major.get("huong_tim_hieu_tiep", [])
        if not isinstance(htnt, list) or not (1 <= len(htnt) <= 4):
            errors.append(f"Rule 8 Violation ({mid}): huong_tim_hieu_tiep must have 1-4 items (got {len(htnt) if isinstance(htnt, list) else 'not a list'})")
        else:
            for item_idx, item in enumerate(htnt):
                item_words = count_words(str(item))
                if not (5 <= item_words <= 35):
                    errors.append(f"Rule 8 Violation ({mid}): huong_tim_hieu_tiep item {item_idx} has {item_words} words (expected 5-35)")

        # Full text for banned content check
        all_text = " ".join([
            hng,
            " ".join(hdht) if isinstance(hdht, list) else "",
            " ".join(htnt) if isinstance(htnt, list) else ""
        ]).lower()

        # Rule 9: Check banned marketing terms
        for term in BANNED_MARKETING_TERMS:
            # Word boundary matching for short words like 'hot'
            pattern = rf"\b{re.escape(term)}\b" if len(term) <= 4 else re.escape(term)
            if re.search(pattern, all_text):
                errors.append(f"Rule 9 Violation ({mid}): Prohibited marketing term '{term}' detected")

        # Rule 10: Check subjective fit assertions
        for assertion in BANNED_FIT_ASSERTIONS:
            if assertion in all_text:
                errors.append(f"Rule 10 Violation ({mid}): Prohibited fit assertion '{assertion}' detected")

        # Rule 11: Scope limitations must clarify local institutional representation
        gioi_han = nguon.get("gioi_han_ap_dung", "")
        if len(gioi_han.strip()) < 15:
            errors.append(f"Rule 11 Violation ({mid}): gioi_han_ap_dung is too brief or empty")

        # Rule 12: 1:1 consistency with sources_registry.json
        if src_item:
            if major.get("moet_code") != src_item.get("moet_code"):
                errors.append(f"Rule 12 Inconsistency ({mid}): moet_code mismatch ({major.get('moet_code')} vs {src_item.get('moet_code')})")
            if nguon.get("url_tham_chieu") != src_item.get("source_url"):
                errors.append(f"Rule 12 Inconsistency ({mid}): url mismatch ({nguon.get('url_tham_chieu')} vs {src_item.get('source_url')})")
            if nguon.get("muc_do_xac_minh") != src_item.get("verification_status"):
                errors.append(f"Rule 12 Inconsistency ({mid}): verification_status mismatch ({nguon.get('muc_do_xac_minh')} vs {src_item.get('verification_status')})")

    return errors, warnings


def main():
    print("=== RUNNING VALIDATE_DESCRIPTIONS (B-09) ===")
    errors, warnings = validate_descriptions()

    if warnings:
        print(f"Warnings ({len(warnings)}):")
        for w in warnings:
            print(f"  [WARN] {w}")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for e in errors:
            print(f"  [FAIL] {e}")
        sys.exit(1)
    else:
        print("ALL 13 RULES PASSED: 21 descriptions verified successfully.")
        sys.exit(0)


if __name__ == "__main__":
    main()
