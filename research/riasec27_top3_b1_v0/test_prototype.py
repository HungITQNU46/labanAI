"""
LabanAI - Phase 8.5a: Unit Tests for Pearson 1-1 Prototype
File: test_prototype.py

Preserves 15 original test purposes and adds 22 independent regressions for
the interleaved codebook, Pearson arithmetic, tie policy and reference errors.
"""

import math
import os
import sys
import unittest
from decimal import Decimal, localcontext
from unittest.mock import patch

# Ensure current directory is in sys.path for direct imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from prototype import (
    DOMAIN_INDICES,
    DOMAIN_ORDER,
    compute_pearson,
    compute_riasec_means,
    compute_vector_variance,
    load_reference_catalog,
    rank_majors,
    validate_answers,
)


# Independent fixture contract: copied from CODEBOOK_33, never DOMAIN_INDICES.
CODEBOOK_ORDER = (
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3",
    "A3", "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4",
    "E3", "I4", "A5", "E4", "C1", "E5", "C2", "C3", "C4",
)


def answers_from_named_groups(groups):
    """Encode synthetic answers by item name, independently of production mapping."""
    named = {f"{domain}{i}": value
             for domain, values in groups.items()
             for i, value in enumerate(values, 1)}
    return [named[code] for code in CODEBOOK_ORDER]


def decimal_pearson_oracle(u, v):
    """Independent raw-moment formula, using 60-digit decimal arithmetic."""
    with localcontext() as context:
        context.prec = 60
        a = [Decimal(str(value)) for value in u]
        b = [Decimal(str(value)) for value in v]
        n = Decimal(len(a))
        numerator = n * sum(x * y for x, y in zip(a, b)) - sum(a) * sum(b)
        denominator = ((n * sum(x * x for x in a) - sum(a) ** 2)
                       * (n * sum(y * y for y in b) - sum(b) ** 2)).sqrt()
        return float(numerator / denominator)


REPORT_GROUPS = {
    "R": [5, 5, 4, 5, 4], "I": [5, 5, 4, 5],
    "A": [2, 1, 2, 1, 2], "S": [1, 2, 1, 2],
    "E": [2, 2, 3, 2, 2], "C": [4, 4, 5, 4],
}
REPORT_MEANS = {"R": 4.6, "I": 4.75, "A": 1.6, "S": 1.5, "E": 2.2, "C": 4.25}
REPORT_ANSWERS = [5, 5, 2, 5, 5, 1, 1, 2, 4, 2, 1, 2, 5, 2, 2, 4, 4, 1, 3, 5, 2, 2, 4, 2, 4, 5, 4]
SOCIAL_ANSWERS = [1, 2, 5, 2, 3, 4, 5, 5, 1, 5, 5, 3, 2, 5, 2, 1, 2, 4, 3, 3, 5, 2, 2, 3, 3, 2, 3]
SOCIAL_MEANS = {"R": 1.4, "I": 2.5, "A": 4.6, "S": 5.0, "E": 2.6, "C": 2.5}


class TestLabanAIPearsonPrototype(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ref_catalog = load_reference_catalog()

    # 1. Valid 27 inputs
    def test_01_valid_27_inputs(self):
        answers = answers_from_named_groups({"R": [4]*5, "I": [2]*4, "A": [1]*5,
                                            "S": [1]*4, "E": [2]*5, "C": [3]*4})
        self.assertEqual(len(answers), 27)
        res = rank_majors(answers, reference_data=self.ref_catalog)
        self.assertIn(res["status"], ["SUCCESS", "TIED_BOUNDARY"])
        self.assertIsNotNone(res["user_vector"])
        self.assertEqual(len(res["user_vector"]), 6)
        if res["status"] == "SUCCESS":
            self.assertTrue(res["top3_distinct"])
            self.assertEqual(len(res["top3"]), 3)
            self.assertEqual(res["top3"][0]["rank"], 1)

    # 2. Missing 1 question (26 items -> error)
    def test_02_missing_1_question(self):
        answers = [3] * 26
        with self.assertRaises(ValueError):
            validate_answers(answers)
        res = rank_majors(answers, reference_data=self.ref_catalog)
        self.assertEqual(res["status"], "INVALID_INPUT")
        self.assertFalse(res["top3_distinct"])
        self.assertEqual(res["top3"], [])

    # 3. Extra 1 question (28 items -> error)
    def test_03_extra_1_question(self):
        answers = [3] * 28
        with self.assertRaises(ValueError):
            validate_answers(answers)
        res = rank_majors(answers, reference_data=self.ref_catalog)
        self.assertEqual(res["status"], "INVALID_INPUT")
        self.assertFalse(res["top3_distinct"])
        self.assertEqual(res["top3"], [])

    # 4. Value out of bounds (< 1 or > 5)
    def test_04_value_out_of_bounds(self):
        # Test lower bound (0)
        answers_low = [0] + [3] * 26
        with self.assertRaises(ValueError):
            validate_answers(answers_low)
        res_low = rank_majors(answers_low, reference_data=self.ref_catalog)
        self.assertEqual(res_low["status"], "INVALID_INPUT")

        # Test upper bound (6)
        answers_high = [3] * 26 + [6]
        with self.assertRaises(ValueError):
            validate_answers(answers_high)
        res_high = rank_majors(answers_high, reference_data=self.ref_catalog)
        self.assertEqual(res_high["status"], "INVALID_INPUT")

    # 5. Non-integer value (float, str, bool)
    def test_05_non_integer_value(self):
        # Float
        answers_float = [3.5] + [3] * 26
        with self.assertRaises(TypeError):
            validate_answers(answers_float)
        res_float = rank_majors(answers_float, reference_data=self.ref_catalog)
        self.assertEqual(res_float["status"], "INVALID_INPUT")

        # String
        answers_str = ["3"] + [3] * 26
        with self.assertRaises(TypeError):
            validate_answers(answers_str)
        res_str = rank_majors(answers_str, reference_data=self.ref_catalog)
        self.assertEqual(res_str["status"], "INVALID_INPUT")

        # Bool (True is an int subclass in Python, must be rejected)
        answers_bool = [True] + [3] * 26
        with self.assertRaises(TypeError):
            validate_answers(answers_bool)
        res_bool = rank_majors(answers_bool, reference_data=self.ref_catalog)
        self.assertEqual(res_bool["status"], "INVALID_INPUT")

    # 6. Correct calculation of 6 means
    def test_06_correct_calculation_of_6_means(self):
        # R: 5 items [1, 2, 3, 4, 5] -> mean = 3.0
        # I: 4 items [2, 2, 4, 4] -> mean = 3.0
        # A: 5 items [5, 5, 5, 5, 5] -> mean = 5.0
        # S: 4 items [1, 1, 1, 1] -> mean = 1.0
        # E: 5 items [2, 3, 4, 1, 5] -> mean = 3.0
        # C: 4 items [3, 4, 5, 4] -> mean = 4.0
        answers = answers_from_named_groups({
            "R": [1, 2, 3, 4, 5], "I": [2, 2, 4, 4], "A": [5]*5,
            "S": [1]*4, "E": [2, 3, 4, 1, 5], "C": [3, 4, 5, 4]})
        means = compute_riasec_means(answers)
        self.assertAlmostEqual(means["R"], 3.0)
        self.assertAlmostEqual(means["I"], 3.0)
        self.assertAlmostEqual(means["A"], 5.0)
        self.assertAlmostEqual(means["S"], 1.0)
        self.assertAlmostEqual(means["E"], 3.0)
        self.assertAlmostEqual(means["C"], 4.0)

    # 7. Flat profile returns ABSTAIN_FLAT_PROFILE
    def test_07_flat_profile_returns_abstain(self):
        # All 3s -> variance = 0
        answers = [3] * 27
        res = rank_majors(answers, reference_data=self.ref_catalog)
        self.assertEqual(res["status"], "ABSTAIN_FLAT_PROFILE")
        self.assertFalse(res["top3_distinct"])
        self.assertEqual(res["top3"], [])
        self.assertEqual(res["tied_majors"], [])
        self.assertAlmostEqual(res["user_vector_variance"], 0.0)

        # All 1s -> variance = 0
        answers1 = [1] * 27
        res1 = rank_majors(answers1, reference_data=self.ref_catalog)
        self.assertEqual(res1["status"], "ABSTAIN_FLAT_PROFILE")

        # All 5s -> variance = 0
        answers5 = [5] * 27
        res5 = rank_majors(answers5, reference_data=self.ref_catalog)
        self.assertEqual(res5["status"], "ABSTAIN_FLAT_PROFILE")

    # 8. Correct Pearson calculation on known reference vectors
    def test_08_correct_pearson_calculation(self):
        # Perfectly correlated vectors
        u = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
        v_pos = [2.0, 4.0, 6.0, 8.0, 10.0, 12.0]
        r_pos = compute_pearson(u, v_pos)
        self.assertIsNotNone(r_pos)
        self.assertAlmostEqual(r_pos, 1.0, places=6)

        # Perfectly negatively correlated vectors
        v_neg = [6.0, 5.0, 4.0, 3.0, 2.0, 1.0]
        r_neg = compute_pearson(u, v_neg)
        self.assertIsNotNone(r_neg)
        self.assertAlmostEqual(r_neg, -1.0, places=6)

        # Orthogonal centered vectors
        # mean of u is 3.5. Centered: [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5]
        # let centered v be [1, -1, 0, 0, -1, 1] -> dot product = -2.5 + 1.5 + 0 + 0 - 1.5 + 2.5 = 0
        v_orth = [1.0, -1.0, 0.0, 0.0, -1.0, 1.0]
        r_orth = compute_pearson(u, v_orth)
        self.assertIsNotNone(r_orth)
        self.assertAlmostEqual(r_orth, 0.0, places=6)

    # 9. Undefined Pearson handled without arbitrary fallback
    def test_09_undefined_pearson_handled(self):
        u_flat = [3.0, 3.0, 3.0, 3.0, 3.0, 3.0]
        v_norm = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
        # compute_pearson returns None when variance is 0
        self.assertIsNone(compute_pearson(u_flat, v_norm))
        self.assertIsNone(compute_pearson(v_norm, u_flat))

        # Check with zero vector
        u_zero = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        self.assertIsNone(compute_pearson(u_zero, v_norm))

    # 10. Identical OI vectors produce identical scores
    def test_10_identical_oi_vectors_produce_identical_scores(self):
        u_vec = [5.0, 4.0, 2.0, 1.0, 2.0, 4.0]
        v1 = [6.24, 5.81, 2.03, 1.59, 1.62, 4.68]
        v2 = [6.24, 5.81, 2.03, 1.59, 1.62, 4.68]  # Identical
        r1 = compute_pearson(u_vec, v1)
        r2 = compute_pearson(u_vec, v2)
        self.assertAlmostEqual(r1, r2, places=8)

    # 11. Rank 3-4 tie returns TIED_BOUNDARY without forced slicing
    def test_11_rank_3_4_tie_returns_tied_boundary(self):
        # Create a mock catalog where candidate 3 and 4 have identical vectors
        # For answers u = [5, 4, 1, 1, 1, 1]:
        # major_1: [5, 4, 1, 1, 1, 1] -> r = 1.000 (Rank 1)
        # major_2: [5, 3, 1, 1, 1, 1] -> r = 0.977 (Rank 2)
        # major_3: [6, 2, 1, 1, 1, 1] -> r = 0.872 (Rank 3)
        # major_4: [6, 2, 1, 1, 1, 1] -> r = 0.872 (Rank 3 - tied with major_3 at boundary)
        mock_catalog = {
            "majors": [
                {
                    "major_id": "major_1",
                    "major_name_vi": "Ngành 1",
                    "moet_code": "0000001",
                    "status": "READY_FOR_PROTOTYPE",
                    "soc_code": "11-0001.00",
                    "oi_vector": [5.0, 4.0, 1.0, 1.0, 1.0, 1.0],
                },
                {
                    "major_id": "major_2",
                    "major_name_vi": "Ngành 2",
                    "moet_code": "0000002",
                    "status": "READY_FOR_PROTOTYPE",
                    "soc_code": "11-0002.00",
                    "oi_vector": [5.0, 3.0, 1.0, 1.0, 1.0, 1.0],
                },
                {
                    "major_id": "major_3",
                    "major_name_vi": "Ngành 3",
                    "moet_code": "0000003",
                    "status": "READY_FOR_PROTOTYPE",
                    "soc_code": "11-0003.00",
                    "oi_vector": [6.0, 2.0, 1.0, 1.0, 1.0, 1.0],
                },
                {
                    "major_id": "major_4",
                    "major_name_vi": "Ngành 4",
                    "moet_code": "0000004",
                    "status": "READY_FOR_PROTOTYPE",
                    "soc_code": "11-0004.00",
                    "oi_vector": [6.0, 2.0, 1.0, 1.0, 1.0, 1.0],  # Exactly identical to major_3
                },
            ]
        }
        # Answers that favor R and I
        answers = answers_from_named_groups({"R": [5]*5, "I": [4]*4, "A": [1]*5,
                                            "S": [1]*4, "E": [1]*5, "C": [1]*4})
        res = rank_majors(answers, reference_data=mock_catalog)
        self.assertEqual(res["status"], "TIED_BOUNDARY")
        self.assertFalse(res["top3_distinct"])
        self.assertEqual(res["top3"], [])
        self.assertEqual(len(res["tied_majors"]), 2)
        tied_ids = {m["major_id"] for m in res["tied_majors"]}
        self.assertEqual(tied_ids, {"major_3", "major_4"})

    # 12. Fewer than 3 valid candidates returns INSUFFICIENT_CANDIDATES
    def test_12_fewer_than_3_valid_candidates(self):
        mock_catalog = {
            "majors": [
                {
                    "major_id": "major_1",
                    "major_name_vi": "Ngành 1",
                    "moet_code": "0000001",
                    "status": "READY_FOR_PROTOTYPE",
                    "soc_code": "11-0001.00",
                    "oi_vector": [6.0, 2.0, 1.0, 1.0, 1.0, 1.0],
                },
                {
                    "major_id": "major_2",
                    "major_name_vi": "Ngành 2",
                    "moet_code": "0000002",
                    "status": "READY_FOR_PROTOTYPE",
                    "soc_code": "11-0002.00",
                    "oi_vector": [5.0, 3.0, 1.0, 1.0, 1.0, 1.0],
                },
            ]
        }
        answers = answers_from_named_groups({"R": [5]*5, "I": [4]*4, "A": [1]*5,
                                            "S": [1]*4, "E": [1]*5, "C": [1]*4})
        res = rank_majors(answers, reference_data=mock_catalog)
        self.assertEqual(res["status"], "INSUFFICIENT_CANDIDATES")
        self.assertFalse(res["top3_distinct"])
        self.assertEqual(res["top3"], [])

    # 13. All 33 majors present in reference catalog
    def test_13_all_33_majors_present(self):
        majors = self.ref_catalog.get("majors", [])
        self.assertEqual(len(majors), 33)
        status_counts = {}
        for m in majors:
            st = m.get("status")
            status_counts[st] = status_counts.get(st, 0) + 1
        self.assertEqual(status_counts.get("READY_FOR_PROTOTYPE"), 21)
        self.assertEqual(status_counts.get("CONDITIONAL"), 10)
        self.assertEqual(status_counts.get("UNRESOLVED"), 2)

    # 14. CONDITIONAL and UNRESOLVED majors are excluded from scoring
    def test_14_conditional_and_unresolved_excluded(self):
        answers = answers_from_named_groups({"R": [5]*5, "I": [4]*4, "A": [1]*5,
                                            "S": [1]*4, "E": [1]*5, "C": [1]*4})
        res = rank_majors(answers, reference_data=self.ref_catalog)
        all_scored_ids = {m["major_id"] for m in res["all_rankings"]}
        self.assertEqual(len(all_scored_ids), 21)

        # Check conditional majors like su_pham_toan_hoc or cong_nghe_thong_tin are NOT present
        self.assertNotIn("su_pham_toan_hoc", all_scored_ids)
        self.assertNotIn("cong_nghe_thong_tin", all_scored_ids)
        self.assertNotIn("viet_nam_hoc", all_scored_ids)
        self.assertNotIn("quan_ly_du_lich_lu_hanh", all_scored_ids)
        self.assertNotIn("quan_ly_nha_nuoc", all_scored_ids)

    # 15. Every recommendation traces back to O*NET SOC and OI source
    def test_15_every_recommendation_traces_back(self):
        # Answers with high S and moderate E
        answers = answers_from_named_groups({"R": [1]*5, "I": [2]*4, "A": [2]*5,
                                            "S": [5]*4, "E": [4]*5, "C": [2]*4})
        res = rank_majors(answers, reference_data=self.ref_catalog)
        self.assertIn(res["status"], ["SUCCESS", "TIED_BOUNDARY"])

        evaluated_list = res["top3"] if res["status"] == "SUCCESS" else res["all_rankings"][:3]
        for item in evaluated_list:
            self.assertIsNotNone(item["soc_code"])
            self.assertTrue(len(item["soc_code"]) >= 8)  # Format XX-XXXX.XX
            self.assertIsNotNone(item["moet_code"])
            self.assertEqual(len(item["moet_code"]), 7)  # 7 digits
            self.assertIsNotNone(item["onet_oi_vector"])
            self.assertEqual(len(item["onet_oi_vector"]), 6)
            for val in item["onet_oi_vector"]:
                self.assertGreaterEqual(val, 1.0)
                self.assertLessEqual(val, 7.0)
            self.assertIsNotNone(item.get("curriculum_evidence"))
            self.assertIn("url", item["curriculum_evidence"])


class TestCodebookRegression(unittest.TestCase):
    def assert_highlight(self, domain):
        named = {code: 5 if code.startswith(domain) else 1 for code in CODEBOOK_ORDER}
        expected = {"R": 1.0, "I": 1.0, "A": 1.0, "S": 1.0, "E": 1.0, "C": 1.0}
        expected[domain] = 5.0
        answers = [named[code] for code in CODEBOOK_ORDER]
        self.assertEqual(compute_riasec_means(answers), expected)

    def test_16_realistic_counterexample(self):
        self.assert_highlight("R")

    def test_17_investigative_highlight(self):
        self.assert_highlight("I")

    def test_18_artistic_highlight(self):
        self.assert_highlight("A")

    def test_19_social_highlight(self):
        self.assert_highlight("S")

    def test_20_enterprising_highlight(self):
        self.assert_highlight("E")

    def test_21_conventional_highlight(self):
        self.assert_highlight("C")

    def test_22_six_distinct_means(self):
        self.assertEqual(answers_from_named_groups(REPORT_GROUPS), REPORT_ANSWERS)
        self.assertEqual(compute_riasec_means(REPORT_ANSWERS), REPORT_MEANS)

    def test_23_nonuniform_answers_equal_means(self):
        groups = {"R": [1, 2, 3, 4, 5], "I": [1, 2, 4, 5],
                  "A": [5, 4, 3, 2, 1], "S": [5, 4, 2, 1],
                  "E": [1, 5, 2, 4, 3], "C": [2, 4, 1, 5]}
        answers = answers_from_named_groups(groups)
        self.assertGreater(len(set(answers)), 1)
        self.assertEqual(compute_riasec_means(answers), dict.fromkeys("RIASEC", 3.0))
        result = rank_majors(answers)
        self.assertEqual(result["status"], "ABSTAIN_FLAT_PROFILE")
        self.assertEqual(result["top3"], [])

    def test_24_interleaved_pearson_independent(self):
        result = rank_majors(answers_from_named_groups(REPORT_GROUPS))
        self.assertEqual(result["user_vector"], REPORT_MEANS)
        expected_u = [4.6, 4.75, 1.6, 1.5, 2.2, 4.25]
        for candidate in result["all_rankings"]:
            with self.subTest(major=candidate["major_id"]):
                expected = decimal_pearson_oracle(expected_u, candidate["onet_oi_vector"])
                self.assertAlmostEqual(candidate["pearson_r"], expected, places=14)

    def test_25_reported_four_scores(self):
        u = [4.6, 4.75, 1.6, 1.5, 2.2, 4.25]
        examples = [
            ([6.27, 5.75, 1.80, 1.02, 1.85, 4.54], 0.9776956418149526),
            ([6.02, 5.45, 2.12, 1.72, 2.44, 4.43], 0.9763822199030435),
            ([6.24, 5.81, 2.03, 1.59, 1.62, 4.68], 0.9693201257242228),
            ([6.43, 5.15, 2.21, 1.69, 2.66, 4.61], 0.9579876421368516),
        ]
        for vector, expected in examples:
            with self.subTest(vector=vector):
                oracle = decimal_pearson_oracle(u, vector)
                self.assertAlmostEqual(oracle, expected, places=12)
                self.assertAlmostEqual(compute_pearson(u, vector), oracle, places=14)

    def test_26_second_report_example(self):
        result = rank_majors(SOCIAL_ANSWERS)
        self.assertEqual(result["user_vector"], SOCIAL_MEANS)
        for candidate in result["all_rankings"]:
            expected = decimal_pearson_oracle([1.4, 2.5, 4.6, 5.0, 2.6, 2.5], candidate["onet_oi_vector"])
            self.assertAlmostEqual(candidate["pearson_r"], expected, places=14)

    def test_27_both_examples_full_order_independent(self):
        reference = load_reference_catalog()
        for answers, u in [(REPORT_ANSWERS, [4.6, 4.75, 1.6, 1.5, 2.2, 4.25]),
                           (SOCIAL_ANSWERS, [1.4, 2.5, 4.6, 5.0, 2.6, 2.5])]:
            expected = sorted([(decimal_pearson_oracle(u, m["oi_vector"]), m["major_id"])
                               for m in reference["majors"] if m["status"] == "READY_FOR_PROTOTYPE"],
                              key=lambda item: item[0], reverse=True)
            result = rank_majors(answers)
            self.assertEqual([m["major_id"] for m in result["all_rankings"]], [m[1] for m in expected])
            self.assertEqual(len(result["all_rankings"]), 21)

    def test_28_close_boundary_not_merged_at_one_e_minus_six(self):
        reference = self.policy_catalog()
        # Controlled scores isolate ranking policy, not Pearson's numeric oracle.
        with patch("prototype.compute_pearson", side_effect=[.9, .8, .7, .6999995]):
            result = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(result["status"], "SUCCESS")
        self.assertGreater(result["metadata"]["margin_rank3_rank4"], 0)
        self.assertEqual([m["rank"] for m in result["all_rankings"]], [1, 2, 3, 4])

    def test_29_sort_uses_full_precision_not_id(self):
        reference = self.policy_catalog()
        reference["majors"][2]["major_id"] = "z_higher"
        reference["majors"][3]["major_id"] = "a_lower"
        with patch("prototype.compute_pearson", side_effect=[.9, .8, .700000004, .700000003]):
            result = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["top3"][2]["major_id"], "z_higher")

    def test_30_numerical_boundary_is_explicit(self):
        reference = self.policy_catalog()
        with patch("prototype.compute_pearson", side_effect=[.9, .8, .7, math.nextafter(.7, 0)]):
            result = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(result["status"], "TIED_BOUNDARY")
        self.assertEqual(result["metadata"]["boundary_relation"], "NUMERICALLY_UNRESOLVED")
        self.assertEqual(result["top3"], [])

    def test_31_no_adjacent_gap_chaining(self):
        from prototype import NUMERICAL_SCORE_TOLERANCE
        reference = self.policy_catalog()
        t = NUMERICAL_SCORE_TOLERANCE
        with patch("prototype.compute_pearson", side_effect=[.9, .8, .8-.75*t, .8-1.5*t]):
            result = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual([m["rank"] for m in result["all_rankings"]], [1, 2, 2, 4])

    def test_32_identical_vectors_boundary_is_order_independent(self):
        reference = self.policy_catalog()
        reference["majors"][3]["oi_vector"] = reference["majors"][2]["oi_vector"].copy()
        a = rank_majors(REPORT_ANSWERS, reference_data=reference)
        reference["majors"].reverse()
        b = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(a["status"], "TIED_BOUNDARY")
        self.assertEqual(b["status"], "TIED_BOUNDARY")
        self.assertEqual(a["metadata"]["boundary_relation"], "EXACT_SCORE_TIE")
        self.assertEqual({m["major_id"] for m in a["tied_majors"]},
                         {m["major_id"] for m in b["tied_majors"]})

    def test_33_missing_reference_file(self):
        missing = os.path.join(os.path.dirname(__file__), "not_present_reference.json")
        self.assertFalse(os.path.exists(missing))
        result = rank_majors(REPORT_ANSWERS, reference_path=missing)
        self.assertEqual(result["status"], "INVALID_REFERENCE")
        self.assertEqual(result["top3"], [])

    def test_34_missing_oi_does_not_get_invented(self):
        reference = self.policy_catalog()
        for major in reference["majors"]:
            major["oi_vector"] = None
        result = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(result["status"], "INSUFFICIENT_CANDIDATES")
        self.assertEqual(result["metadata"]["missing_oi_count"], 4)
        self.assertEqual(result["top3"], [])

    def test_35_malformed_reference_is_explicit(self):
        reference = self.policy_catalog()
        for vector in [[1, 2], [1, 2, 3, 4, 5, float("nan")], [True, 2, 3, 4, 5, 6]]:
            reference["majors"][0]["oi_vector"] = vector
            result = rank_majors(REPORT_ANSWERS, reference_data=reference)
            self.assertEqual(result["status"], "INVALID_REFERENCE")
        self.assertEqual(rank_majors(REPORT_ANSWERS, reference_data={})["status"], "INVALID_REFERENCE")

    def test_36_reference_metadata_and_curriculum_caveat(self):
        reference = load_reference_catalog()
        result = rank_majors(REPORT_ANSWERS, reference_data=reference)
        self.assertEqual(len(result["metadata"]["curriculum_unverified_ids"]), 21)
        self.assertEqual(reference["metadata"]["verification_audit"]["onet_ready_matched"], 21)
        self.assertEqual(reference["metadata"]["verification_audit"]["curriculum_program_verified"], 0)
        for major in reference["majors"]:
            if major["status"] == "READY_FOR_PROTOTYPE":
                self.assertEqual(major["curriculum_evidence"]["verification_status"], "HOMEPAGE_ONLY")
                self.assertEqual(major["onet_evidence"]["verification_status"], "MATCHED_ONET_30_2")

    def test_37_reference_dimensions_and_duplicate_ids(self):
        reference = self.policy_catalog()
        reference["metadata"] = {"vector_dimensions": ["I", "R", "A", "S", "E", "C"]}
        self.assertEqual(rank_majors(REPORT_ANSWERS, reference_data=reference)["status"], "INVALID_REFERENCE")
        reference.pop("metadata")
        reference["majors"][1]["major_id"] = reference["majors"][0]["major_id"]
        self.assertEqual(rank_majors(REPORT_ANSWERS, reference_data=reference)["status"], "INVALID_REFERENCE")

    @staticmethod
    def policy_catalog():
        vectors = [[5, 4, 1, 1, 1, 1], [5, 3, 1, 1, 1, 1],
                   [6, 2, 1, 1, 1, 1], [6, 2.1, 1, 1, 1, 1]]
        return {"majors": [{"major_id": f"policy_{i}", "major_name_vi": f"Synthetic {i}",
                            "moet_code": f"000000{i}", "soc_code": f"00-000{i}.00",
                            "status": "READY_FOR_PROTOTYPE", "oi_vector": vector}
                           for i, vector in enumerate(vectors, 1)]}


if __name__ == "__main__":
    unittest.main()
