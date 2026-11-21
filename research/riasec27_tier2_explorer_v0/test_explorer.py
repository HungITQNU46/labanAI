"""test_explorer.py - Unit tests for Catalog Discovery and Qualitative Tier 2 Explorer.
Module: research/riasec27_tier2_explorer_v0/test_explorer.py
Phase: B-05
"""

from __future__ import annotations

import json
import unittest
from pathlib import Path

from explorer import CatalogExplorer, THEMES_CONFIG, RESEARCH_STATUS_HEADER


class TestCatalogExplorer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.explorer = CatalogExplorer()

    def test_01_catalog_completeness_and_transparency(self):
        catalog = self.explorer.list_catalog()
        self.assertEqual(len(catalog), 33)

        statuses = [m["status"] for m in catalog]
        self.assertEqual(statuses.count("READY_FOR_PROTOTYPE"), 21)
        self.assertEqual(statuses.count("CONDITIONAL"), 10)
        self.assertEqual(statuses.count("UNRESOLVED"), 2)

        # Strict eligibility verification
        eligible = [m for m in catalog if m["automatic_ranking_eligibility"]]
        ineligible = [m for m in catalog if not m["automatic_ranking_eligibility"]]
        self.assertEqual(len(eligible), 21)
        self.assertEqual(len(ineligible), 12)

        # Transparency checks
        for m in catalog:
            self.assertIn("scientific_disclaimer", m)
            self.assertIn("evidence_completeness", m)
            self.assertIn("reference_occupation", m)
            # Ensure proposed mappings are quarantined as PENDING_REVIEW
            for prop in m.get("proposed_mappings", []):
                self.assertEqual(prop.get("status"), "PENDING_REVIEW")

    def test_02_five_exploration_themes_partition(self):
        themes = self.explorer.list_themes()
        self.assertEqual(len(themes), 5)
        theme_ids = {t["theme_id"] for t in themes}
        expected_themes = {
            "THEME_A_SECONDARY_PEDAGOGY",
            "THEME_B_IT_AND_SOFTWARE",
            "THEME_C_REGIONAL_AND_CULTURE",
            "THEME_D_TOURISM_AND_HOSPITALITY",
            "THEME_E_PUBLIC_ADMINISTRATION"
        }
        self.assertEqual(theme_ids, expected_themes)

        # Theme D and Theme E must be completely independent (not merged)
        self.assertEqual(THEMES_CONFIG["THEME_D_TOURISM_AND_HOSPITALITY"]["member_majors"], ["quan_ly_du_lich_lu_hanh"])
        self.assertEqual(THEMES_CONFIG["THEME_E_PUBLIC_ADMINISTRATION"]["member_majors"], ["quan_ly_nha_nuoc"])

    def test_03_theme_questions_structure_and_neutrality(self):
        for t_id, cfg in THEMES_CONFIG.items():
            q_data = self.explorer.get_theme_question(t_id)
            self.assertIsNotNone(q_data)
            self.assertEqual(q_data["research_status"], RESEARCH_STATUS_HEADER)
            self.assertTrue(len(q_data["text"]) > 0)
            self.assertTrue(len(q_data["target_audience"]) > 0)
            self.assertTrue(len(q_data["options"]) >= 3)
            self.assertTrue(q_data["can_skip"])
            self.assertIn("bias_warning", q_data)

            # Must have an "uncertain" option
            options = q_data["options"]
            uncertain_opts = [opt for opt in options if "Chưa rõ" in opt["text"]]
            self.assertTrue(len(uncertain_opts) >= 1, f"Theme {t_id} missing 'Chưa rõ' option")

    def test_04_skip_behavior_does_not_select_major(self):
        for t_id in THEMES_CONFIG.keys():
            res = self.explorer.explore_theme(theme_id=t_id, is_skip=True)
            self.assertEqual(res["status"], "USER_SKIPPED")
            self.assertEqual(res["research_status"], RESEARCH_STATUS_HEADER)
            self.assertIn("overview_comparison", res)
            self.assertIn("evidence_limitation", res)
            # Crucial: No major was auto-selected
            self.assertNotIn("explored_major", res)
            self.assertNotIn("score", res)
            self.assertNotIn("fit_percentage", res)

    def test_05_uncertain_option_behavior(self):
        res = self.explorer.explore_theme(
            theme_id="THEME_A_SECONDARY_PEDAGOGY",
            option_id="OPT_A_UNCERTAIN"
        )
        self.assertEqual(res["status"], "QUALITATIVE_EXPLORATION")
        self.assertEqual(res["research_status"], RESEARCH_STATUS_HEADER)
        self.assertIn("Chưa xác định", res["focus_summary"])
        self.assertIn("all_options_summary", res)
        self.assertNotIn("explored_major", res)
        self.assertNotIn("score", res)
        self.assertNotIn("fit_percentage", res)

    def test_06_specific_option_selection_qualitative_only(self):
        res = self.explorer.explore_theme(
            theme_id="THEME_B_IT_AND_SOFTWARE",
            option_id="OPT_B_SOFTWARE_DEV"
        )
        self.assertEqual(res["status"], "QUALITATIVE_EXPLORATION")
        self.assertEqual(res["research_status"], RESEARCH_STATUS_HEADER)
        self.assertIn("explored_major", res)
        self.assertEqual(res["explored_major"]["major_id"], "ky_thuat_phan_mem")
        self.assertIn("learning_orientation", res)
        self.assertIn("comparative_analysis", res)
        self.assertIn("neighboring_options", res)

        # Absolute check: NO numeric scores, pseudo-probabilities, or percent fit
        for banned in ["score", "percentage", "probability", "fit_score", "rank"]:
            self.assertNotIn(banned, res)

    def test_07_invalid_selections_rejected(self):
        res_bad_theme = self.explorer.explore_theme(theme_id="THEME_NON_EXISTENT")
        self.assertEqual(res_bad_theme["status"], "INVALID_SELECTION")

        res_bad_option = self.explorer.explore_theme(
            theme_id="THEME_A_SECONDARY_PEDAGOGY",
            option_id="OPT_FAKE_INVALID"
        )
        self.assertEqual(res_bad_option["status"], "INVALID_SELECTION")

    def test_08_no_unvalidated_composite_weights(self):
        for t_id in ["THEME_D_TOURISM_AND_HOSPITALITY", "THEME_E_PUBLIC_ADMINISTRATION"]:
            cfg = THEMES_CONFIG[t_id]
            q_text = json.dumps(cfg, ensure_ascii=False)
            self.assertNotIn("40%", q_text)
            self.assertNotIn("35%", q_text)
            self.assertNotIn("25%", q_text)
            self.assertNotIn("50%", q_text)


if __name__ == "__main__":
    unittest.main()
