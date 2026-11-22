"""Read the locked input/candidate contract; no training or ranking formulas."""
import hashlib
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
RESEARCH = HERE.parent
DEMO_STATUS = "SYNTHETIC_DEMO_ONLY — NOT_SCIENTIFIC_VALIDATION"
RESEARCH_STATUS = "RESEARCH_ONLY — TOP3_NOT_VALIDATED"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def native_module(alias, path):
    spec = importlib.util.spec_from_file_location(alias, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_contract():
    config_path = RESEARCH / "riasec27_ml_top3_v0/ranking_config.json"
    config = read_json(config_path)
    reference_path = RESEARCH / "riasec27_top3_b1_v0/reference.json"
    reference = read_json(reference_path)
    catalog = read_json(RESEARCH / "riasec27_major_catalog_v1/majors_registry.json")
    manifest_path = RESEARCH / "riasec27_q5_models_v1/models_manifest.json"
    manifest = read_json(manifest_path)
    if (config_path.parent / config["reference_catalog"]["relative_path"]).resolve() != reference_path.resolve():
        raise ValueError("REFERENCE_PATH_MISMATCH")
    if sha256(reference_path) != config["reference_catalog"]["expected_sha256"]:
        raise ValueError("REFERENCE_HASH_MISMATCH")
    if sha256(manifest_path) != config["model_dependencies"]["expected_manifest_sha256"]:
        raise ValueError("MANIFEST_HASH_MISMATCH")
    ready = [m for m in reference["majors"] if m["status"] == "READY_FOR_PROTOTYPE"]
    a = {m["major_id"]: (m["soc_code"], m["oi_vector"]) for m in ready}
    b = {m["major_id"]: (m["primary_soc_code"], m["oi_vector"]) for m in catalog["majors"]
         if m["status"] == "READY_FOR_PROTOTYPE" and m["automatic_ranking_eligibility"]}
    if len(a) != 21 or a != b:
        raise ValueError("CANDIDATE_SCOPE_MISMATCH")
    order = tuple(config["input_specification"]["question_order"])
    if len(order) != 27 or list(order) != manifest["data_provenance"]["feature_order_27"]:
        raise ValueError("FEATURE_ORDER_MISMATCH")
    return {"question_order": order, "candidate_ids": tuple(a), "reference": reference,
            "config": config, "config_path": config_path,
            "source_sha256": {str(p.relative_to(RESEARCH)): sha256(p) for p in
                              [config_path, reference_path, manifest_path,
                               RESEARCH / "riasec27_major_catalog_v1/majors_registry.json"]}}
