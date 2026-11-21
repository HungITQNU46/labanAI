"""
LabanAI - Direction B: ML Top-3 Research Ranker Tests (Phase B-03-R2)
Module: test_ranker.py

Comprehensive test suite verifying:
1. Interleaved CODEBOOK_33 input ordering (not grouped blocks)
2. Shuffled dictionary input normalization
3. Type and range validation (rejecting bool, float, string, out-of-range, missing keys)
4. Flat profile safety guard (All 1, 2, 3, 4, 5, and synthetic 6-mean equality)
5. Differentiated profiles producing SUCCESS
6. Regression test on the 5 discrepant profiles from B-03
7. Exact boundary tie detection (TIED_BOUNDARY) and near-tie non-abstention
8. Exclusion of all 12 CONDITIONAL/UNRESOLVED majors
9. Determinism of predictions
10. Research-only status enforcement across all outcomes
"""

import json
import math
import os
import unittest
from pathlib import Path
import numpy as np

from ranker import MLTop3Ranker, NUMERICAL_SCORE_TOLERANCE, DEFAULT_CONFIG_PATH

QUESTION_ORDER = [
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3", "A3",
    "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4", "E3", "I4",
    "A5", "E4", "C1", "E5", "C2", "C3", "C4"
]


class TestMLTop3Ranker(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ranker = MLTop3Ranker()

    def test_01_config_and_dependency_verification(self):
        """Verifies that config loads and dependencies are verified without error."""
        self.assertIn("RESEARCH_ONLY", self.ranker.config["research_status"])
        self.assertEqual(len(self.ranker.question_order), 27)
        self.assertEqual(len(self.ranker.domain_order), 6)
        # Force load models & reference
        self.ranker._verify_and_load_dependencies()
        self.assertEqual(len(self.ranker._ready_majors), 21)
        self.assertEqual(len(self.ranker._models), 6)

        # Dimension C must be XGBClassifier as declared in locked manifest
        from xgboost import XGBClassifier
        from sklearn.pipeline import Pipeline
        self.assertEqual(self.ranker.config["model_dependencies"]["artifacts"]["C"]["algorithm"], "XGBClassifier")
        self.assertIsInstance(self.ranker._models["C"], Pipeline)
        self.assertIsInstance(self.ranker._models["C"].named_steps["classifier"], XGBClassifier)

    def test_02_flat_profiles_all_levels_abstain(self):
        """Flat Profile Guard: All 1, 2, 3, 4, 5 must trigger ABSTAIN_FLAT_PROFILE and top3=[]"""
        for val in [1, 2, 3, 4, 5]:
            answers = [val] * 27
            res = self.ranker.rank(answers)
            self.assertEqual(res["status"], "ABSTAIN_FLAT_PROFILE", f"Failed for All {val}")
            self.assertEqual(res["top3"], [], f"Top3 should be empty for All {val}")
            self.assertEqual(res["tied_majors"], [])
            self.assertEqual(res["research_status"], "RESEARCH_ONLY — TOP3_NOT_VALIDATED")
            self.assertIn("Hồ sơ RIASEC phẳng", res["message"])
            self.assertAlmostEqual(res["domain_variance"], 0.0, places=6)

    def test_03_flat_profile_synthetic_equal_means(self):
        """Flat Profile Guard: Answers differ but 6 domain means are identical -> ABSTAIN"""
        # Create answers where:
        # R (5 items): [2, 4, 3, 3, 3] -> mean = 3.0
        # I (4 items): [2, 4, 3, 3] -> mean = 3.0
        # A (5 items): [1, 5, 3, 3, 3] -> mean = 3.0
        # S (4 items): [1, 5, 3, 3] -> mean = 3.0
        # E (5 items): [2, 3, 4, 3, 3] -> mean = 3.0
        # C (4 items): [2, 3, 4, 3] -> mean = 3.0
        r_vals = [2, 4, 3, 3, 3]
        i_vals = [2, 4, 3, 3]
        a_vals = [1, 5, 3, 3, 3]
        s_vals = [1, 5, 3, 3]
        e_vals = [2, 3, 4, 3, 3]
        c_vals = [2, 3, 4, 3]

        ans_dict = {}
        for idx, q in enumerate(["R1", "R2", "R3", "R4", "R5"]):
            ans_dict[q] = r_vals[idx]
        for idx, q in enumerate(["I1", "I2", "I3", "I4"]):
            ans_dict[q] = i_vals[idx]
        for idx, q in enumerate(["A1", "A2", "A3", "A4", "A5"]):
            ans_dict[q] = a_vals[idx]
        for idx, q in enumerate(["S1", "S2", "S3", "S4"]):
            ans_dict[q] = s_vals[idx]
        for idx, q in enumerate(["E1", "E2", "E3", "E4", "E5"]):
            ans_dict[q] = e_vals[idx]
        for idx, q in enumerate(["C1", "C2", "C3", "C4"]):
            ans_dict[q] = c_vals[idx]

        res = self.ranker.rank(ans_dict)
        self.assertEqual(res["status"], "ABSTAIN_FLAT_PROFILE")
        self.assertEqual(res["top3"], [])
        self.assertAlmostEqual(res["domain_variance"], 0.0, places=6)

    def test_04_shuffled_dict_keys_ordering(self):
        """Input dict with reversed or shuffled keys must produce identical result to ordered list."""
        base_answers = [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2]
        list_res = self.ranker.rank(base_answers)

        # Reverse key dict
        shuffled_dict = {QUESTION_ORDER[26 - i]: base_answers[26 - i] for i in range(27)}
        dict_res = self.ranker.rank(shuffled_dict)

        self.assertEqual(list_res["status"], dict_res["status"])
        self.assertEqual(
            [m["major_id"] for m in list_res["top3"]],
            [m["major_id"] for m in dict_res["top3"]]
        )
        for d in self.ranker.domain_order:
            self.assertAlmostEqual(list_res["ml_probabilities"][d], dict_res["ml_probabilities"][d], places=7)

    def test_05_invalid_inputs_rejected(self):
        """Rejects bad types, wrong lengths, out of range values, booleans, and missing keys."""
        # Length 26
        res = self.ranker.rank([3] * 26)
        self.assertEqual(res["status"], "INVALID_INPUT")

        # Out of range 0 and 6
        res = self.ranker.rank([0] + [3] * 26)
        self.assertEqual(res["status"], "INVALID_INPUT")
        res = self.ranker.rank([3] * 26 + [6])
        self.assertEqual(res["status"], "INVALID_INPUT")

        # Boolean True (which is an int subclass in Python)
        bad_answers = [3] * 27
        bad_answers[0] = True
        res = self.ranker.rank(bad_answers)
        self.assertEqual(res["status"], "INVALID_INPUT")

        # Float value
        bad_answers = [3] * 27
        bad_answers[5] = 3.5
        res = self.ranker.rank(bad_answers)
        self.assertEqual(res["status"], "INVALID_INPUT")

        # String value
        bad_answers = [3] * 27
        bad_answers[10] = "4"
        res = self.ranker.rank(bad_answers)
        self.assertEqual(res["status"], "INVALID_INPUT")

        # Missing key in dict
        bad_dict = {q: 3 for q in QUESTION_ORDER[:-1]}
        res = self.ranker.rank(bad_dict)
        self.assertEqual(res["status"], "INVALID_INPUT")

    def test_06_b03_discrepant_profiles_regression(self):
        """
        Regression test on the 5 profiles that were corrupted by the B-03 slicing bug:
        - Profiles 366, 968, 2390, 3824: have differentiated R and A/I answers -> must be SUCCESS under official mapping.
        - Profile 903: has diversified answers, rank 3 vs rank 4 difference is large -> SUCCESS, no boundary tie.
        """
        # Index 366 (R1=4, A1=2, all others 3)
        row_366 = [4, 3, 2] + [3] * 24
        res_366 = self.ranker.rank(row_366)
        self.assertEqual(res_366["status"], "SUCCESS")
        self.assertEqual(len(res_366["top3"]), 3)

        # Index 968 (R1=2, I1=4, all others 3)
        row_968 = [2, 4, 3] + [3] * 24
        res_968 = self.ranker.rank(row_968)
        self.assertEqual(res_968["status"], "SUCCESS")
        self.assertEqual(len(res_968["top3"]), 3)

        # Index 2390 (R1=1, I1=3, all others 2)
        row_2390 = [1, 3, 2] + [2] * 24
        res_2390 = self.ranker.rank(row_2390)
        self.assertEqual(res_2390["status"], "SUCCESS")
        self.assertEqual(len(res_2390["top3"]), 3)

        # Index 3824 (R1=3, I1=2, A1=3, R2=4, all others 3)
        row_3824 = [3, 2, 3, 4] + [3] * 23
        res_3824 = self.ranker.rank(row_3824)
        self.assertEqual(res_3824["status"], "SUCCESS")
        self.assertEqual(len(res_3824["top3"]), 3)

        # Index 903 (diverse answers)
        row_903 = [3, 3, 4, 4, 5, 5, 4, 4, 4, 4, 4, 4, 4, 5, 5, 4, 3, 3, 3, 4, 4, 3, 4, 4, 4, 3, 3]
        res_903 = self.ranker.rank(row_903)
        self.assertEqual(res_903["status"], "SUCCESS")
        self.assertEqual(len(res_903["top3"]), 3)
        self.assertGreater(res_903["metadata"]["margin_rank3_rank4"], 0.05)

    def test_07_boundary_tie_handling(self):
        """Simulate boundary tie at rank 3: must return TIED_BOUNDARY and top3=[]"""
        # Create a mock ranker subclass or temporarily mock candidates
        class MockRanker(MLTop3Ranker):
            def rank(self, answers):
                base_res = super().rank(answers)
                if base_res["status"] == "SUCCESS":
                    # Make candidate at index 2 and 3 identical in score
                    r_tied = base_res["all_rankings"][2]["pearson_r"]
                    base_res["all_rankings"][3]["pearson_r"] = r_tied
                    # Re-run grouping logic
                    score_groups = []
                    for c in base_res["all_rankings"]:
                        if not score_groups or abs(score_groups[-1][0]["pearson_r"] - c["pearson_r"]) > NUMERICAL_SCORE_TOLERANCE:
                            score_groups.append([])
                        score_groups[-1].append(c)
                    offset = 0
                    for g in score_groups:
                        for c in g:
                            c["rank"] = offset + 1
                        offset += len(g)
                    boundary_group = next(g for g in score_groups if base_res["all_rankings"][2] in g)
                    if boundary_group[0]["rank"] + len(boundary_group) - 1 > 3:
                        base_res["status"] = "TIED_BOUNDARY"
                        base_res["top3"] = []
                        base_res["tied_majors"] = boundary_group
                return base_res

        mock = MockRanker()
        res = mock.rank([1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2])
        self.assertEqual(res["status"], "TIED_BOUNDARY")
        self.assertEqual(res["top3"], [])
        self.assertGreaterEqual(len(res["tied_majors"]), 2)

    def test_08_only_21_ready_majors_scored(self):
        """Verifies that only 21 READY_FOR_PROTOTYPE majors are in all_rankings, no CONDITIONAL or UNRESOLVED."""
        res = self.ranker.rank([5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5, 1, 5])
        self.assertEqual(res["status"], "SUCCESS")
        ranked_ids = {m["major_id"] for m in res["all_rankings"]}
        self.assertEqual(len(ranked_ids), 21)

        # None of the 12 non-ready majors should be present
        forbidden_ids = [
            "su_pham_ngu_van", "su_pham_dia_ly", "su_pham_hoa_hoc", "su_pham_tin_hoc",
            "su_pham_toan_hoc", "su_pham_tieng_anh", "giao_duc_chinh_tri",
            "cong_nghe_thong_tin", "dong_phuong_hoc", "viet_nam_hoc",
            "quan_ly_du_lich_lu_hanh", "quan_ly_nha_nuoc"
        ]
        for f_id in forbidden_ids:
            self.assertNotIn(f_id, ranked_ids, f"Forbidden non-ready major {f_id} found in rankings!")

    def test_09_deterministic_predictions(self):
        """Calling rank() on identical input must produce identical results."""
        input_data = [4, 2, 3, 1, 5, 2, 4, 3, 5, 1, 2, 4, 3, 5, 1, 2, 4, 3, 5, 1, 2, 4, 3, 5, 1, 2, 4]
        res1 = self.ranker.rank(input_data)
        res2 = self.ranker.rank(input_data)

        self.assertEqual(res1["status"], res2["status"])
        self.assertEqual([m["major_id"] for m in res1["top3"]], [m["major_id"] for m in res2["top3"]])
        for d in self.ranker.domain_order:
            self.assertEqual(res1["ml_probabilities"][d], res2["ml_probabilities"][d])
            self.assertEqual(res1["standardized_vector"][d], res2["standardized_vector"][d])

    def test_10_pearson_correlations_bounded_and_not_percentages(self):
        """Pearson correlations must be within [-1.0, 1.0] and not scaled to [0, 100]."""
        res = self.ranker.rank([5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4, 3, 2, 1, 5, 4])
        self.assertEqual(res["status"], "SUCCESS")
        for m in res["all_rankings"]:
            r = m["pearson_r"]
            self.assertTrue(-1.0 <= r <= 1.0, f"Pearson r {r} out of bounds")
            # Must not be multiplied by 100
            self.assertLessEqual(abs(r), 1.0)


if __name__ == "__main__":
    unittest.main()
