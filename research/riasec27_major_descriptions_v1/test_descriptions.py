"""
test_descriptions.py — Unit Tests for Major Descriptions v1 (B-09)

Includes positive verification and comprehensive negative test cases covering
each validation rule (tampered URLs, unauthorized statuses, marketing hype, subjective fit,
degree levels, and consistency).
"""

import copy
import json
import os
import sys
import tempfile
import unittest

# Ensure current directory is on sys.path for direct module import
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from validate_descriptions import (
    DESCRIPTIONS_PATH,
    SOURCES_PATH,
    REGISTRY_PATH,
    validate_descriptions,
)


class TestMajorDescriptions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(DESCRIPTIONS_PATH, "r", encoding="utf-8") as f:
            cls.desc_data = json.load(f)
        with open(SOURCES_PATH, "r", encoding="utf-8") as f:
            cls.src_data = json.load(f)

    def test_baseline_validation_passes(self):
        """Rule 1-13: Production files must pass validation with 0 errors."""
        errors, warnings = validate_descriptions()
        self.assertEqual(errors, [], f"Expected 0 errors, got: {errors}")

    def test_negative_unauthorized_status(self):
        """Rule 6: Reject status 'APPROVED_FOR_STUDY_MATERIALS'."""
        tampered = copy.deepcopy(self.desc_data)
        tampered["majors"][0]["draft_status"] = "APPROVED_FOR_STUDY_MATERIALS"

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(descriptions_path=tf_path)
            self.assertTrue(any("APPROVED_FOR_STUDY_MATERIALS" in e for e in errors))
        finally:
            os.remove(tf_path)

    def test_negative_banned_marketing_word(self):
        """Rule 9: Reject descriptions with commercial / marketing hype."""
        tampered = copy.deepcopy(self.desc_data)
        tampered["majors"][0]["hoc_nhung_gi"] += " Đây là ngành nghề hot nhất với thu nhập khủng."

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(descriptions_path=tf_path)
            self.assertTrue(any("Rule 9 Violation" in e for e in errors))
        finally:
            os.remove(tf_path)

    def test_negative_subjective_fit_assertion(self):
        """Rule 10: Reject descriptions with subjective fit assertions."""
        tampered = copy.deepcopy(self.desc_data)
        tampered["majors"][1]["hoc_nhung_gi"] += " Ngành này rất phù hợp với bạn nếu yêu trẻ."

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(descriptions_path=tf_path)
            self.assertTrue(any("Rule 10 Violation" in e for e in errors))
        finally:
            os.remove(tf_path)

    def test_negative_invalid_url_domain(self):
        """Rule 4: Reject non-.edu.vn / non-.gov.vn URLs."""
        tampered = copy.deepcopy(self.desc_data)
        tampered["majors"][0]["nguon_va_gioi_han"]["url_tham_chieu"] = "https://facebook.com/hnue"

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(descriptions_path=tf_path)
            self.assertTrue(any("Rule 4 Violation" in e for e in errors))
        finally:
            os.remove(tf_path)

    def test_negative_missing_major(self):
        """Rule 1: Reject description set with missing majors."""
        tampered = copy.deepcopy(self.desc_data)
        tampered["majors"].pop()  # Remove 21st major

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(descriptions_path=tf_path)
            self.assertTrue(any("Rule 1 Violation" in e for e in errors))
        finally:
            os.remove(tf_path)

    def test_negative_inconsistent_moet_code(self):
        """Rule 12: Inconsistency between sources and descriptions must fail."""
        tampered = copy.deepcopy(self.desc_data)
        tampered["majors"][0]["moet_code"] = "7999999"

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(descriptions_path=tf_path)
            self.assertTrue(any("Inconsistency" in e or "Rule 2 Violation" in e for e in errors))
        finally:
            os.remove(tf_path)

    def test_negative_invalid_degree_level_in_source(self):
        """Rule 7: Reject graduate degree levels."""
        tampered_src = copy.deepcopy(self.src_data)
        tampered_src["sources"][0]["degree_level"] = "POSTGRADUATE_MASTER"

        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False, suffix=".json") as tf:
            json.dump(tampered_src, tf, ensure_ascii=False)
            tf_path = tf.name

        try:
            errors, _ = validate_descriptions(sources_path=tf_path)
            self.assertTrue(any("Rule 7 Violation" in e for e in errors))
        finally:
            os.remove(tf_path)


if __name__ == "__main__":
    unittest.main()
