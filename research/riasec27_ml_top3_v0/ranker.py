"""
LabanAI - Direction B: ML Top-3 Research Ranker (Phase B-03-R2)
Module: ranker.py

Architecture:
  27 raw RIASEC responses (1-5)
  -> Input Validation & Key Ordering (CODEBOOK_33)
  -> Flat Profile Guard (Variance of 6 Domain Means < 1e-12 -> ABSTAIN_FLAT_PROFILE)
  -> 6 Locked ML Classifiers (predict_proba)
  -> P2 Fixed Z-Score Standardization (derived from Full Train OOF)
  -> Pearson Correlation with O*NET OI Vectors (21 READY_FOR_PROTOTYPE majors)
  -> Strict Boundary Tie Check (32 * ulp(1.0) tolerance; no arbitrary ID tie-break)
  -> Output Top-3 or Abstention with RESEARCH_ONLY status.

Status of this module: RESEARCH_ONLY — TOP3_NOT_VALIDATED.
Not for production or website deployment.
"""

import hashlib
import json
import math
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd

DEFAULT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "ranking_config.json")
NUMERICAL_SCORE_TOLERANCE = 32 * math.ulp(1.0)


def sha256_file(path: Union[str, Path]) -> str:
    """Calculate SHA-256 checksum of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class MLTop3Ranker:
    """
    Research implementation of Direction B (P2) ML-based major ranker.
    """

    def __init__(self, config_path: Optional[str] = None):
        self.config_path = Path(config_path or DEFAULT_CONFIG_PATH).resolve()
        if not self.config_path.is_file():
            raise FileNotFoundError(f"Configuration file not found: {self.config_path}")

        with open(self.config_path, "r", encoding="utf-8") as f:
            self.config = json.load(f)

        self.base_dir = self.config_path.parent
        self.question_order = self.config["input_specification"]["question_order"]
        self.domain_order = self.config["input_specification"]["domain_order"]
        self.domain_indices = self.config["input_specification"]["domain_question_indices"]
        self.flat_guard_config = self.config.get("flat_profile_guard", {})
        self.variance_threshold = self.flat_guard_config.get("variance_threshold", 1e-12)

        self.mu_params = {d: self.config["standardization_parameters"]["parameters"][d]["mean"] for d in self.domain_order}
        self.sig_params = {d: self.config["standardization_parameters"]["parameters"][d]["std"] for d in self.domain_order}

        self._models = None
        self._reference_data = None
        self._ready_majors = None

    def _verify_and_load_dependencies(self):
        """Verifies integrity and loads the 6 ML artifacts and reference catalog."""
        if self._models is not None and self._ready_majors is not None:
            return

        # 1. Reference catalog
        ref_rel = self.config["reference_catalog"]["relative_path"]
        ref_path = (self.base_dir / ref_rel).resolve()
        if not ref_path.is_file():
            raise FileNotFoundError(f"Reference catalog not found: {ref_path}")

        expected_ref_sha = self.config["reference_catalog"]["expected_sha256"]
        actual_ref_sha = sha256_file(ref_path)
        if actual_ref_sha != expected_ref_sha:
            raise ValueError(f"Reference catalog checksum mismatch: expected {expected_ref_sha}, got {actual_ref_sha}")

        with open(ref_path, "r", encoding="utf-8") as f:
            self._reference_data = json.load(f)

        all_majors = self._reference_data.get("majors", [])
        self._ready_majors = [
            m for m in all_majors
            if m.get("status") == "READY_FOR_PROTOTYPE" and m.get("oi_vector") is not None
        ]
        if len(self._ready_majors) != self.config["reference_catalog"]["expected_ready_count"]:
            raise ValueError(
                f"Expected {self.config['reference_catalog']['expected_ready_count']} READY majors, found {len(self._ready_majors)}"
            )

        # 2. Manifest verification
        manifest_rel = self.config["model_dependencies"]["manifest_relative_path"]
        manifest_path = (self.base_dir / manifest_rel).resolve()
        if not manifest_path.is_file():
            raise FileNotFoundError(f"Models manifest not found: {manifest_path}")

        expected_manifest_sha = self.config["model_dependencies"]["expected_manifest_sha256"]
        actual_manifest_sha = sha256_file(manifest_path)
        if actual_manifest_sha != expected_manifest_sha:
            raise ValueError(f"Manifest checksum mismatch: expected {expected_manifest_sha}, got {actual_manifest_sha}")

        # 3. Model artifacts verification and loading
        models_dir_rel = self.config["model_dependencies"]["models_dir_relative_path"]
        models_dir = (self.base_dir / models_dir_rel).resolve()
        self._models = {}

        for domain in self.domain_order:
            artifact_info = self.config["model_dependencies"]["artifacts"][domain]
            art_file = models_dir / artifact_info["file"]
            if not art_file.is_file():
                raise FileNotFoundError(f"Artifact {art_file} not found.")

            actual_art_sha = sha256_file(art_file)
            if actual_art_sha != artifact_info["sha256"]:
                raise ValueError(
                    f"Checksum mismatch for {artifact_info['file']}: expected {artifact_info['sha256']}, got {actual_art_sha}"
                )
            self._models[domain] = joblib.load(art_file)

    def validate_and_order_answers(self, answers: Any) -> Tuple[List[int], Dict[str, int]]:
        """
        Validates input answers and returns them in strict CODEBOOK_33 order.
        Accepts:
          - dict: {"R1": 3, "I1": 4, ...}
          - list of 27 ints matching question_order exactly
          - list of dicts: [{"id": "R1", "value": 3}, ...]
        """
        if isinstance(answers, dict):
            answer_map = answers
        elif isinstance(answers, (list, tuple)):
            if len(answers) == 27 and all(isinstance(x, dict) and "id" in x and "value" in x for x in answers):
                answer_map = {x["id"]: x["value"] for x in answers}
            elif len(answers) == 27 and all(not isinstance(x, (bool, dict, list)) for x in answers):
                answer_map = {q: answers[i] for i, q in enumerate(self.question_order)}
            else:
                raise ValueError("List input must be either 27 values or 27 {'id', 'value'} objects.")
        else:
            raise TypeError("Answers must be a dict or a 27-element list.")

        ordered_values = []
        clean_map = {}
        for q in self.question_order:
            if q not in answer_map:
                raise ValueError(f"Missing required question: {q}")
            val = answer_map[q]
            if isinstance(val, bool) or not isinstance(val, (int, np.integer)):
                raise TypeError(f"Question {q} must be an integer, got {type(val).__name__} ({val!r}).")
            int_val = int(val)
            if not 1 <= int_val <= 5:
                raise ValueError(f"Question {q} value {int_val} is out of valid range [1, 5].")
            ordered_values.append(int_val)
            clean_map[q] = int_val

        return ordered_values, clean_map

    def compute_domain_means(self, ordered_values: List[int]) -> Dict[str, float]:
        """Calculates the 6 RIASEC domain means using exact interleaved indices."""
        means = {}
        for domain, indices in self.domain_indices.items():
            vals = [ordered_values[i] for i in indices]
            means[domain] = float(np.mean(vals))
        return means

    def rank(self, answers: Any) -> Dict[str, Any]:
        """
        Executes the full Direction B (P2) ranking pipeline.
        Returns a structured dictionary with research status and audit trail.
        """
        # 1. Validate inputs
        try:
            ordered_values, answer_map = self.validate_and_order_answers(answers)
        except (TypeError, ValueError) as err:
            return {
                "status": "INVALID_INPUT",
                "research_status": self.config["research_status"],
                "message": str(err),
                "domain_means": None,
                "domain_variance": None,
                "ml_probabilities": None,
                "standardized_vector": None,
                "top3": [],
                "tied_majors": [],
                "all_rankings": [],
                "metadata": {"error_type": type(err).__name__},
            }

        # 2. Compute 6 RIASEC domain means
        domain_means = self.compute_domain_means(ordered_values)
        mean_vector = [domain_means[d] for d in self.domain_order]
        domain_var = float(np.var(mean_vector))

        # 3. Flat Profile Guard (Exact rational equality across 6 domain means)
        # Denominators: R=5, I=4, A=5, S=4, E=5, C=4.
        # Mean equality: S_R/5 = S_I/4 = S_A/5 = S_S/4 = S_E/5 = S_C/4
        # <=> S_R == S_A == S_E and S_I == S_S == S_C and 4 * S_R == 5 * S_I
        s_r = sum(ordered_values[i] for i in self.domain_indices["R"])
        s_i = sum(ordered_values[i] for i in self.domain_indices["I"])
        s_a = sum(ordered_values[i] for i in self.domain_indices["A"])
        s_s = sum(ordered_values[i] for i in self.domain_indices["S"])
        s_e = sum(ordered_values[i] for i in self.domain_indices["E"])
        s_c = sum(ordered_values[i] for i in self.domain_indices["C"])
        is_flat_rational = (s_r == s_a == s_e) and (s_i == s_s == s_c) and (4 * s_r == 5 * s_i)
        is_flat = is_flat_rational or (domain_var < self.variance_threshold)

        if self.flat_guard_config.get("enabled", True) and is_flat:
            return {
                "status": "ABSTAIN_FLAT_PROFILE",
                "research_status": self.config["research_status"],
                "message": (
                    "Hồ sơ RIASEC phẳng (phương sai của 6 trung bình lĩnh vực xấp xỉ 0). "
                    "Không thể phân hóa sở thích nghề nghiệp; hủy xếp hạng để tránh ảo giác Top-3."
                ),
                "domain_means": domain_means,
                "domain_variance": round(domain_var, 8),
                "ml_probabilities": None,
                "standardized_vector": None,
                "top3": [],
                "tied_majors": [],
                "all_rankings": [],
                "metadata": {
                    "algorithm": "Direction B (P2 ML Ranker)",
                    "flat_profile_guard": "TRIGGERED",
                    "domain_variance": domain_var,
                },
            }

        # 4. Verify and load ML models and reference catalog
        try:
            self._verify_and_load_dependencies()
        except Exception as err:
            return {
                "status": "DEPENDENCY_ERROR",
                "research_status": self.config["research_status"],
                "message": f"Failed to verify or load required dependencies: {err}",
                "domain_means": domain_means,
                "domain_variance": round(domain_var, 8),
                "ml_probabilities": None,
                "standardized_vector": None,
                "top3": [],
                "tied_majors": [],
                "all_rankings": [],
                "metadata": {"error_type": type(err).__name__},
            }

        # 5. Predict probabilities with the 6 models
        input_df = pd.DataFrame([ordered_values], columns=self.question_order)
        ml_probs = {}
        for d in self.domain_order:
            model = self._models[d]
            prob = float(model.predict_proba(input_df)[0, 1])
            ml_probs[d] = prob

        # 6. Apply fixed P2 Z-Score Standardization
        std_vector = {}
        u_vector = []
        for d in self.domain_order:
            z = (ml_probs[d] - self.mu_params[d]) / self.sig_params[d]
            std_vector[d] = z
            u_vector.append(z)

        u_std = float(np.std(u_vector))
        if u_std < 1e-12:
            return {
                "status": "ABSTAIN_FLAT_PROFILE",
                "research_status": self.config["research_status"],
                "message": "Vector chuẩn hóa sau ML có phương sai xấp xỉ 0.",
                "domain_means": domain_means,
                "domain_variance": round(domain_var, 8),
                "ml_probabilities": ml_probs,
                "standardized_vector": std_vector,
                "top3": [],
                "tied_majors": [],
                "all_rankings": [],
                "metadata": {"algorithm": "Direction B (P2 ML Ranker)"},
            }

        # 7. Pearson correlation with 21 READY majors
        scored_candidates = []
        for major in self._ready_majors:
            v_vector = major["oi_vector"]
            # Compute Pearson correlation
            r = float(np.corrcoef(u_vector, v_vector)[0, 1])
            scored_candidates.append({
                "major_id": major["major_id"],
                "major_name_vi": major["major_name_vi"],
                "moet_code": major["moet_code"],
                "soc_code": major["soc_code"],
                "occupation_title_en": major.get("occupation_title_en"),
                "ih_code": major.get("ih_code"),
                "pearson_r": r,
                "onet_oi_vector": v_vector,
            })

        # 8. Sort descending by pearson_r
        scored_candidates.sort(key=lambda item: item["pearson_r"], reverse=True)

        # 9. Group candidates by numerical equality (ULP tolerance guard)
        score_groups = []
        for candidate in scored_candidates:
            if not score_groups or abs(score_groups[-1][0]["pearson_r"] - candidate["pearson_r"]) > NUMERICAL_SCORE_TOLERANCE:
                score_groups.append([])
            score_groups[-1].append(candidate)

        offset = 0
        for group in score_groups:
            for candidate in group:
                candidate["rank"] = offset + 1
            offset += len(group)

        # 10. Check boundary tie at rank 3
        r3 = scored_candidates[2]["pearson_r"]
        r4 = scored_candidates[3]["pearson_r"] if len(scored_candidates) > 3 else None
        boundary_group = next(group for group in score_groups if scored_candidates[2] in group)
        is_boundary_tied = boundary_group[0]["rank"] + len(boundary_group) - 1 > 3

        if is_boundary_tied:
            return {
                "status": "TIED_BOUNDARY",
                "research_status": self.config["research_status"],
                "message": "Ranh giới Top-3 đồng điểm hoặc không phân biệt được ở độ chính xác số học; không cắt nhóm tùy tiện.",
                "domain_means": domain_means,
                "domain_variance": round(domain_var, 8),
                "ml_probabilities": ml_probs,
                "standardized_vector": std_vector,
                "top3": [],
                "tied_majors": boundary_group,
                "all_rankings": scored_candidates,
                "metadata": {
                    "algorithm": "Direction B (P2 ML Ranker)",
                    "boundary_score": r3,
                    "boundary_tied_count": len(boundary_group),
                    "margin_rank3_rank4": r3 - r4 if r4 is not None else None,
                    "tolerance": NUMERICAL_SCORE_TOLERANCE,
                },
            }

        # 11. Clean SUCCESS
        top3 = scored_candidates[:3]
        return {
            "status": "SUCCESS",
            "research_status": self.config["research_status"],
            "message": "Top-3 được tính toán thành công bằng mô hình ML và chuẩn hóa P2; chưa xác nhận giá trị hướng nghiệp.",
            "domain_means": domain_means,
            "domain_variance": round(domain_var, 8),
            "ml_probabilities": ml_probs,
            "standardized_vector": std_vector,
            "top3": top3,
            "tied_majors": [],
            "all_rankings": scored_candidates,
            "metadata": {
                "algorithm": "Direction B (P2 ML Ranker)",
                "ready_majors_scored": len(self._ready_majors),
                "onet_version": "30.2",
                "standardization_population": self.config["standardization_parameters"]["reference_population"],
                "margin_rank3_rank4": r3 - r4 if r4 is not None else None,
            },
        }
