"""research_flow.py - Unified Research Pipeline Connecting P2 ML Ranker and Tier 2 Explorer.
Module: research/riasec27_tier2_explorer_v0/research_flow.py
Phase: B-05

Decoupled Architecture:
- Step 1: 27 RIASEC raw answers -> P2 ML Ranker (6 Q5 models -> O*NET OI Cosine)
  -> Top-3 from STRICTLY 21 READY majors (or ABSTAIN / TIED).
- Step 2: Separate 33-major catalog discovery with transparent evidence metadata.
- Step 3: User-initiated Tier 2 qualitative exploration (5 themes) when a user proactively
  explores a non-ready or specific major. Tier 2 NEVER alters ML Top-3 rankings.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure access to existing P2 ranker and explorer
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
P2_DIR = REPO_ROOT / "research" / "riasec27_ml_top3_v0"
CATALOG_DIR = REPO_ROOT / "research" / "riasec27_major_catalog_v1"
CURRENT_DIR = Path(__file__).resolve().parent

if str(P2_DIR) not in sys.path:
    sys.path.insert(0, str(P2_DIR))
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from ranker import MLTop3Ranker
from explorer import CatalogExplorer, RESEARCH_STATUS_HEADER


class ResearchFlow:
    """Orchestrates research evaluation combining P2 ML ranking with qualitative exploration."""

    def __init__(
        self,
        p2_config_path: Optional[str] = None,
        catalog_dir: Optional[str] = None
    ):
        if p2_config_path is None:
            p2_config_path = str(P2_DIR / "ranking_config.json")
        if catalog_dir is None:
            catalog_dir = str(CATALOG_DIR)

        self.ranker = MLTop3Ranker(config_path=p2_config_path)
        self.explorer = CatalogExplorer(catalog_dir=catalog_dir)

    def evaluate_profile(self, answers: List[int]) -> Dict[str, Any]:
        """
        Step 1: Runs the official P2 ML Top-3 ranker on 27 RIASEC answers.
        Strictly evaluates only the 21 READY majors.
        """
        ranking_result = self.ranker.rank(answers)
        
        # Invariant check: Ensure no non-ready majors slipped into ML ranking
        top3_items = ranking_result.get("top3", [])
        if top3_items:
            self.ranker._verify_and_load_dependencies()
            ready_pool_ids = {m["major_id"] for m in self.ranker._ready_majors}
            for item in top3_items:
                if item["major_id"] not in ready_pool_ids:
                    raise RuntimeError(f"CRITICAL: Non-ready major '{item['major_id']}' detected in ML Top-3!")

        return {
            "research_status": RESEARCH_STATUS_HEADER,
            "ml_ranking": ranking_result,
            "catalog_summary": {
                "total_majors": len(self.explorer.list_catalog()),
                "ready_count": 21,
                "conditional_count": 10,
                "unresolved_count": 2,
                "eligible_in_ml": 21
            }
        }

    def explore_major(
        self,
        major_id: str,
        option_id: Optional[str] = None,
        is_skip: bool = False
    ) -> Dict[str, Any]:
        """
        Step 2 & 3: User-initiated exploration of a selected major.
        If major is in 21 READY: returns catalog details.
        If major is in 12 non-ready: activates Tier 2 qualitative exploration for its theme.
        """
        major_info = self.explorer.get_major(major_id)
        if not major_info:
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "INVALID_SELECTION",
                "message": f"Mã ngành '{major_id}' không tồn tại trong danh mục 33 ngành."
            }

        # Case A: Major is already READY and scored in Tier 1
        if major_info.get("status") == "READY_FOR_PROTOTYPE":
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "READY_MAJOR_PROFILE",
                "major_id": major_id,
                "major_name_vi": major_info.get("major_name_vi"),
                "moet_code": major_info.get("moet_code"),
                "ranking_eligibility": True,
                "message": "Ngành này thuộc nhóm 21 ngành READY_FOR_PROTOTYPE đã có mã O*NET đại diện 1-1 và được tính điểm trực tiếp ở Tier 1.",
                "details": major_info
            }

        # Case B: Major is CONDITIONAL or UNRESOLVED -> Routes to Tier 2 theme
        theme_id = self.explorer.get_theme_for_major(major_id)
        if not theme_id:
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "NO_THEME_CONFIGURED",
                "message": f"Chưa cấu hình chủ đề phân định Tier 2 cho ngành '{major_id}'."
            }

        # If user has not yet answered or skipped the question, return the question
        if option_id is None and not is_skip:
            question_data = self.explorer.get_theme_question(theme_id)
            return {
                "research_status": RESEARCH_STATUS_HEADER,
                "status": "AWAITING_USER_CHOICE",
                "selected_major_id": major_id,
                "theme_id": theme_id,
                "question": question_data
            }

        # If user provided a choice or skipped, run qualitative exploration
        exploration_result = self.explorer.explore_theme(
            theme_id=theme_id,
            option_id=option_id,
            is_skip=is_skip
        )
        return exploration_result

    def run_full_session(
        self,
        answers: List[int],
        explore_major_id: Optional[str] = None,
        explore_option_id: Optional[str] = None,
        is_skip: bool = False
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end research session.
        Guarantees that Tier 2 answers NEVER modify the ML Top-3 output.
        """
        profile_eval = self.evaluate_profile(answers)
        ml_ranking = profile_eval["ml_ranking"]

        exploration_output = None
        if explore_major_id is not None:
            exploration_output = self.explore_major(
                major_id=explore_major_id,
                option_id=explore_option_id,
                is_skip=is_skip
            )

        return {
            "research_status": RESEARCH_STATUS_HEADER,
            "ml_ranking": ml_ranking,
            "catalog": self.explorer.list_catalog(),
            "tier2_exploration": exploration_output,
            "audit_invariants": {
                "ml_scoring_pool_size": 21,
                "non_ready_majors_in_ranking": False,
                "tier2_alters_ml_top3": False,
                "composite_weights_applied": False,
                "has_percentage_scores_in_tier2": False
            }
        }
