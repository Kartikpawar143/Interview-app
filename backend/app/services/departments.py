import json
from pathlib import Path

from app.schemas.department import Department

CONTENT_PATH = Path(__file__).resolve().parents[1] / "content" / "departments.json"


def list_departments() -> list[Department]:
    """Read department metadata from the versioned JSON content file."""
    with CONTENT_PATH.open(encoding="utf-8") as content_file:
        raw_departments = json.load(content_file)
    return [Department.model_validate(item) for item in raw_departments]
