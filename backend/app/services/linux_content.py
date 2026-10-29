import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.schemas.linux import LinuxCommand, LinuxQuestion, LinuxTopic

CONTENT_DIR = Path(__file__).resolve().parents[1] / "content" / "linux"


def _load(filename: str) -> list[dict[str, Any]]:
    with (CONTENT_DIR / filename).open(encoding="utf-8") as content_file:
        data = json.load(content_file)
    if not isinstance(data, list):
        raise ValueError(f"{filename} must contain a JSON array")
    return data


@lru_cache(maxsize=1)
def get_topics() -> tuple[LinuxTopic, ...]:
    items = tuple(LinuxTopic.model_validate(item) for item in _load("topics.json"))
    _assert_unique((item.id for item in items), "topic IDs")
    _assert_unique((item.slug for item in items), "topic slugs")
    return items


@lru_cache(maxsize=1)
def get_questions() -> tuple[LinuxQuestion, ...]:
    items = tuple(LinuxQuestion.model_validate(item) for item in _load("questions.json"))
    _assert_unique((item.id for item in items), "question IDs")
    _assert_unique((item.slug for item in items), "question slugs")
    topic_ids = {topic.id for topic in get_topics()}
    unknown = sorted({item.topic_id for item in items} - topic_ids)
    if unknown:
        raise ValueError(f"questions reference unknown topics: {unknown}")
    return items


@lru_cache(maxsize=1)
def get_commands() -> tuple[LinuxCommand, ...]:
    items = tuple(LinuxCommand.model_validate(item) for item in _load("commands.json"))
    _assert_unique((item.id for item in items), "command IDs")
    _assert_unique((item.name for item in items), "command names")
    return items


def _assert_unique(values: Any, label: str) -> None:
    entries = list(values)
    if len(entries) != len(set(entries)):
        raise ValueError(f"duplicate {label}")


def list_questions(*, topic: str | None = None, difficulty: str | None = None) -> list[LinuxQuestion]:
    items = get_questions()
    if topic is not None:
        normalized = topic.strip().lower()
        topic_ids = {entry.id for entry in get_topics() if normalized in {entry.id.lower(), entry.slug.lower(), entry.name.lower()}}
        if not topic_ids:
            return []
        items = tuple(item for item in items if item.topic_id in topic_ids)
    if difficulty is not None:
        items = tuple(item for item in items if item.difficulty == difficulty)
    return list(items)


def get_question(slug: str) -> LinuxQuestion | None:
    return next((question for question in get_questions() if question.slug == slug), None)


def search_questions(query: str, *, topic: str | None = None, difficulty: str | None = None) -> list[LinuxQuestion]:
    needle = query.strip().casefold()
    candidates = list_questions(topic=topic, difficulty=difficulty)
    return [item for item in candidates if needle in " ".join((item.question, item.short_answer, item.detailed_explanation, item.topic, *item.commands, *item.follow_up_questions)).casefold()]
