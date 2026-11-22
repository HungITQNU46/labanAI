"""Generate schema and predesigned demo records without importing/calling rankers."""
import json
import random
from uuid import UUID

try:
    from .contracts import HERE, DEMO_STATUS, load_contract
    from .validate_input import UUID4
except ImportError:
    from contracts import HERE, DEMO_STATUS, load_contract
    from validate_input import UUID4


def schema(contract):
    order, candidates = contract["question_order"], contract["candidate_ids"]
    return {"$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "B12 synthetic offline evaluation envelope",
            "description": DEMO_STATUS + "; self-reported interest labels, never objective suitability.",
            "type": "object", "additionalProperties": False,
            "required": ["schema_version", "data_kind", "records"],
            "properties": {"schema_version": {"const": "1.0.0"}, "data_kind": {"const": DEMO_STATUS},
                           "records": {"type": "array", "items": {"$ref": "#/$defs/record"}}},
            "$defs": {"record": {"type": "object", "additionalProperties": False,
                                  "required": ["participant_id", "answers", "major_interest_labels"],
                                  "properties": {
                                      "participant_id": {"type": "string", "pattern": "^"+UUID4.pattern.replace("\\Z", "$")},
                                      "answers": {"type": "object", "additionalProperties": False, "required": list(order),
                                                  "properties": {q: {"type": "integer", "minimum": 1, "maximum": 5} for q in order}},
                                      "major_interest_labels": {"type": "object", "additionalProperties": False,
                                                                "description": "Exactly 21 keys; use null for an unobserved/unknown label, never zero-fill.",
                                                                "required": list(candidates),
                                                                "properties": {key: {"type": ["integer", "null"], "minimum": 0, "maximum": 3} for key in candidates}}}}}}


def build_fixture(contract):
    answers_rng, labels_rng, id_rng = random.Random(42), random.Random(202612), random.Random(1212)
    records = []
    for _ in range(13):
        records.append({"participant_id": str(UUID(int=id_rng.getrandbits(128), version=4)),
                        "answers": {q: answers_rng.randint(1, 5) for q in contract["question_order"]},
                        "major_interest_labels": {key: labels_rng.randint(0, 3) for key in contract["candidate_ids"]}})
    keys = contract["candidate_ids"]
    records[2]["major_interest_labels"][keys[0]] = None
    records[3]["major_interest_labels"][keys[-1]] = None
    records[4]["major_interest_labels"] = dict.fromkeys(keys, 0)
    records[5]["answers"] = dict.fromkeys(contract["question_order"], 3)
    records[6]["major_interest_labels"][keys[0]] = -1
    records[7]["major_interest_labels"][keys[0]] = 4
    records[8]["major_interest_labels"].pop(keys[0])
    records[8]["major_interest_labels"]["OUTSIDE_READY_POOL"] = 2
    records[9]["answers"].pop("R1")
    records[10]["answers"]["R1"] = 6
    records[12]["major_interest_labels"] = dict.fromkeys(keys, 1)
    return {"schema_version": "1.0.0", "data_kind": DEMO_STATUS, "records": records}


if __name__ == "__main__":
    contract = load_contract()
    for filename, data in [("evaluation_schema.json", schema(contract)), ("synthetic_fixture.json", build_fixture(contract))]:
        (HERE / filename).write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(DEMO_STATUS)
