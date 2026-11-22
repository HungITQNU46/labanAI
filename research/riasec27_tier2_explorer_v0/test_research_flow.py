"""test_research_flow.py - Unit tests for End-to-End Research Flow.
Module: research/riasec27_tier2_explorer_v0/test_research_flow.py
Phase: B-05
"""

from __future__ import annotations

import unittest
from pathlib import Path

from research_flow import ResearchFlow, RESEARCH_STATUS_HEADER


class TestResearchFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.flow = ResearchFlow()

        # Differentiated profile favoring Investigative / Conventional (Computer Science / Software)
        # 27 items ordered by QUESTION_ORDER
        cls.differentiated_answers = [
            2, 5, 2, 2, 5, 2, 1, 1, 2, 2,
            1, 2, 2, 1, 2, 2, 5, 2, 2, 5,
            2, 2, 5, 2, 5, 5, 5
        ]

        # Flat profile (all 3s)
        cls.flat_answers = [3] * 27

    def test_01_valid_profile_yields_ready_top3(self):
        res = self.flow.evaluate_profile(self.differentiated_answers)
        self.assertEqual(res["research_status"], RESEARCH_STATUS_HEADER)
        ml = res["ml_ranking"]
        self.assertEqual(ml["status"], "SUCCESS")
        self.assertEqual(len(ml["top3"]), 3)

        # Invariant: Every major in top-3 must be in the 21 READY majors
        ready_ids = {m["major_id"] for m in self.flow.ranker._ready_majors}
        for item in ml["top3"]:
            self.assertIn(item["major_id"], ready_ids)

        # Check non-ready majors never appear
        non_ready_ids = {
            "su_pham_toan_hoc", "su_pham_ngu_van", "su_pham_tieng_anh",
            "su_pham_tin_hoc", "su_pham_hoa_hoc", "su_pham_dia_ly",
            "giao_duc_chinh_tri", "cong_nghe_thong_tin", "dong_phuong_hoc",
            "viet_nam_hoc", "quan_ly_du_lich_lu_hanh", "quan_ly_nha_nuoc"
        }
        for item in ml["top3"]:
            self.assertNotIn(item["major_id"], non_ready_ids)

    def test_02_flat_profile_abstention(self):
        res = self.flow.evaluate_profile(self.flat_answers)
        ml = res["ml_ranking"]
        self.assertEqual(ml["status"], "ABSTAIN_FLAT_PROFILE")
        self.assertEqual(ml["top3"], [])

    def test_03_explore_ready_major_gives_direct_profile(self):
        res = self.flow.explore_major("ky_thuat_phan_mem")
        self.assertEqual(res["research_status"], RESEARCH_STATUS_HEADER)
        self.assertEqual(res["status"], "READY_MAJOR_PROFILE")
        self.assertTrue(res["ranking_eligibility"])

    def test_04_explore_non_ready_major_opens_tier2_question(self):
        res = self.flow.explore_major("su_pham_toan_hoc")
        self.assertEqual(res["research_status"], RESEARCH_STATUS_HEADER)
        self.assertEqual(res["status"], "AWAITING_USER_CHOICE")
        self.assertEqual(res["theme_id"], "THEME_A_SECONDARY_PEDAGOGY")
        self.assertIn("question", res)
        self.assertTrue(len(res["question"]["options"]) >= 7)

    def test_05_tier2_exploration_does_not_alter_ml_top3(self):
        # 1. Baseline ML Top-3 without Tier 2
        base_res = self.flow.evaluate_profile(self.differentiated_answers)
        base_top3 = [it["major_id"] for it in base_res["ml_ranking"]["top3"]]

        # 2. Session with Tier 2 choice in Secondary Pedagogy
        session_choice = self.flow.run_full_session(
            answers=self.differentiated_answers,
            explore_major_id="su_pham_toan_hoc",
            explore_option_id="OPT_A_MATH"
        )
        choice_top3 = [it["major_id"] for it in session_choice["ml_ranking"]["top3"]]
        self.assertEqual(base_top3, choice_top3, "ML Top-3 must NOT be altered by Tier 2 choice")

        # Verify qualitative exploration payload
        t2 = session_choice["tier2_exploration"]
        self.assertEqual(t2["status"], "QUALITATIVE_EXPLORATION")
        self.assertEqual(t2["explored_major"]["major_id"], "su_pham_toan_hoc")
        self.assertFalse(t2["explored_major"]["ranking_eligibility"])

        # 3. Session with Tier 2 skip
        session_skip = self.flow.run_full_session(
            answers=self.differentiated_answers,
            explore_major_id="su_pham_ngu_van",
            is_skip=True
        )
        skip_top3 = [it["major_id"] for it in session_skip["ml_ranking"]["top3"]]
        self.assertEqual(base_top3, skip_top3, "ML Top-3 must NOT be altered by Tier 2 skip")
        self.assertEqual(session_skip["tier2_exploration"]["status"], "USER_SKIPPED")

    def test_06_audit_invariants_hold(self):
        session = self.flow.run_full_session(
            answers=self.differentiated_answers,
            explore_major_id="cong_nghe_thong_tin",
            explore_option_id="OPT_B_SYSTEM_INFRA"
        )
        inv = session["audit_invariants"]
        self.assertEqual(inv["ml_scoring_pool_size"], 21)
        self.assertFalse(inv["non_ready_majors_in_ranking"])
        self.assertFalse(inv["tier2_alters_ml_top3"])
        self.assertFalse(inv["composite_weights_applied"])
        self.assertFalse(inv["has_percentage_scores_in_tier2"])

    def test_07_deterministic_execution(self):
        run1 = self.flow.run_full_session(self.differentiated_answers, "dong_phuong_hoc", "OPT_C_ORIENTAL")
        run2 = self.flow.run_full_session(self.differentiated_answers, "dong_phuong_hoc", "OPT_C_ORIENTAL")
        
        self.assertEqual(
            [it["major_id"] for it in run1["ml_ranking"]["top3"]],
            [it["major_id"] for it in run2["ml_ranking"]["top3"]]
        )
        self.assertEqual(
            run1["tier2_exploration"]["chosen_option_id"],
            run2["tier2_exploration"]["chosen_option_id"]
        )

    def test_08_invalid_answers_raise_or_reject(self):
        res1 = self.flow.evaluate_profile([1, 2, 3])  # Too short
        self.assertEqual(res1["ml_ranking"]["status"], "INVALID_INPUT")

        res2 = self.flow.evaluate_profile([6] * 27)   # Out of bounds
        self.assertEqual(res2["ml_ranking"]["status"], "INVALID_INPUT")


if __name__ == "__main__":
    unittest.main()
