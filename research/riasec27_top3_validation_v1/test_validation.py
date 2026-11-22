"""Formula, contract, missingness and native-inference tests with synthetic labels only."""
import ast
import copy
import json
import math
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from research.riasec27_top3_validation_v1.contracts import HERE, DEMO_STATUS, load_contract, read_json
from research.riasec27_top3_validation_v1.evaluate_top3 import NativeRankers, evaluate, markdown_report, safe_ranking
from research.riasec27_top3_validation_v1.generate_fixture import build_fixture, schema
from research.riasec27_top3_validation_v1.metrics import score_top3
from research.riasec27_top3_validation_v1.validate_input import load_document, validate_document, validate_record


def success(candidate_ids, first):
    order = list(first) + [key for key in candidate_ids if key not in first]
    rankings = [{"major_id": key, "rank": i+1, "pearson_r": .95-i*.08} for i, key in enumerate(order)]
    return {"status": "SUCCESS", "top3": rankings[:3], "all_rankings": rankings}


class FakeRankers:
    """Controlled backend results for testing evaluation, never a replacement CLI ranker."""
    def __init__(self, contract, first=None, second=None):
        ids = contract["candidate_ids"]
        self.outputs = {"P0": success(ids, first or ids[:3]), "P2": success(ids, second or ids[:3])}
        self.same_scope = True
        self.calls = []

    def call(self, method, answers):
        self.calls.append((method, answers.copy()))
        return copy.deepcopy(self.outputs[method])


class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.contract = load_contract()
        cls.ids = cls.contract["candidate_ids"]
        cls.fixture = build_fixture(cls.contract)

    def document(self, records=None):
        return {"schema_version": "1.0.0", "data_kind": DEMO_STATUS,
                "records": copy.deepcopy(records if records is not None else [self.fixture["records"][0]])}

    def run_fake(self, document=None, fake=None):
        return evaluate(document or self.document(), self.contract, fake or FakeRankers(self.contract))

    def test_01_complete_21_labels(self):
        result = self.run_fake()
        self.assertEqual(result["summary"]["paired_evaluable_profiles"], 1)
        self.assertEqual(result["rows"][0]["evaluation_status"], "EVALUABLE_COMPLETE_21")

    def test_02_missing_label_inside_top3(self):
        document = self.document(); document["records"][0]["major_interest_labels"][self.ids[0]] = None
        result = self.run_fake(document)
        self.assertIsNone(result["rows"][0]["paired_metrics"])
        self.assertEqual(result["summary"]["missing_label_profiles"], 1)
        self.assertEqual(result["summary"]["methods"]["P0"]["coverage_all_profiles"]["rate"], 1)

    def test_03_missing_label_outside_both_top3(self):
        document = self.document(); document["records"][0]["major_interest_labels"][self.ids[-1]] = None
        result = self.run_fake(document)
        self.assertEqual(result["summary"]["paired_evaluable_profiles"], 0)
        self.assertIn("INSUFFICIENT_LABELS", result["rows"][0]["not_evaluable_reasons"])
        self.assertIsNone(result["summary"]["mean_paired_difference_ndcg_at_3"])

    def test_04_all_zero_idcg_is_counted_and_included(self):
        document = self.document(); document["records"][0]["major_interest_labels"] = dict.fromkeys(self.ids, 0)
        result = self.run_fake(document)
        self.assertEqual(result["summary"]["idcg_zero_paired_profiles"], 1)
        self.assertEqual(result["summary"]["paired_evaluable_profiles"], 1)
        for method in ["P0", "P2"]:
            metrics = result["rows"][0]["paired_metrics"][method]
            self.assertEqual([metrics[k] for k in ["ndcg_at_3", "precision_at_3", "hit_at_3"]], [0, 0, 0])

    def test_05_identical_lists_have_zero_paired_difference(self):
        result = self.run_fake()
        self.assertEqual(result["summary"]["mean_paired_difference_ndcg_at_3"], 0)

    def test_06_disjoint_lists_use_one_label_per_major(self):
        # Controlled formula example, not labels derived from native P0/P2 predictions.
        document = self.document(); labels = dict.fromkeys(self.ids, 0)
        labels.update({key: 3 for key in self.ids[:3]})
        document["records"][0]["major_interest_labels"] = labels
        fake = FakeRankers(self.contract, self.ids[:3], self.ids[3:6])
        row = self.run_fake(document, fake)["rows"][0]
        self.assertEqual(row["paired_metrics"]["P0"]["ndcg_at_3"], 1)
        self.assertEqual(row["paired_metrics"]["P2"]["ndcg_at_3"], 0)
        self.assertEqual(row["paired_metrics"]["p2_minus_p0_ndcg_at_3"], -1)

    def test_07_real_flat_profile_abstains(self):
        document = self.document(); document["records"][0]["answers"] = dict.fromkeys(self.contract["question_order"], 3)
        result = evaluate(document, self.contract)
        for method in ["P0", "P2"]:
            self.assertEqual(result["rows"][0][method]["status"], "ABSTAIN_FLAT_PROFILE")
        self.assertIsNone(result["rows"][0]["paired_metrics"])

    def test_08_tied_backend_contract_never_fabricates_top3(self):
        fake = FakeRankers(self.contract)
        tied = [{"major_id": key, "rank": 1, "pearson_r": .5} for key in self.ids]
        fake.outputs["P2"] = {"status": "TIED_BOUNDARY", "top3": [], "tied_majors": tied, "all_rankings": tied}
        result = self.run_fake(fake=fake)
        self.assertEqual(result["summary"]["methods"]["P2"]["statuses"]["TIED_BOUNDARY"], 1)
        self.assertEqual(result["rows"][0]["P2"]["top3"], [])
        self.assertIsNone(result["rows"][0]["paired_metrics"])

    def test_09_negative_high_fractional_boolean_labels_rejected(self):
        for value in [-1, 4, 1.5, True, "2", float("nan")]:
            record = copy.deepcopy(self.fixture["records"][0]); record["major_interest_labels"][self.ids[0]] = value
            self.assertFalse(validate_record(record, self.contract)["valid"])

    def test_10_unknown_or_absent_major_keys_are_not_zero_filled(self):
        for operation in ["extra", "absent"]:
            document = self.document(); labels = document["records"][0]["major_interest_labels"]
            if operation == "extra": labels["OUTSIDE_READY_POOL"] = 2
            else: labels.pop(self.ids[-1])
            row = self.run_fake(document)["rows"][0]
            self.assertEqual(row["evaluation_status"], "NOT_EVALUABLE")
            self.assertIn("LABEL_KEYS_MISMATCH", row["validation_errors"])

    def test_11_missing_riasec_question_rejected(self):
        document = self.document(); del document["records"][0]["answers"]["R1"]
        fake = FakeRankers(self.contract)
        self.assertEqual(self.run_fake(document, fake)["summary"]["invalid_profiles"], 1)
        self.assertEqual(fake.calls, [])

    def test_12_invalid_likert_rejected(self):
        for value in [0, 6, True, 1.0, "3", None]:
            record = copy.deepcopy(self.fixture["records"][0]); record["answers"]["R1"] = value
            self.assertFalse(validate_record(record, self.contract)["valid"])

    def test_13_json_key_permutation_preserves_results(self):
        document = self.document(); permuted = copy.deepcopy(document)
        for key in ["answers", "major_interest_labels"]:
            permuted["records"][0][key] = dict(reversed(list(permuted["records"][0][key].items())))
        self.assertEqual(self.run_fake(document), self.run_fake(permuted))

    def test_14_generation_and_native_inference_are_deterministic(self):
        self.assertEqual(self.fixture, build_fixture(self.contract))
        rankers = NativeRankers(self.contract)
        self.assertEqual(evaluate(self.document(), self.contract, rankers), evaluate(self.document(), self.contract, rankers))

    def test_15_output_contains_no_answers_labels_or_personal_fields(self):
        document = self.document(); document["records"][0]["email"] = "DO_NOT_ECHO_PRIVATE_VALUE"
        result = self.run_fake(document)
        self.assertNotIn("DO_NOT_ECHO_PRIVATE_VALUE", json.dumps(result))
        forbidden = {"email", "phone", "name", "address", "answers", "major_interest_labels", "ml_probabilities", "standardized_vector"}
        def walk(obj):
            if isinstance(obj, dict):
                self.assertFalse(set(obj) & forbidden)
                for value in obj.values(): walk(value)
            elif isinstance(obj, list):
                for value in obj: walk(value)
        walk(self.run_fake())

    def test_16_ndcg_hand_calculation(self):
        labels = dict.fromkeys(self.ids, 0); labels.update(dict(zip(self.ids[:3], [3, 2, 1])))
        result = score_top3(success(self.ids, self.ids[:3])["top3"], labels, self.ids)
        ideal = 7 + 3/math.log2(3) + 1/2
        self.assertAlmostEqual(result["dcg_at_3"], ideal, places=13)
        self.assertAlmostEqual(result["idcg_at_3"], ideal, places=13)
        self.assertEqual(result["ndcg_at_3"], 1)
        reverse = score_top3(success(self.ids, list(reversed(self.ids[:3])))["top3"], labels, self.ids)
        self.assertAlmostEqual(reverse["ndcg_at_3"], (1+3/math.log2(3)+7/2)/ideal, places=13)
        self.assertEqual(result["precision_at_3"], 2/3)
        self.assertEqual(result["hit_at_3"], 1)

    def test_17_idcg_uses_all_21_not_only_top3_or_union(self):
        labels = dict.fromkeys(self.ids, 1)
        labels.update({key: 3 for key in self.ids[-3:]})
        result = score_top3(success(self.ids, self.ids[:3])["top3"], labels, self.ids)
        self.assertAlmostEqual(result["ndcg_at_3"], 1/7, places=13)
        self.assertEqual(result["precision_at_3"], 0)
        self.assertEqual(result["hit_at_3"], 0)

    def test_18_native_ties_use_expected_dcg_invariant_to_display_order(self):
        labels = dict.fromkeys(self.ids, 0); labels.update(dict(zip(self.ids[:3], [3, 1, 2])))
        top3 = success(self.ids, self.ids[:3])["top3"]
        top3[1]["rank"] = 1
        a = score_top3(top3, labels, self.ids)
        b = score_top3([top3[1], top3[0], top3[2]], labels, self.ids)
        self.assertEqual(a, b)
        self.assertAlmostEqual(a["dcg_at_3"], 4*(1+1/math.log2(3))+3/2, places=13)

    def test_19_duplicate_participant_ids_invalidate_every_occurrence(self):
        document = self.document([self.fixture["records"][0], self.fixture["records"][0]])
        result = self.run_fake(document)
        self.assertEqual(result["summary"]["total_profiles"], 2)
        self.assertEqual(result["summary"]["valid_profiles"], 0)
        self.assertTrue(all("DUPLICATE_PARTICIPANT_ID" in row["validation_errors"] for row in result["rows"]))

    def test_20_error_status_is_counted_without_diagnostics(self):
        fake = FakeRankers(self.contract)
        fake.outputs["P2"] = {"status": "DEPENDENCY_ERROR", "message": "PRIVATE_PATH/secret", "top3": []}
        result = self.run_fake(fake=fake)
        self.assertEqual(result["summary"]["methods"]["P2"]["statuses"]["ERROR"], 1)
        self.assertNotIn("PRIVATE_PATH", json.dumps(result))
        self.assertEqual(result["summary"]["total_profiles"], 1)

    def test_21_scope_mismatch_is_not_comparable(self):
        fake = FakeRankers(self.contract); fake.same_scope = False
        result = self.run_fake(fake=fake)
        self.assertEqual(result["summary"]["paired_evaluable_profiles"], 0)
        self.assertIn("CANDIDATE_SCOPE_MISMATCH", result["rows"][0]["not_evaluable_reasons"])

    def test_22_both_rankers_receive_same_canonical_x_without_labels(self):
        fake = FakeRankers(self.contract); document = self.document()
        self.run_fake(document, fake)
        expected = [document["records"][0]["answers"][q] for q in self.contract["question_order"]]
        self.assertEqual(fake.calls, [("P0", expected), ("P2", expected)])

    def test_23_native_apis_called_directly(self):
        rankers = NativeRankers(self.contract)
        values = [self.fixture["records"][0]["answers"][q] for q in self.contract["question_order"]]
        with patch.object(rankers.p0, "rank_majors", wraps=rankers.p0.rank_majors) as spy:
            rankers.call("P0", values)
            spy.assert_called_once_with(values, reference_data=self.contract["reference"])
        with patch.object(rankers.p2, "rank", wraps=rankers.p2.rank) as spy:
            rankers.call("P2", values)
            spy.assert_called_once_with(values)

    def test_24_empty_input_means_are_na_not_zero(self):
        result = self.run_fake(self.document([]))
        self.assertEqual(result["summary"]["total_profiles"], 0)
        self.assertIsNone(result["summary"]["methods"]["P0"]["mean_ndcg_at_3"])
        self.assertIsNone(result["summary"]["methods"]["P0"]["coverage_all_profiles"]["rate"])

    def test_25_schema_and_saved_fixture_match_locked_contract(self):
        saved = read_json(HERE/"evaluation_schema.json")
        self.assertEqual(saved, schema(self.contract))
        self.assertEqual(read_json(HERE/"synthetic_fixture.json"), self.fixture)
        properties = saved["$defs"]["record"]["properties"]
        self.assertEqual(properties["answers"]["required"], list(self.contract["question_order"]))
        self.assertEqual(set(properties["major_interest_labels"]["required"]), set(self.ids))

    def test_26_document_gate_rejects_real_data_claims(self):
        document = self.document(); document["data_kind"] = "REAL_PARTICIPANTS"
        with self.assertRaises(ValueError): validate_document(document, self.contract)
        with self.assertRaises(ValueError): load_document(HERE/".env")

    def test_27_duplicate_json_keys_and_nan_are_rejected(self):
        for content in ['{"x":1,"x":2}', '{"x":NaN}', '{broken}']:
            with tempfile.NamedTemporaryFile(dir=HERE, suffix=".json", delete=False) as stream:
                stream.write(content.encode("utf-8")); name = Path(stream.name)
            try:
                with self.assertRaises(ValueError): load_document(name)
            finally:
                name.unlink()

    def test_28_unknown_fields_and_identity_ids_rejected(self):
        record = copy.deepcopy(self.fixture["records"][0]); record["participant_id"] = "PERSON_NAME_EMAIL"
        self.assertIsNone(validate_record(record, self.contract)["participant_id"])
        record = copy.deepcopy(self.fixture["records"][0]); record["Q5_LikeRe"] = 5
        self.assertFalse(validate_record(record, self.contract)["valid"])

    def test_29_report_is_explicitly_synthetic_without_inferential_statistics(self):
        result = self.run_fake(); report = markdown_report(result)
        self.assertIn(DEMO_STATUS, report)
        self.assertIn("Không suy", report)
        self.assertNotIn("p_value", json.dumps(result))
        self.assertNotIn("accuracy", json.dumps(result).lower())

    def test_30_malformed_ranking_rejected_without_fake_success(self):
        result = success(self.ids, self.ids[:3]); result["top3"][0]["major_id"] = "OUTSIDE_POOL"
        self.assertEqual(safe_ranking(result, self.ids)["status"], "ERROR")
        result = success(self.ids, self.ids[:3]); result["top3"][0]["pearson_r"] = float("nan")
        self.assertEqual(safe_ranking(result, self.ids)["status"], "ERROR")

    def test_31_no_fit_real_workbook_or_external_write_in_production_modules(self):
        forbidden = {"fit", "fit_transform", "train", "read_excel", "read_csv"}
        for name in ["contracts.py", "validate_input.py", "evaluate_top3.py", "metrics.py", "generate_fixture.py"]:
            tree = ast.parse((HERE/name).read_text(encoding="utf-8"))
            calls = {n.func.attr for n in ast.walk(tree) if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)}
            self.assertFalse(calls & forbidden)
        tree = ast.parse((HERE/"generate_fixture.py").read_text(encoding="utf-8"))
        self.assertFalse(any(isinstance(n, ast.Name) and n.id == "NativeRankers" for n in ast.walk(tree)))


if __name__ == "__main__":
    unittest.main()
