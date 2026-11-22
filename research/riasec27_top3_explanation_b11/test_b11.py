"""Check saved audit completeness and locked mathematics; no fitting."""
import ast
import hashlib
import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent


class CaseAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit = json.loads((HERE / "case_audit.json").read_text(encoding="utf-8"))

    def test_all_21_cases_are_replayed(self):
        self.assertEqual(len(self.audit["cases"]), 21)
        self.assertTrue(all(c["replay_matches_b10"] for c in self.audit["cases"]))
        self.assertEqual(len({c["case_id"] for c in self.audit["cases"]}), 21)

    def test_single_step_and_six_outputs(self):
        for case in self.audit["cases"]:
            self.assertEqual(sum(abs(case["answers_before"][q]-case["answers_after"][q]) for q in case["answers_before"]), 1)
            for stage in ["before", "after"]:
                output = case["fresh_outputs"][stage]["P2"]
                for key in ["domain_means", "ml_probabilities", "standardized_vector"]:
                    self.assertEqual(set(output[key]), set("RIASEC"))
                self.assertEqual(output["status"], "SUCCESS")

    def test_all_ranks_and_disjoint_sets(self):
        for case in self.audit["cases"]:
            self.assertEqual(len(case["p2_rank_changes_all_21"]), 21)
            self.assertEqual(len(case["exited_top3"]), 3)
            self.assertEqual(len(case["entered_top3"]), 3)
            self.assertFalse(set(case["exited_top3"]) & set(case["entered_top3"]))

    def test_fixed_z_changes_and_artifact_leaf_evidence(self):
        params = self.audit["normalization"]["parameters"]
        for case in self.audit["cases"]:
            for d in "RIASEC":
                self.assertAlmostEqual(case["z_score_changes"][d], case["probability_changes"][d]/params[d]["std"], places=13)
            for d in "ISC":
                evidence = case["model_path_evidence"][d]
                self.assertEqual(evidence["class"], "XGBClassifier")
                self.assertEqual(evidence["tree_count"], 160)
                self.assertEqual(evidence["changed_leaf_count"], len(evidence["changed_tree_indices_0based"]))

    def test_locked_scoring_dependencies_unchanged(self):
        for name, expected in self.audit["locked_scoring_dependency_sha256"].items():
            self.assertEqual(hashlib.sha256((HERE.parent/name).read_bytes()).hexdigest(), expected)

    def test_analysis_does_not_fit_or_load_real_survey(self):
        tree = ast.parse((HERE/"analyze_cases.py").read_text(encoding="utf-8"))
        forbidden = {"fit", "fit_transform", "read_excel", "read_csv", "train"}
        calls = {n.func.attr for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)}
        self.assertFalse(calls & forbidden)


if __name__ == "__main__":
    unittest.main()
