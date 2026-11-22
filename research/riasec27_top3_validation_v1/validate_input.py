"""Strict, value-minimizing validation. Unknown fields and identifiers are not echoed."""
from collections import Counter
import json
from pathlib import Path
import re

try:
    from .contracts import DEMO_STATUS
except ImportError:
    from contracts import DEMO_STATUS

UUID4 = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\Z")


def load_document(path):
    path = Path(path)
    if path.suffix.lower() != ".json":
        raise ValueError("INPUT_MUST_BE_JSON")
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("DUPLICATE_JSON_KEY")
            result[key] = value
        return result
    def nonfinite(_):
        raise ValueError("NONFINITE_JSON_NUMBER")
    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=pairs, parse_constant=nonfinite)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError("UNREADABLE_OR_INVALID_JSON") from None


def validate_record(record, contract):
    errors = []
    if not isinstance(record, dict):
        return {"valid": False, "errors": ["RECORD_MUST_BE_OBJECT"], "missing_labels": 21, "participant_id": None}
    if set(record) != {"participant_id", "answers", "major_interest_labels"}:
        errors.append("RECORD_FIELDS_MISMATCH")
    participant_id = record.get("participant_id")
    if not isinstance(participant_id, str) or not UUID4.fullmatch(participant_id):
        participant_id = None
        errors.append("PARTICIPANT_ID_MUST_BE_RANDOM_UUID4")
    answers = record.get("answers")
    if not isinstance(answers, dict) or set(answers) != set(contract["question_order"]):
        errors.append("ANSWER_KEYS_MISMATCH")
    elif any(type(answers[q]) is not int or not 1 <= answers[q] <= 5 for q in contract["question_order"]):
        errors.append("INVALID_LIKERT_VALUE")
    labels = record.get("major_interest_labels")
    if not isinstance(labels, dict):
        errors.append("LABELS_MUST_BE_OBJECT")
        missing = 21
    else:
        if set(labels) != set(contract["candidate_ids"]):
            errors.append("LABEL_KEYS_MISMATCH")
        missing = sum(labels.get(key) is None for key in contract["candidate_ids"])
        if any(value is not None and (type(value) is not int or not 0 <= value <= 3) for value in labels.values()):
            errors.append("INVALID_RELEVANCE_VALUE")
    return {"valid": not errors, "errors": errors, "participant_id": participant_id, "missing_labels": missing}


def validate_document(document, contract):
    if not isinstance(document, dict) or set(document) != {"schema_version", "data_kind", "records"}:
        raise ValueError("DOCUMENT_FIELDS_MISMATCH")
    if document["schema_version"] != "1.0.0" or document["data_kind"] != DEMO_STATUS:
        raise ValueError("ONLY_DECLARED_SYNTHETIC_DEMO_ALLOWED_IN_B12")
    if not isinstance(document["records"], list):
        raise ValueError("RECORDS_MUST_BE_ARRAY")
    validations = [validate_record(record, contract) for record in document["records"]]
    counts = Counter(v["participant_id"] for v in validations if v["participant_id"] is not None)
    for validation in validations:
        if validation["participant_id"] is not None and counts[validation["participant_id"]] > 1:
            validation["errors"].append("DUPLICATE_PARTICIPANT_ID")
            validation["valid"] = False
    return validations
