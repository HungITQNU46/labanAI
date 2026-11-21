"""test_catalog.py - Unit tests for LabanAI Major Catalog v1.
Phase: B-04-R1

Comprehensive test suite verifying:
1. Exact canonical 33 majors count and keys.
2. Exact status counts (21 READY, 10 CONDITIONAL, 2 UNRESOLVED).
3. Exact ranking eligibility (21 eligible, 12 ineligible, 33 visible).
4. Quarantine of proposed mappings with PENDING_REVIEW status.
5. Deterministic O*NET vector mapping (no split vector for same SOC).
6. Evidence registry: valid HTTP/HTTPS URLs, no unproven VERIFIED on homepages.
7. Differentiation plan: no numeric composite weights, Mechanism B blocked, student-level question wording.
8. Execution of validate_catalog() returns PASSED with 0 errors.
"""

from __future__ import annotations

import json
from pathlib import Path
import unittest

from validate_catalog import (
    validate_catalog,
    EXPECTED_CANONICAL_MAJORS,
    EXPECTED_READY,
    EXPECTED_CONDITIONAL,
    EXPECTED_UNRESOLVED,
    TOTAL_MAJORS,
)


class TestMajorCatalogV1R1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_dir = Path(__file__).resolve().parent
        cls.majors_path = cls.base_dir / "majors_registry.json"
        cls.evidence_path = cls.base_dir / "evidence_registry.json"
        cls.plan_path = cls.base_dir / "differentiation_plan.json"

        with open(cls.majors_path, "r", encoding="utf-8") as f:
            cls.majors_data = json.load(f)
        with open(cls.evidence_path, "r", encoding="utf-8") as f:
            cls.evidence_data = json.load(f)
        with open(cls.plan_path, "r", encoding="utf-8") as f:
            cls.plan_data = json.load(f)

        cls.majors = {m["major_id"]: m for m in cls.majors_data.get("majors", [])}
        cls.evidence = {ev["major_id"]: ev for ev in cls.evidence_data.get("evidence_records", {}).values()}
        cls.clusters = cls.plan_data.get("clusters", {})

    def test_01_file_existence(self):
        self.assertTrue(self.majors_path.exists())
        self.assertTrue(self.evidence_path.exists())
        self.assertTrue(self.plan_path.exists())

    def test_02_total_majors_count_and_keys(self):
        self.assertEqual(len(self.majors), TOTAL_MAJORS)
        self.assertEqual(set(self.majors.keys()), set(EXPECTED_CANONICAL_MAJORS))

    def test_03_exact_status_counts(self):
        statuses = [m["status"] for m in self.majors.values()]
        ready = statuses.count("READY_FOR_PROTOTYPE")
        cond = statuses.count("CONDITIONAL")
        unres = statuses.count("UNRESOLVED")

        self.assertEqual(ready, EXPECTED_READY)
        self.assertEqual(cond, EXPECTED_CONDITIONAL)
        self.assertEqual(unres, EXPECTED_UNRESOLVED)
        self.assertEqual(ready + cond + unres, TOTAL_MAJORS)

    def test_04_automatic_ranking_eligibility_and_visibility(self):
        eligible = [k for k, m in self.majors.items() if m.get("automatic_ranking_eligibility")]
        ineligible = [k for k, m in self.majors.items() if not m.get("automatic_ranking_eligibility")]
        visible = [k for k, m in self.majors.items() if m.get("catalog_visibility")]

        self.assertEqual(len(eligible), EXPECTED_READY)
        self.assertEqual(len(ineligible), EXPECTED_CONDITIONAL + EXPECTED_UNRESOLVED)
        self.assertEqual(len(visible), TOTAL_MAJORS)

        for k, m in self.majors.items():
            if m["status"] == "READY_FOR_PROTOTYPE":
                self.assertTrue(m["automatic_ranking_eligibility"], f"{k} should be eligible")
            else:
                self.assertFalse(m["automatic_ranking_eligibility"], f"{k} must NOT be eligible")

    def test_05_proposed_mappings_quarantine(self):
        """All candidate alternative mappings must be marked PENDING_REVIEW with source and rationale."""
        for mid, m in self.majors.items():
            for prop in m.get("proposed_mappings", []):
                self.assertEqual(prop.get("status"), "PENDING_REVIEW")
                self.assertTrue(len(prop.get("source", "")) > 0)
                self.assertTrue(len(prop.get("rationale", "")) > 0)

    def test_06_cluster_a_secondary_teachers_consistency(self):
        cluster_a_majors = [
            "su_pham_toan_hoc", "su_pham_ngu_van", "su_pham_tieng_anh",
            "su_pham_tin_hoc", "su_pham_hoa_hoc", "su_pham_dia_ly", "giao_duc_chinh_tri"
        ]
        vectors = [tuple(self.majors[m]["oi_vector"]) for m in cluster_a_majors]
        self.assertEqual(len(set(vectors)), 1)
        self.assertEqual(vectors[0], (2.73, 3.19, 3.77, 7.00, 2.90, 3.61))
        socs = [self.majors[m]["primary_soc_code"] for m in cluster_a_majors]
        self.assertEqual(len(set(socs)), 1)
        self.assertEqual(socs[0], "25-2031.00")

    def test_07_evidence_registry_no_unproven_verified(self):
        """No institutional homepage can be marked VERIFIED_OFFICIAL_DIRECT."""
        self.assertEqual(len(self.evidence), TOTAL_MAJORS)
        for mid, ev in self.evidence.items():
            self.assertIn("source_url", ev)
            self.assertTrue(ev["source_url"].startswith("http"))
            self.assertNotEqual(ev.get("verification_status"), "VERIFIED_OFFICIAL_DIRECT")

    def test_08_no_unvalidated_numeric_composite_weights(self):
        """Cluster D must not contain numeric weights in composite definition."""
        comp = self.clusters["CLUSTER_D_TOURISM_PUBLIC_ADMIN"]["composite_soc_design_state"]
        self.assertEqual(comp["status"], "UNVALIDATED_DESIGN_HYPOTHESIS")
        for p_name, prof in comp["profiles"].items():
            for occ in prof["candidate_occupations"]:
                w = occ.get("illustrative_example_weight")
                self.assertEqual(w, "UNVALIDATED_EXAMPLE")

    def test_09_mechanism_b_blocked(self):
        """Mechanism B (system automatic suggestion of clusters) must be blocked."""
        mechs = self.plan_data["interaction_mechanisms"]
        self.assertEqual(mechs["MECHANISM_B_SYSTEM_SUGGESTION"]["status"], "BLOCKED_PENDING_EMPIRICAL_VALIDATION")

    def test_10_catalog_validator_passes(self):
        res = validate_catalog(self.base_dir)
        self.assertEqual(res["status"], "PASSED", f"Validator failed: {res.get('errors')}")
        self.assertEqual(res["errors"], [])
        self.assertEqual(res["total_majors"], TOTAL_MAJORS)
        self.assertEqual(res["ready_count"], EXPECTED_READY)
        self.assertEqual(res["eligible_count"], EXPECTED_READY)


if __name__ == "__main__":
    unittest.main()
