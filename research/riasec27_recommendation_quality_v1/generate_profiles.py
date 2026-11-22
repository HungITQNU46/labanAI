"""B-10: rule-based synthetic inputs; no workbook or participant data."""

from itertools import combinations
import random

RESEARCH_STATUS = "RESEARCH_ONLY — TOP3_NOT_VALIDATED"
SEED = 42
PERTURBATION_SEED = 20261121
FEATURE_ORDER_27 = (
    "R1", "I1", "A1", "R2", "I2", "A2", "S1", "S2", "R3",
    "A3", "S3", "E1", "R4", "S4", "E2", "R5", "I3", "A4",
    "E3", "I4", "A5", "E4", "C1", "E5", "C2", "C3", "C4",
)
DOMAINS = tuple("RIASEC")
DOMAIN_INDICES = {
    "R": [0, 3, 8, 12, 15], "I": [1, 4, 16, 19],
    "A": [2, 5, 9, 17, 20], "S": [6, 7, 10, 13],
    "E": [11, 14, 18, 21, 23], "C": [22, 24, 25, 26],
}


def validate_profile(answers):
    if (not isinstance(answers, list) or len(answers) != 27
            or any(type(x) is not int or not 1 <= x <= 5 for x in answers)):
        raise ValueError("Synthetic profiles must have 27 Python integers in [1,5].")


def domain_levels(levels):
    """Encode by item IDs, rather than concatenating six blocks."""
    return [levels[question[0]] for question in FEATURE_ORDER_27]


def one_step(answers, index, direction):
    validate_profile(answers)
    if (type(index) is not int or not 0 <= index < 27
            or type(direction) is not int or direction not in (-1, 1)):
        raise ValueError("Invalid perturbation specification.")
    changed = answers.copy()
    changed[index] += direction
    validate_profile(changed)
    return changed


def build_manifest():
    profiles = []

    def add(identifier, category, purpose, answers, parent_id=None):
        validate_profile(answers)
        row = {"profile_id": identifier, "category": category,
               "purpose": purpose, "answers": answers}
        if parent_id:
            row["parent_id"] = parent_id
        profiles.append(row)

    for domain in DOMAINS:
        add("single_" + domain, "single_dominant",
            "One domain at 5; other domains at 1; no expected major label.",
            domain_levels({d: 5 if d == domain else 1 for d in DOMAINS}))
    for size, category in [(2, "combined_pair"), (3, "combined_triple")]:
        for selected in combinations(DOMAINS, size):
            add(category + "_" + "".join(selected), category,
                f"Exactly {size} domains at 5, all others at 1.",
                domain_levels({d: 5 if d in selected else 1 for d in DOMAINS}))
    for domain in ["R", "C"]:
        answers = [3] * 27
        answers[DOMAIN_INDICES[domain][0]] = 4
        add("balanced_small_" + domain, "balanced",
            "Nearly balanced means: only one item changes from 3 to 4.", answers)
    for level in range(1, 6):
        add(f"uniform_{level}", "flat_uniform",
            "All 27 answers equal; flat guard should abstain.", [level] * 27)
    for level in [2, 3, 4]:
        values = {f"{d}{i+1}": value for d in DOMAINS
                  for i, value in enumerate([level-1, level+1] +
                                           [level] * (len(DOMAIN_INDICES[d])-2))}
        add(f"equal_means_{level}", "flat_nonuniform",
            "Different item values, but every domain mean equals the stated level.",
            [values[q] for q in FEATURE_ORDER_27])
    for pair in combinations(DOMAINS, 2):
        for trailing in pair:
            answers = domain_levels({d: 4 if d in pair else 2 for d in DOMAINS})
            answers[DOMAIN_INDICES[trailing][0]] = 3
            add("competition_" + "".join(pair) + "_lower_" + trailing,
                "near_competition", "Two high domains; one item reduces one mean slightly.", answers)
    anchor = [5, 5, 2, 5, 5, 1, 1, 2, 4, 2, 1, 2, 5, 2, 2, 4, 4, 1,
              3, 5, 2, 2, 4, 2, 4, 5, 4]
    add("differentiated_anchor", "anchor", "Fixed heterogeneous technical profile.", anchor)
    for index, question in enumerate(FEATURE_ORDER_27):
        step = -1 if anchor[index] == 5 else 1
        add("micro_one_" + question, "micro_change",
            "One item differs from the fixed anchor by exactly one Likert step.",
            one_step(anchor, index, step), "differentiated_anchor")
    for domain, indices in DOMAIN_INDICES.items():
        changed = anchor.copy()
        for index in indices[:2]:
            changed[index] += -1 if changed[index] == 5 else 1
        add("micro_two_" + domain, "micro_change",
            "Two items in one domain differ from the anchor by one step each.",
            changed, "differentiated_anchor")
    rng = random.Random(SEED)
    for number in range(128):
        add(f"random_{number:03d}", "random_uniform_likert",
            "Independent uniform integers 1..5; a stress distribution, not students.",
            [rng.randint(1, 5) for _ in FEATURE_ORDER_27])
    assert len(profiles) == 243
    assert len({row["profile_id"] for row in profiles}) == len(profiles)
    return {
        "schema_version": "1.0.0", "research_status": RESEARCH_STATUS,
        "population": "RULE_BASED_SYNTHETIC_NOT_STUDENTS",
        "seed": SEED, "perturbation_seed": PERTURBATION_SEED,
        "feature_order_27": list(FEATURE_ORDER_27), "domain_indices": DOMAIN_INDICES,
        "design": "Fixed before observing outputs; no expected-major or relevance labels.",
        "perturbation_rule": "Each profile, each of 27 positions: one +/-1 step; inward at 1/5, otherwise seeded choice.",
        "example_selection_rule": "Lowest Jaccard among single-dominant, near-competition and random profiles, plus lowest P2 perturbation Jaccard; ties by profile ID and item position.",
        "profile_count": len(profiles), "profiles": profiles,
    }


def iter_perturbations(profiles):
    rng = random.Random(PERTURBATION_SEED)
    for profile in profiles:
        for index, question in enumerate(FEATURE_ORDER_27):
            value = profile["answers"][index]
            direction = 1 if value == 1 else -1 if value == 5 else rng.choice([-1, 1])
            yield {"profile_id": profile["profile_id"], "category": profile["category"],
                   "feature_id": question, "position_0based": index, "delta": direction,
                   "answers": one_step(profile["answers"], index, direction)}
