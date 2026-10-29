import json
import re
from functools import lru_cache
from pathlib import Path

from app.schemas.aws import AwsQuestion, AwsTopic

CONTENT_DIR = Path(__file__).resolve().parents[1] / "content" / "aws"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _load(name: str) -> list[dict[str, object]]:
    with (CONTENT_DIR / name).open(encoding="utf-8") as source:
        data = json.load(source)
    if not isinstance(data, list):
        raise ValueError(f"{name} must contain a JSON array")
    return data


@lru_cache(maxsize=1)
def get_aws_topics() -> tuple[AwsTopic, ...]:
    items = tuple(AwsTopic.model_validate(item) for item in _load("topics.json"))
    if len(items) != 14 or len({item.id for item in items}) != len(items) or len({item.slug for item in items}) != len(items):
        raise ValueError("AWS must contain 14 topics with unique IDs and slugs")
    if [item.order for item in items] != list(range(1, 15)):
        raise ValueError("AWS topics must be ordered from 1 through 14")
    return items


@lru_cache(maxsize=1)
def get_aws_questions() -> tuple[AwsQuestion, ...]:
    items = validate_aws_questions(_load("questions.json"), get_aws_topics())
    return items


def validate_aws_questions(raw_items: list[dict[str, object]], topics: tuple[AwsTopic, ...]) -> tuple[AwsQuestion, ...]:
    items = tuple(AwsQuestion.model_validate(item) for item in raw_items)
    if len(items) < 100:
        raise ValueError("AWS question library must contain at least 100 questions")
    if len({item.id for item in items}) != len(items) or len({item.slug for item in items}) != len(items):
        raise ValueError("AWS question IDs and slugs must be unique")
    if any(not SLUG_PATTERN.fullmatch(item.slug) for item in items):
        raise ValueError("AWS question slugs must be URL-safe lowercase words")
    topic_ids = {topic.id for topic in topics}
    if any(item.topic_id not in topic_ids for item in items):
        raise ValueError("AWS question references an unknown topic")
    if {item.topic_id for item in items} != topic_ids:
        raise ValueError("Every AWS topic must contain questions")
    if {item.difficulty for item in items} != {"beginner", "intermediate", "advanced"}:
        raise ValueError("AWS questions must cover all difficulty levels")
    ids = {item.id for item in items}
    for item in items:
        if not item.id.strip() or any(not value.strip() for values in (item.services, item.troubleshooting_steps, item.common_mistakes, item.interview_tips, item.follow_up_questions, item.related_question_ids) for value in values):
            raise ValueError("AWS questions cannot contain blank required fields")
        if any(not link.startswith(("https://docs.aws.amazon.com/", "https://aws.amazon.com/", "https://developer.hashicorp.com/")) and link != "https://calculator.aws/" for link in item.documentation_links):
            raise ValueError("AWS documentation links must use official AWS or HashiCorp domains")
        if any(related not in ids or related == item.id for related in item.related_question_ids):
            raise ValueError("AWS question contains an unknown or self-related question ID")
    return items


def find_aws_topic(slug: str) -> AwsTopic | None:
    return next((item for item in get_aws_topics() if item.slug == slug or item.id == slug), None)


def find_aws_question(slug: str) -> AwsQuestion | None:
    return next((item for item in get_aws_questions() if item.slug == slug), None)


def list_aws_questions(*, q: str | None = None, topic: str | None = None, difficulty: str | None = None) -> list[AwsQuestion]:
    items = get_aws_questions()
    if topic:
        normalized = topic.strip().casefold()
        selected = {item.id for item in get_aws_topics() if normalized in {item.id.casefold(), item.slug.casefold(), item.name.casefold()}}
        items = tuple(item for item in items if item.topic_id in selected)
    if difficulty:
        items = tuple(item for item in items if item.difficulty == difficulty)
    if q and q.strip():
        term = q.strip().casefold()
        items = tuple(item for item in items if term in " ".join((item.question, item.short_answer, item.detailed_explanation, item.real_world_example, item.topic, *item.services, *item.common_mistakes, *item.interview_tips, *item.follow_up_questions)).casefold())
    return list(items)
