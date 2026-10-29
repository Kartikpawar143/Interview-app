import json
from pathlib import Path

from app.schemas.department import Department
from app.services.aws_content import get_aws_topics

CONTENT_PATH = Path(__file__).resolve().parents[1] / "content" / "departments.json"


def list_departments() -> list[Department]:
    """Read department metadata from the versioned JSON content file."""
    with CONTENT_PATH.open(encoding="utf-8") as content_file:
        raw_departments = json.load(content_file)
    departments = [Department.model_validate(item) for item in raw_departments]
    aws_topic_ids = [topic.id for topic in get_aws_topics()]
    return [item.model_copy(update={"topics": aws_topic_ids}) if item.id == "aws" else item for item in departments]
