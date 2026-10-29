import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/linux/copilot", tags=["Linux Copilot"])
EXERCISES_PATH = Path(__file__).resolve().parents[1] / "content" / "linux" / "copilot_exercises.json"


@router.get("/exercises")
def exercises() -> list[dict[str, object]]:
    """Return curated, static simulator exercises; no host inspection is performed."""
    with EXERCISES_PATH.open(encoding="utf-8") as content_file:
        return json.load(content_file)
