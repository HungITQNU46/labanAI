#!/usr/bin/env python3
"""
riasec27_bridge.py

Python bridge entrypoint for Node.js ↔ Direction B research prototype.
Invoked by Node.js child_process.spawn with JSON payload passed via stdin.
Directly wraps ResearchFlow and CatalogExplorer without duplicating ranking logic.

Status: RESEARCH_ONLY — TOP3_NOT_VALIDATED.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Fix module resolution so we can import directly from research/
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FLOW_MODULE_DIR = BASE_DIR / "research" / "riasec27_tier2_explorer_v0"
sys.path.insert(0, str(FLOW_MODULE_DIR))

try:
    from research_flow import ResearchFlow
    from explorer import CatalogExplorer, RESEARCH_STATUS_HEADER
except ImportError as e:
    err_out = {
        "status": "IMPORT_ERROR",
        "research_status": "RESEARCH_ONLY — TOP3_NOT_VALIDATED",
        "error": type(e).__name__,
        "message": f"Failed to import research flow modules: {e}",
    }
    sys.stdout.write(json.dumps(err_out, ensure_ascii=False))
    sys.exit(1)


def handle_request(payload: dict) -> dict:
    action = payload.get("action")

    flow = ResearchFlow()

    if action == "evaluate":
        answers = payload.get("answers")
        if answers is None:
            return {
                "status": "INVALID_INPUT",
                "research_status": RESEARCH_STATUS_HEADER,
                "error": "MISSING_ANSWERS",
                "message": "Payload missing 'answers' field.",
            }
        return flow.evaluate_profile(answers)

    elif action == "catalog":
        catalog = flow.explorer.list_catalog()
        return {
            "status": "SUCCESS",
            "research_status": RESEARCH_STATUS_HEADER,
            "total_majors": len(catalog),
            "catalog": catalog,
        }

    elif action == "themes":
        themes = flow.explorer.list_themes()
        return {
            "status": "SUCCESS",
            "research_status": RESEARCH_STATUS_HEADER,
            "theme_count": len(themes),
            "themes": themes,
        }

    elif action == "explore_theme":
        theme_id = payload.get("theme_id")
        option_id = payload.get("option_id")
        is_skip = bool(payload.get("is_skip", False))
        return flow.explorer.explore_theme(theme_id=theme_id, option_id=option_id, is_skip=is_skip)

    elif action == "explore_major":
        major_id = payload.get("major_id")
        if not major_id:
            return {
                "status": "INVALID_INPUT",
                "research_status": RESEARCH_STATUS_HEADER,
                "error": "MISSING_MAJOR_ID",
                "message": "Field 'major_id' is required for explore_major.",
            }
        return flow.explore_major(major_id)

    elif action == "full_session":
        answers = payload.get("answers")
        major_id = payload.get("major_id")
        option_id = payload.get("option_id")
        is_skip = bool(payload.get("is_skip", False))
        return flow.run_full_session(
            answers=answers,
            explore_major_id=major_id,
            explore_option_id=option_id,
            is_skip=is_skip,
        )

    else:
        return {
            "status": "UNKNOWN_ACTION",
            "research_status": RESEARCH_STATUS_HEADER,
            "error": "UNKNOWN_ACTION",
            "message": f"Action '{action}' is not supported.",
        }


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            sys.stdout.write(json.dumps({
                "status": "EMPTY_INPUT",
                "research_status": RESEARCH_STATUS_HEADER,
                "error": "EMPTY_INPUT",
                "message": "Received empty input from stdin.",
            }, ensure_ascii=False))
            sys.exit(0)

        payload = json.loads(raw_input)
        result = handle_request(payload)
        sys.stdout.write(json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    except json.JSONDecodeError as err:
        sys.stdout.write(json.dumps({
            "status": "INVALID_JSON",
            "research_status": "RESEARCH_ONLY — TOP3_NOT_VALIDATED",
            "error": "JSONDecodeError",
            "message": f"Malformed JSON sent to Python bridge: {err}",
        }, ensure_ascii=False))
        sys.exit(0)

    except Exception as exc:
        sys.stdout.write(json.dumps({
            "status": "INTERNAL_ERROR",
            "research_status": "RESEARCH_ONLY — TOP3_NOT_VALIDATED",
            "error": type(exc).__name__,
            "message": str(exc),
        }, ensure_ascii=False))
        sys.exit(0)


if __name__ == "__main__":
    main()
