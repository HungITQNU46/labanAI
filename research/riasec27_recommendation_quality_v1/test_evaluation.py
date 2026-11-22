"""B-10 regression checks with synthetic inputs only; no training or dataset I/O."""

import builtins
import copy
import io
import json
import math
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evaluate_profiles as evaluation
from generate_profiles import (FEATURE_ORDER_27, DOMAIN_INDICES, build_manifest,
                               iter_perturbations, one_step, validate_profile)
from metrics import (compare, describe, jaccard, summarize_comparisons,
                     summarize_distribution, unique_top1)


def success(ids, ranks=None):
    rows = [{"major_id": key, "pearson_r": .9-i*.1, "rank": ranks[i] if ranks else i+1}
            for i, key in enumerate(ids)]
    return {"status": "SUCCESS", "top3": rows[:3], "all_rankings": rows}


class EvaluationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.context = evaluation.EvaluationContext()
        cls.manifest = build_manifest()
        cls.anchor = next(p["answers"] for p in cls.manifest["profiles"] if p["profile_id"] == "differentiated_anchor")

    def test_01_canonical_feature_order_independent_literal(self):
        expected = "R1,I1,A1,R2,I2,A2,S1,S2,R3,A3,S3,E1,R4,S4,E2,R5,I3,A4,E3,I4,A5,E4,C1,E5,C2,C3,C4".split(",")
        self.assertEqual(list(FEATURE_ORDER_27), expected)
        self.assertEqual(list(self.context.p0.QUESTION_ORDER), expected)
        self.assertEqual(self.context.p2.question_order, expected)
        self.assertEqual(sorted(i for indices in DOMAIN_INDICES.values() for i in indices), list(range(27)))

    def test_02_all_generated_inputs_valid(self):
        self.assertEqual(len(self.manifest["profiles"]), 243)
        for row in self.manifest["profiles"]:
            validate_profile(row["answers"])
        for invalid in [[1]*26, [1]*28, [True]+[1]*26, [1.5]+[1]*26, [0]+[1]*26, [6]*27]:
            with self.assertRaises(ValueError):
                validate_profile(invalid)

    def test_03_flat_uniform_and_nonuniform_guard(self):
        flat = [p for p in self.manifest["profiles"] if p["category"].startswith("flat_")]
        self.assertEqual(len(flat), 8)
        for profile in flat:
            for method in ["P0", "P2"]:
                result = self.context.run(method, profile["answers"])
                self.assertEqual(result["status"], "ABSTAIN_FLAT_PROFILE")
                self.assertEqual(result["top3"], [])
        self.assertGreater(len(set(flat[-1]["answers"])), 1)

    def test_04_differentiated_profile_and_exact_means(self):
        p0 = self.context.run("P0", self.anchor)
        p2 = self.context.run("P2", self.anchor)
        self.assertEqual(p0["status"], "SUCCESS")
        self.assertEqual(p2["status"], "SUCCESS")
        self.assertEqual(list(p0["user_vector"].values()), [4.6, 4.75, 1.6, 1.5, 2.2, 4.25])
        self.assertEqual(p0["user_vector"], p2["domain_means"])

    def test_05_deterministic_results_and_generation(self):
        self.assertEqual(self.manifest, build_manifest())
        self.assertEqual(list(iter_perturbations(self.manifest["profiles"][:2])),
                         list(iter_perturbations(self.manifest["profiles"][:2])))
        for method in ["P0", "P2"]:
            self.assertEqual(self.context.run(method, self.anchor), self.context.run(method, self.anchor))

    def test_06_wrappers_call_original_modules(self):
        self.assertEqual(Path(self.context.p0.__file__).resolve(),
                         evaluation.RESEARCH / "riasec27_top3_b1_v0/prototype.py")
        self.assertEqual(Path(self.context.p2_module.__file__).resolve(),
                         evaluation.RESEARCH / "riasec27_ml_top3_v0/ranker.py")
        with patch.object(self.context.p0, "rank_majors", wraps=self.context.p0.rank_majors) as spy:
            self.context.run("P0", self.anchor)
            spy.assert_called_once_with(self.anchor, reference_data=self.context.reference)
        with patch.object(self.context.p2, "rank", wraps=self.context.p2.rank) as spy:
            self.context.run("P2", self.anchor)
            spy.assert_called_once_with(self.anchor)

    def test_07_outputs_only_same_21_ready_candidates(self):
        self.assertTrue(self.context.same_scope)
        self.assertEqual(len(self.context.candidate_ids), 21)
        for method in ["P0", "P2"]:
            for profile in self.manifest["profiles"][:41]:
                result = self.context.run(method, profile["answers"])
                self.assertEqual(evaluation.check_output(result, self.context.candidate_ids), [])

    def test_08_catalog_and_dependencies_unchanged(self):
        before = self.context.snapshot()
        for method in ["P0", "P2"]:
            self.context.run(method, self.anchor)
        self.assertEqual(before, self.context.snapshot())
        self.assertEqual(self.context.before, before)

    def test_09_abstain_tied_errors_keep_denominator(self):
        a = success(["a", "b", "c"])
        rows = [compare(a, a)]
        for status in ["ABSTAIN_FLAT_PROFILE", "TIED_BOUNDARY", "ERROR"]:
            rows.append(compare(a, {"status": status, "top3": []}))
        result = summarize_comparisons(rows, 4)
        self.assertEqual(result["evaluable_pairs"], 1)
        self.assertEqual(result["not_evaluable"], 3)
        self.assertEqual(result["same_top3_set"]["rate_all_pairs"], .25)
        self.assertEqual(result["same_top3_set"]["rate"], 1)

    def test_10_jaccard_known_values(self):
        self.assertEqual(jaccard(["a", "b", "c"], ["a", "b", "c"]), 1)
        self.assertEqual(jaccard(["a", "b", "c"], ["a", "b", "d"]), .5)
        self.assertEqual(jaccard(["a", "b", "c"], ["a", "d", "e"]), .2)
        self.assertEqual(jaccard(["a", "b", "c"], ["d", "e", "f"]), 0)
        self.assertIsNone(jaccard([], []))
        self.assertFalse(compare(success(["a", "b", "c"]), success(["a", "b", "c"]), False)["evaluable"])

    def test_11_every_perturb_is_exactly_one_legal_step(self):
        parents = {p["profile_id"]: p["answers"] for p in self.manifest["profiles"]}
        changes = list(iter_perturbations(self.manifest["profiles"]))
        self.assertEqual(len(changes), 6561)
        for row in changes:
            validate_profile(row["answers"])
            diffs = [b-a for a, b in zip(parents[row["profile_id"]], row["answers"])]
            self.assertEqual(sum(abs(x) for x in diffs), 1)
            self.assertEqual(diffs[row["position_0based"]], row["delta"])
        with self.assertRaises(ValueError):
            one_step([1]*27, 0, -1)

    def test_12_distribution_metrics_known_example(self):
        result = summarize_distribution([success(["a", "b", "c"])], ["a", "b", "c", "d"])
        self.assertEqual(result["top3_slots"], 3)
        self.assertEqual(result["candidate_coverage_rate"], .75)
        self.assertAlmostEqual(result["gini"], .25)
        self.assertAlmostEqual(result["entropy_nats"], math.log(3))
        self.assertEqual(result["frequency"][-1]["top3_count"], 0)
        self.assertIsNone(summarize_distribution([], ["a", "b"])["gini"])

    def test_13_no_fake_relevance_or_ground_truth_fields(self):
        forbidden = {"true_major", "expected_major", "ground_truth", "relevance_label",
                     "accuracy", "hit_at_3", "ndcg", "correct_major"}
        def walk(obj):
            if isinstance(obj, dict):
                self.assertFalse(set(obj) & forbidden)
                for value in obj.values():
                    walk(value)
            elif isinstance(obj, list):
                for value in obj:
                    walk(value)
        walk(self.manifest)
        saved = evaluation.HERE / "comparison_results.json"
        if saved.exists():
            walk(evaluation.read_json(saved))
        self.assertIn("Không có ground truth", evaluation.LIMITS)
        self.assertIn("TOP3_NOT_VALIDATED", self.manifest["research_status"])

    def test_14_inference_cannot_read_workbooks_or_fit(self):
        import pandas as pd
        from sklearn.pipeline import Pipeline
        original_builtin, original_io = builtins.open, io.open
        def guard(original):
            def guarded(file, *args, **kwargs):
                if isinstance(file, (str, Path)) and Path(file).suffix.lower() in {".xlsx", ".xls", ".csv"}:
                    raise AssertionError("Real dataset access is forbidden")
                return original(file, *args, **kwargs)
            return guarded
        with patch("builtins.open", side_effect=guard(original_builtin)), patch("io.open", side_effect=guard(original_io)), \
                patch.object(pd, "read_excel", side_effect=AssertionError("No Test 947")), \
                patch.object(Pipeline, "fit", side_effect=AssertionError("No fitting")):
            ctx = evaluation.EvaluationContext()
            subset = copy.deepcopy(self.manifest)
            subset["profiles"] = [next(p for p in subset["profiles"] if p["profile_id"] == "differentiated_anchor")]
            result = evaluation.evaluate(ctx, subset)
            self.assertEqual(result["anomalies"], [])
            self.assertEqual(result["perturbation_count"], 27)

    def test_15_no_personal_data_in_generated_and_saved_outputs(self):
        forbidden = {"source_row", "student_id", "student_name", "email", "phone", "timestamp", "full_name", "gender"}
        def walk(obj):
            if isinstance(obj, dict):
                self.assertFalse({str(k).lower() for k in obj} & forbidden)
                for value in obj.values():
                    walk(value)
            elif isinstance(obj, list):
                for value in obj:
                    walk(value)
        walk(self.manifest)
        path = evaluation.HERE / "comparison_results.json"
        if path.exists():
            walk(evaluation.read_json(path))

    def test_16_tied_top1_and_order_are_not_arbitrarily_resolved(self):
        tied = success(["a", "b", "c"], [1, 1, 3])
        self.assertIsNone(unique_top1(tied))
        result = compare(tied, tied)
        self.assertTrue(result["same_top3_set"])
        self.assertIsNone(result["same_unique_top1"])
        self.assertIsNone(result["same_top3_order"])

    def test_17_keyed_input_equivalence(self):
        keyed = dict(reversed(list(zip(FEATURE_ORDER_27, self.anchor))))
        self.assertEqual(self.context.run("P2", self.anchor), self.context.run("P2", keyed))

    def test_18_failure_is_recorded_not_dropped(self):
        with patch.object(self.context.p0, "rank_majors", side_effect=RuntimeError("synthetic failure")):
            result = self.context.run("P0", self.anchor)
        self.assertEqual(result["status"], "ERROR")
        self.assertEqual(result["error_type"], "RuntimeError")
        self.assertTrue(evaluation.check_output(result, self.context.candidate_ids))
        bad = success(["outside", "b", "c"])
        self.assertTrue(evaluation.check_output(bad, self.context.candidate_ids))

    def test_19_probability_and_score_deltas_keep_sign(self):
        a = {"ml_probabilities": dict.fromkeys("RIASEC", .2), "all_rankings": [{"major_id": "a", "pearson_r": .8}]}
        b = {"ml_probabilities": dict.fromkeys("RIASEC", .3), "all_rankings": [{"major_id": "a", "pearson_r": .5}]}
        self.assertAlmostEqual(evaluation.probability_changes(a, b)["R"], .1)
        self.assertAlmostEqual(evaluation.all_score_changes(a, b)["a"], -.3)
        self.assertIsNone(evaluation.probability_changes({}, b))

    def test_20_p95_and_empty_metric_semantics(self):
        self.assertAlmostEqual(describe([0, 1, 2, 3, 4])["p95"], 3.8)
        self.assertIsNone(describe([])["mean"])
        self.assertFalse(compare(success(["a", "b", "c"]), success(["a", "a", "c"]))["evaluable"])


if __name__ == "__main__":
    unittest.main()
