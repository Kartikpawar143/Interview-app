import json
from functools import lru_cache
from pathlib import Path

from app.schemas.azure_admin import AzureAdminQuestion, AzureAdminScenario, AzureAdminTopic

CONTENT_DIR = Path(__file__).resolve().parents[1] / "content" / "azure"


def _load(name: str):
    with (CONTENT_DIR / name).open(encoding="utf-8") as source:
        return json.load(source)


@lru_cache(maxsize=1)
def get_admin_topics() -> tuple[AzureAdminTopic, ...]:
    items = tuple(AzureAdminTopic.model_validate(item) for item in _load("administration_topics.json"))
    if len(items) != 14 or len({item.id for item in items}) != len(items):
        raise ValueError("Azure administration content must contain 14 unique topics")
    return items


@lru_cache(maxsize=1)
def get_admin_questions() -> tuple[AzureAdminQuestion, ...]:
    items = tuple(AzureAdminQuestion.model_validate(item) for item in _load("administration_questions.json"))
    if len(items) < 80 or len({item.id for item in items}) != len(items):
        raise ValueError("Azure administration requires at least 80 unique questions")
    topic_ids = {topic.id for topic in get_admin_topics()}
    if any(item.topic_id not in topic_ids for item in items):
        raise ValueError("Azure question references an unknown topic")
    return items


@lru_cache(maxsize=1)
def get_admin_scenarios() -> tuple[AzureAdminScenario, ...]:
    items = tuple(AzureAdminScenario.model_validate(item) for item in _load("administration_scenarios.json"))
    if len(items) < 8 or len({item.id for item in items}) != len(items):
        raise ValueError("Azure administration requires at least eight unique scenarios")
    topic_ids = {topic.id for topic in get_admin_topics()}
    if any(item.topic_id not in topic_ids for item in items):
        raise ValueError("Azure scenario references an unknown topic")
    return items


def find_question(slug: str) -> AzureAdminQuestion | None:
    return next((item for item in get_admin_questions() if item.slug == slug), None)


def find_scenario(slug: str) -> AzureAdminScenario | None:
    return next((item for item in get_admin_scenarios() if item.slug == slug), None)
