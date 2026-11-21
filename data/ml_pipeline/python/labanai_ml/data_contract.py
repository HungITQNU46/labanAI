"""Dataset-level provenance and safe validation for the 54-question workbook.

This module deliberately does not infer a row's source from timestamp or name
fields, and it does not score RIASEC until an item-level codebook is approved.
"""

from __future__ import annotations

from dataclasses import dataclass
import re
import unicodedata
from typing import Any, Iterable, Optional, Sequence


EXPECTED_SHEET = "AUGMENTED_RAW_1000"
EXPECTED_QUESTION_COUNT = 54
# C1 observed 58 named columns (54 questions + 4 fields) and six unused blank
# physical columns. The earlier claim of 63 columns is retained in the manifest
# as a reconciliation discrepancy, not silently treated as schema truth.
EXPECTED_NAMED_COLUMN_COUNT = 58
EXPECTED_PHYSICAL_COLUMN_WIDTH = 64
DATASET_VERSION = "owner-declared-real-2026-10-19"
DATASET_SHA256 = "13e37affaeca2eaef49ee998acb80efb70de6146ce1ba4f781c215740786ff42"
DATASET_PROVENANCE_STATUS = "OWNER_DECLARED_REAL"
# Current project-owner confirmation; retain the historical provenance label so
# existing checksum-pinned reports remain interpretable without rewriting them.
OWNER_CONFIRMATION_STATUS = "OWNER_CONFIRMED_REAL"
INDEPENDENT_VERIFICATION_STATUS = "NOT_YET_INDEPENDENTLY_VERIFIED"
RIASEC_CODEBOOK_STATUS = "PENDING_CONTENT_VALIDATION_AGAINST_WORKBOOK"
# Retained only for the already-defined, write-disabled MongoDB document schema.
# C1 audit code never uses this legacy row-level proxy status.
SOURCE_LABEL_STATUS = "INFERRED_UNCONFIRMED"

# An unverified design hypothesis only. Never use these ranges to score answers
# before a documented item-level codebook is approved.
PROPOSED_RIASEC_DIMENSION_RANGES = {
    "R": tuple(range(1, 10)),
    "I": tuple(range(10, 19)),
    "A": tuple(range(19, 28)),
    "S": tuple(range(28, 37)),
    "E": tuple(range(37, 46)),
    "C": tuple(range(46, 55)),
}
LIKERT_TEXT_TO_INT = {
    "chua bao gio dung": 1,
    "chi dung 1 vai truong hop": 2,
    "chi dung 1 nua": 3,
    "gan nhu la dung": 4,
    "hoan toan dung": 5,
}


class DataContractError(ValueError):
    """Raised when an input does not satisfy the declared contract."""


class RiasecCodebookPendingError(DataContractError):
    """Raised when code attempts RIASEC scoring before codebook approval."""


def _fold_text(value: Any) -> str:
    text = "" if value is None else str(value)
    normalized = unicodedata.normalize("NFD", text.replace("Đ", "D").replace("đ", "d"))
    without_marks = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return " ".join(without_marks.casefold().split())


def question_number(header: Any) -> Optional[int]:
    """Extract only the leading numeric question identifier from a header."""
    match = re.match(r"^\s*(\d+)(?:\D|$)", "" if header is None else str(header))
    return int(match.group(1)) if match else None


def validate_headers(headers: Iterable[Any]) -> dict[int, str]:
    """Require unique question identifiers 1 through 54, without guessing metadata."""
    materialized = [str(header) for header in headers]
    numbered: dict[int, str] = {}
    duplicates: list[int] = []
    for header in materialized:
        number = question_number(header)
        if number is None:
            continue
        if number in numbered:
            duplicates.append(number)
        numbered[number] = header

    expected = set(range(1, EXPECTED_QUESTION_COUNT + 1))
    if duplicates or set(numbered) != expected:
        raise DataContractError("Question headers must have unique leading identifiers 1 through 54")
    return numbered


def normalize_likert(value: Any) -> int:
    """Validate the known 1--5 representation; unknown anchors remain invalid."""
    if isinstance(value, bool):
        raise DataContractError("Boolean values are not valid survey answers")
    if isinstance(value, int) and 1 <= value <= 5:
        return value
    if isinstance(value, float) and value.is_integer() and 1 <= int(value) <= 5:
        return int(value)
    mapped = LIKERT_TEXT_TO_INT.get(_fold_text(value))
    if mapped is None:
        raise DataContractError("Survey answer is outside the approved Likert mapping")
    return mapped


def normalize_answers(values: Sequence[Any]) -> tuple[int, ...]:
    if len(values) != EXPECTED_QUESTION_COUNT:
        raise DataContractError("A response must contain exactly 54 answers")
    return tuple(normalize_likert(value) for value in values)


def riasec_means(values: Sequence[Any]) -> dict[str, float]:
    """Refuse scoring until content, direction and reverse coding are documented."""
    del values
    raise RiasecCodebookPendingError(
        "RIASEC scoring is disabled until an item-level 54-question codebook is approved"
    )


def riasec_norm01(values: Sequence[Any]) -> dict[str, float]:
    del values
    raise RiasecCodebookPendingError(
        "RIASEC normalization is disabled until an item-level 54-question codebook is approved"
    )


def source_inference_is_disabled() -> bool:
    """Timestamp/name heuristics must not classify this owner-declared REAL dataset."""
    return True


@dataclass(frozen=True)
class WorkbookAuditSummary:
    """Aggregate-only structure; it never stores names or answer vectors."""

    row_count: Optional[int]
    header_count: int
    question_count: int
    workbook_accessed_via_environment: bool
