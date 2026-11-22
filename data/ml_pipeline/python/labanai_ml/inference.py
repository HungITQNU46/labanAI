"""Deterministic, JSON-oriented inference and recommendation contracts."""

from __future__ import annotations

import re
import json
from hashlib import sha256
from pathlib import Path
from math import isfinite, sqrt
from typing import Any, Iterable, Mapping

from .data_contract import EXPECTED_QUESTION_COUNT


RIASEC_KEYS = ("R", "I", "A", "S", "E", "C")
PLACEHOLDER_METADATA = {"", "pending", "todo", "tbd", "unknown", "none", "null"}
F54_FEATURE_ORDER = [f"q{number}" for number in range(1, 55)]
F54_MODEL_VERSION = "f54-centroid-full1000-v1"
F54_ARTIFACT_FILENAME = "f54_centroid_full1000_v1.json"
F54_MANIFEST_FILENAME = "f54_centroid_full1000_v1.manifest.json"
F54_ARTIFACT_FIELDS = {
    "model_version", "dataset_version", "dataset_sha256", "mapping_version", "mapping_status",
    "owner_confirmation_status", "independent_verification_status", "task", "feature_set",
    "feature_count", "feature_order", "feature_schema", "model", "training_configuration",
    "evaluation_metrics", "reference_sha256", "limitations",
}


class InferenceContractError(ValueError):
    """Raised when a caller violates the versioned inference contract."""


def _validate_riasec_vector(values: Any, field_name: str) -> dict[str, float]:
    if not isinstance(values, Mapping) or set(values) != set(RIASEC_KEYS):
        raise InferenceContractError(f"{field_name} must include exactly R, I, A, S, E and C")

    normalized: dict[str, float] = {}
    for key in RIASEC_KEYS:
        value = values[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise InferenceContractError(f"{field_name} values must be finite numbers from 0 through 1")
        try:
            number = float(value)
        except (OverflowError, ValueError) as error:
            raise InferenceContractError(
                f"{field_name} values must be finite numbers from 0 through 1"
            ) from error
        if not isfinite(number) or not 0.0 <= number <= 1.0:
            raise InferenceContractError(f"{field_name} values must be finite numbers from 0 through 1")
        normalized[key] = number
    return normalized


def _require_concrete_metadata(artifact: Mapping[str, Any], field_name: str) -> str:
    value = artifact.get(field_name)
    if not isinstance(value, str):
        raise InferenceContractError(f"Artifact {field_name} must be a concrete string")
    normalized = value.strip()
    if normalized.casefold() in PLACEHOLDER_METADATA:
        raise InferenceContractError(f"Artifact {field_name} cannot be a placeholder")
    return normalized


def validate_feature_input(payload: Mapping[str, Any]) -> dict[str, float]:
    """Accept an already approved six-dimensional profile, never score raw answers."""
    if "answers" in payload:
        raise InferenceContractError(
            "Raw 54-answer RIASEC scoring is disabled until the item-level codebook is approved"
        )
    elif "riasec_norm01" in payload:
        return _validate_riasec_vector(payload["riasec_norm01"], "riasec_norm01")
    else:
        raise InferenceContractError("Payload must contain answers or riasec_norm01")


def cosine_compatibility(left: Mapping[str, float], right: Mapping[str, float]) -> float:
    """Return a bounded descriptive compatibility score, not a probability."""
    left_values = _validate_riasec_vector(left, "left RIASEC profile")
    right_values = _validate_riasec_vector(right, "right RIASEC profile")
    numerator = sum(left_values[key] * right_values[key] for key in RIASEC_KEYS)
    left_norm = sqrt(sum(left_values[key] ** 2 for key in RIASEC_KEYS))
    right_norm = sqrt(sum(right_values[key] ** 2 for key in RIASEC_KEYS))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return max(0.0, min(100.0, 100.0 * numerator / (left_norm * right_norm)))


def rank_major_profiles(
    riasec_input: Mapping[str, Any], profiles: Iterable[Mapping[str, Any]], top_n: int = 5
) -> list[dict[str, Any]]:
    """Rank supplied profiles deterministically without claiming career-outcome validity."""
    if top_n < 1:
        raise InferenceContractError("top_n must be positive")
    query = validate_feature_input(riasec_input)
    ranked: list[dict[str, Any]] = []
    for profile in profiles:
        required = {"major_code", "major_name", "family_code", "riasec_norm01", "n_real_train", "reliability"}
        if not required.issubset(profile):
            raise InferenceContractError("A major profile is missing required contract fields")
        fit_score = cosine_compatibility(query, profile["riasec_norm01"])
        ranked.append(
            {
                "major_code": str(profile["major_code"]),
                "major_name": str(profile["major_name"]),
                "family_code": str(profile["family_code"]),
                "family_score": profile.get("family_score"),
                "compat_score": round(fit_score, 6),
                "fitScore": round(fit_score, 6),
                "n_real_train": int(profile["n_real_train"]),
                "reliability": profile["reliability"],
                "limitations": "Descriptive RIASEC compatibility; not a probability or validated career outcome.",
            }
        )
    return sorted(ranked, key=lambda item: (-item["fitScore"], item["major_code"]))[:top_n]


def validate_model_artifact(artifact: Mapping[str, Any]) -> None:
    """Validate the minimum metadata required before deterministic inference."""
    required = {
        "model_version",
        "dataset_version",
        "mapping_version",
        "task",
        "feature_set",
        "feature_count",
        "feature_order",
        "sha256",
    }
    if not required.issubset(artifact):
        raise InferenceContractError("Model artifact is missing required version or contract fields")

    for field_name in ("model_version", "dataset_version", "mapping_version", "task"):
        _require_concrete_metadata(artifact, field_name)

    feature_set = artifact["feature_set"]
    if not isinstance(feature_set, str) or feature_set not in {"F6", "F6c", "F54"}:
        raise InferenceContractError("Unsupported feature set")
    feature_count = artifact["feature_count"]
    if isinstance(feature_count, bool) or not isinstance(feature_count, int) or feature_count < 1:
        raise InferenceContractError("feature_count must be a positive integer")
    feature_order = artifact["feature_order"]
    if (
        not isinstance(feature_order, (list, tuple))
        or len(feature_order) != feature_count
        or any(not isinstance(name, str) or not name.strip() or name != name.strip() for name in feature_order)
        or len(set(feature_order)) != len(feature_order)
    ):
        raise InferenceContractError("feature_order must contain unique names matching feature_count")
    if feature_set == "F6" and feature_count != len(RIASEC_KEYS):
        raise InferenceContractError("F6 artifacts must declare six features")
    if feature_set == "F54" and feature_count != EXPECTED_QUESTION_COUNT:
        raise InferenceContractError("F54 artifacts must declare 54 features")

    digest = artifact["sha256"]
    if not isinstance(digest, str) or re.fullmatch(r"[0-9a-fA-F]{64}", digest) is None:
        raise InferenceContractError("sha256 must be a 64-character hexadecimal digest")


def validate_f54_input(payload: Any) -> tuple[tuple[int, ...], int]:
    """Require an explicitly identified F54 instrument; never accept Holland-60."""
    if not isinstance(payload, Mapping) or set(payload) - {"feature_set", "answers", "top_k"}:
        raise InferenceContractError("Expected only feature_set, answers and optional top_k")
    if payload.get("feature_set") != "F54":
        raise InferenceContractError("feature_set must explicitly equal F54")
    answers = payload.get("answers")
    if not isinstance(answers, (list, tuple)) or len(answers) != 54:
        raise InferenceContractError("Exactly 54 ordered F54 answers are required; Holland-60 has no crosswalk")
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not 1 <= v <= 5 or int(v) != v for v in answers):
        raise InferenceContractError("Each F54 answer must be an integer from 1 through 5")
    top_k = payload.get("top_k", 5)
    if isinstance(top_k, bool) or not isinstance(top_k, int) or not 1 <= top_k <= 33:
        raise InferenceContractError("top_k must be an integer from 1 through 33")
    return tuple(int(value) for value in answers), top_k


def validate_f54_artifact(artifact: Mapping[str, Any], digest: str) -> None:
    """Check the portable model contract in addition to its external file hash."""
    from .data_contract import DATASET_SHA256, DATASET_VERSION

    if not isinstance(artifact, Mapping) or set(artifact) != F54_ARTIFACT_FIELDS:
        raise InferenceContractError("F54 artifact fields must match the aggregate-only allowlist")
    validate_model_artifact({**artifact, "sha256": digest})
    if (
        artifact.get("model_version") != F54_MODEL_VERSION
        or artifact.get("dataset_version") != DATASET_VERSION
        or artifact.get("dataset_sha256") != DATASET_SHA256
        or artifact.get("feature_set") != "F54"
        or artifact.get("feature_order") != F54_FEATURE_ORDER
        or artifact.get("task") != "current_major_retrieval"
        or artifact.get("mapping_status") != "PROPOSED"
        or artifact.get("mapping_version") != "0.1.0-proposed"
        or artifact.get("owner_confirmation_status") != "OWNER_CONFIRMED_REAL"
        or artifact.get("independent_verification_status") != "NOT_YET_INDEPENDENTLY_VERIFIED"
        or artifact.get("feature_schema") != {"type": "integer", "minimum": 1, "maximum": 5, "count": 54}
    ):
        raise InferenceContractError("F54 artifact metadata differs from the versioned contract")
    model = artifact.get("model", {})
    if not isinstance(model, Mapping) or set(model) != {"type", "tau", "profiles"} or model.get("type") != "centroid_cosine" or model.get("tau") != 10.0:
        raise InferenceContractError("Only the previously selected centroid model is supported")
    profiles = model.get("profiles")
    if not isinstance(profiles, list) or len(profiles) != 33:
        raise InferenceContractError("The artifact must contain 33 aggregate major profiles")
    codes = []
    for profile in profiles:
        if not isinstance(profile, Mapping) or set(profile) != {"major_code", "major_name", "n_train", "centroid"}:
            raise InferenceContractError("Profile fields must contain only aggregate model parameters")
        if any(not isinstance(profile[k], str) or not profile[k].strip() for k in ("major_code", "major_name")):
            raise InferenceContractError("Profile labels must be concrete strings")
        support = profile["n_train"]
        values = profile["centroid"]
        if isinstance(support, bool) or not isinstance(support, int) or support < 5:
            raise InferenceContractError("Aggregate profiles require at least five training records")
        if not isinstance(values, list) or len(values) != 54 or any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v) or not 1 <= v <= 5
            for v in values
        ):
            raise InferenceContractError("Centroid parameters must be 54 finite means in the Likert domain")
        codes.append(profile["major_code"])
    if codes != sorted(set(codes)) or sum(p["n_train"] for p in profiles) != 1000:
        raise InferenceContractError("Profile labels or aggregate support are inconsistent")
    configuration = artifact["training_configuration"]
    if not isinstance(configuration, Mapping) or any(configuration.get(key) != value for key, value in {
        "fit_record_count": 1000, "fit_scope": "FULL_DATA_AFTER_INNER_CV_SELECTION",
        "preprocessing": "RAW_LIKERT_NO_SCALER", "seed": 20261019,
        "selected_ranking_config": 'centroid_cosine:{"tau":10.0}',
        "selection_source": "EXISTING_FULL_DATA_INNER_GROUP_CV",
        "cv_rerun": False, "test_reevaluated": False,
    }.items()):
        raise InferenceContractError("F54 training configuration differs from the recorded selection")
    metrics = artifact["evaluation_metrics"]
    if not isinstance(metrics, Mapping) or any(
        isinstance(metrics.get(key), bool) or not isinstance(metrics.get(key), (int, float))
        or not 0 <= metrics[key] <= 1
        for key in ("selected_procedure_nested_oof_hit_at_3", "centroid_method_nested_oof_hit_at_3")
    ) or metrics.get("kpi_threshold") != 0.8 or metrics.get("kpi_threshold_met") is not False or metrics.get("full_data_fit_has_independent_test") is not False:
        raise InferenceContractError("F54 evaluation metadata must retain the recorded research limitations")


def load_f54_artifact(directory: Path) -> dict[str, Any]:
    """Load JSON only, after verifying the separate SHA-256 manifest."""
    try:
        contents = (directory / F54_ARTIFACT_FILENAME).read_bytes()
        manifest = json.loads((directory / F54_MANIFEST_FILENAME).read_text(encoding="utf-8"))
        digest = sha256(contents).hexdigest()
        if manifest.get("model_version") != F54_MODEL_VERSION or manifest.get("files") != {F54_ARTIFACT_FILENAME: digest}:
            raise InferenceContractError("F54 artifact SHA-256 manifest verification failed")
        artifact = json.loads(contents)
        validate_f54_artifact(artifact, digest)
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as error:
        raise InferenceContractError("Verified F54 artifact is unavailable or invalid") from error
    return artifact


def rank_f54(artifact: Mapping[str, Any], payload: Any) -> dict[str, Any]:
    """Score aggregate centroids with the same raw-Likert cosine used in training."""
    answers, top_k = validate_f54_input(payload)
    norm = sqrt(sum(value * value for value in answers))
    ranked = []
    for profile in artifact["model"]["profiles"]:
        centroid = profile["centroid"]
        similarity = sum(a * b for a, b in zip(answers, centroid)) / (
            norm * sqrt(sum(value * value for value in centroid))
        )
        ranked.append({
            "major_code": profile["major_code"], "major_name": profile["major_name"],
            "similarity_score": max(0.0, min(100.0, similarity * 100.0)),
            "n_train": profile["n_train"],
        })
    ranked.sort(key=lambda entry: (-entry["similarity_score"], entry["major_code"]))
    # Sort on full precision before rounding; label codes break exact-score ties.
    for entry in ranked:
        entry["similarity_score"] = round(entry["similarity_score"], 6)
    return {
        "model_version": artifact["model_version"], "dataset_version": artifact["dataset_version"],
        "feature_set": "F54", "task": "current_major_retrieval", "research_only": True,
        "score_type": "cosine_similarity_0_100", "recommendations": ranked[:top_k],
        "notice": "Điểm tương đồng phản hồi F54 không phải xác suất thành công, trúng tuyển hay mức phù hợp nghề nghiệp đã được kiểm chứng.",
    }
