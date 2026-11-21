"""
tests/sentinel_mapping.py

Comprehensive Sentinel Test Suite for Direction B RIASEC27 Inference Contract (Phase B-07-R1).
Directly spies on model.predict_proba to verify exact 27-feature alignment without ambiguity.
"""

import unittest
import pandas as pd
import numpy as np
from pathlib import Path
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
P2_DIR = REPO_ROOT / "research" / "riasec27_ml_top3_v0"
sys.path.insert(0, str(P2_DIR))

from ranker import MLTop3Ranker

FEATURE_ORDER_27 = [
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3", "A3",
    "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4", "E3", "I4",
    "A5", "E4", "C1", "E5", "C2", "C3", "C4"
]

B07_REPORTED_ORDER = [
    "R1", "I1", "A1", "S1", "E1", "C1", "R2", "I2", "A2", "S2",
    "E2", "C2", "R3", "I3", "A3", "S3", "E3", "C3", "R4", "I4",
    "A4", "S4", "E4", "C4", "R5", "A5", "E5"
]


class TestSentinelMapping(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ranker = MLTop3Ranker()
        cls.ranker._verify_and_load_dependencies()

    def test_01_feature_order_exact_match(self):
        """Verifies ranker question_order matches locked FEATURE_ORDER_27."""
        self.assertEqual(self.ranker.question_order, FEATURE_ORDER_27)

    def test_02_sentinel_all_27_questions_individual_mapping(self):
        """
        27 Sentinel Tests:
        For each question k in 0..26, sets Q_k = 5 while all other 26 questions are 1.
        Spies on predict_proba to verify the DataFrame passed into the models has value 5
        at exact column index k (and column name FEATURE_ORDER_27[k]), and 1 everywhere else.
        Tested across:
          - Canonical 27-element list
          - Dictionary in canonical order
          - Dictionary in reversed order (C4 -> R1)
          - Dictionary in B-07 reported round-robin order
        """
        captured_dfs = []

        # Spy on model.predict_proba for the first domain ('R')
        orig_predict_proba = self.ranker._models["R"].predict_proba

        def spy_predict_proba(X):
            captured_dfs.append(X.copy())
            return orig_predict_proba(X)

        self.ranker._models["R"].predict_proba = spy_predict_proba

        try:
            for k, target_qid in enumerate(FEATURE_ORDER_27):
                # 1. Canonical list
                list_input = [1] * 27
                list_input[k] = 5

                # 2. Canonical dict
                dict_canonical = {qid: (5 if qid == target_qid else 1) for qid in FEATURE_ORDER_27}

                # 3. Reversed dict
                dict_reversed = {qid: (5 if qid == target_qid else 1) for qid in reversed(FEATURE_ORDER_27)}

                # 4. B-07 reported order dict
                dict_b07 = {qid: (5 if qid == target_qid else 1) for qid in B07_REPORTED_ORDER}

                for input_variant, desc in [
                    (list_input, "canonical_list"),
                    (dict_canonical, "canonical_dict"),
                    (dict_reversed, "reversed_dict"),
                    (dict_b07, "b07_order_dict")
                ]:
                    captured_dfs.clear()
                    res = self.ranker.rank(input_variant)

                    self.assertGreater(len(captured_dfs), 0, f"predict_proba not called for {desc}")
                    df = captured_dfs[0]

                    # Verify columns match FEATURE_ORDER_27 exactly
                    self.assertEqual(df.columns.tolist(), FEATURE_ORDER_27, f"Columns mismatch for {desc}")

                    # Verify exact location of value 5
                    for col_idx, col_name in enumerate(FEATURE_ORDER_27):
                        val = df.iloc[0, col_idx]
                        if col_idx == k:
                            self.assertEqual(
                                val, 5,
                                f"Sentinel FAIL at {target_qid} ({desc}): expected 5 at index {k} ({col_name}), got {val}"
                            )
                        else:
                            self.assertEqual(
                                val, 1,
                                f"Sentinel FAIL at {target_qid} ({desc}): expected 1 at index {col_idx} ({col_name}), got {val}"
                            )
        finally:
            self.ranker._models["R"].predict_proba = orig_predict_proba

    def test_03_payload_dict_reversed_vs_canonical_parity(self):
        """A differentiated profile passed as reversed-key dict must produce bit-for-bit identical results."""
        # Differentiated raw answers: High R/I, Low others
        base_answers = [
            5, 5, 2, 5, 4, 2, 2, 2, 5, 2,
            2, 2, 5, 2, 2, 5, 5, 2, 2, 4,
            2, 2, 1, 2, 1, 1, 1
        ]
        res_list = self.ranker.rank(base_answers)

        dict_canonical = {FEATURE_ORDER_27[i]: base_answers[i] for i in range(27)}
        res_canonical = self.ranker.rank(dict_canonical)

        dict_reversed = {FEATURE_ORDER_27[26 - i]: base_answers[26 - i] for i in range(27)}
        res_reversed = self.ranker.rank(dict_reversed)

        dict_b07 = {q: dict_canonical[q] for q in B07_REPORTED_ORDER}
        res_b07 = self.ranker.rank(dict_b07)

        self.assertEqual(res_list["status"], "SUCCESS")
        self.assertEqual(res_canonical["status"], "SUCCESS")
        self.assertEqual(res_reversed["status"], "SUCCESS")
        self.assertEqual(res_b07["status"], "SUCCESS")

        # Top 3 major IDs must match
        top3_list = [m["major_id"] for m in res_list["top3"]]
        top3_canonical = [m["major_id"] for m in res_canonical["top3"]]
        top3_reversed = [m["major_id"] for m in res_reversed["top3"]]
        top3_b07 = [m["major_id"] for m in res_b07["top3"]]

        self.assertEqual(top3_list, top3_canonical)
        self.assertEqual(top3_list, top3_reversed)
        self.assertEqual(top3_list, top3_b07)

        # Probabilities must match
        for d in self.ranker.domain_order:
            self.assertEqual(res_list["ml_probabilities"][d], res_canonical["ml_probabilities"][d])
            self.assertEqual(res_list["ml_probabilities"][d], res_reversed["ml_probabilities"][d])
            self.assertEqual(res_list["ml_probabilities"][d], res_b07["ml_probabilities"][d])

    def test_04_missing_or_extra_or_invalid_keys(self):
        """Verifies strict validation when keys are missing, extra, or invalid."""
        # Missing one key (R4)
        bad_dict = {q: 3 for q in FEATURE_ORDER_27 if q != "R4"}
        res = self.ranker.rank(bad_dict)
        self.assertEqual(res["status"], "INVALID_INPUT")
        self.assertIn("Missing required question: R4", res["message"])

        # Unknown/strange key (X1 instead of R1)
        bad_dict2 = {q: 3 for q in FEATURE_ORDER_27 if q != "R1"}
        bad_dict2["X1"] = 3
        res2 = self.ranker.rank(bad_dict2)
        self.assertEqual(res2["status"], "INVALID_INPUT")
        self.assertIn("Missing required question: R1", res2["message"])

        # Value out of Likert range (0 and 6)
        bad_dict3 = {q: 3 for q in FEATURE_ORDER_27}
        bad_dict3["A1"] = 0
        res3 = self.ranker.rank(bad_dict3)
        self.assertEqual(res3["status"], "INVALID_INPUT")

        bad_dict4 = {q: 3 for q in FEATURE_ORDER_27}
        bad_dict4["S1"] = 6
        res4 = self.ranker.rank(bad_dict4)
        self.assertEqual(res4["status"], "INVALID_INPUT")

        # Invalid type (float, string, bool)
        bad_dict5 = {q: 3 for q in FEATURE_ORDER_27}
        bad_dict5["E1"] = 3.5
        res5 = self.ranker.rank(bad_dict5)
        self.assertEqual(res5["status"], "INVALID_INPUT")

        bad_dict6 = {q: 3 for q in FEATURE_ORDER_27}
        bad_dict6["C1"] = "4"
        res6 = self.ranker.rank(bad_dict6)
        self.assertEqual(res6["status"], "INVALID_INPUT")

        bad_dict7 = {q: 3 for q in FEATURE_ORDER_27}
        bad_dict7["R1"] = True
        res7 = self.ranker.rank(bad_dict7)
        self.assertEqual(res7["status"], "INVALID_INPUT")


if __name__ == "__main__":
    unittest.main()
