import json
import re
from functools import lru_cache
from pathlib import Path

from app.schemas.aws import AwsTroubleshootingLab
from app.services.aws_content import get_aws_questions, get_aws_topics
from app.services.aws_visual_content import get_aws_visual_diagrams

CONTENT_FILE = Path(__file__).resolve().parents[1] / "content" / "aws" / "troubleshooting_labs.json"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@lru_cache(maxsize=1)
def get_aws_troubleshooting_labs() -> tuple[AwsTroubleshootingLab, ...]:
    with CONTENT_FILE.open(encoding="utf-8") as source:
        raw = json.load(source)
    if not isinstance(raw, list):
        raise ValueError("AWS troubleshooting labs must be a JSON array")
    labs = tuple(AwsTroubleshootingLab.model_validate(item) for item in raw)
    if len(labs) != 12 or len({lab.id for lab in labs}) != 12 or len({lab.slug for lab in labs}) != 12:
        raise ValueError("AWS troubleshooting must contain 12 labs with unique IDs and slugs")
    if any(not SLUG_PATTERN.fullmatch(lab.slug) for lab in labs):
        raise ValueError("AWS troubleshooting slugs must be URL-safe lowercase words")
    topics = {topic.id for topic in get_aws_topics()}
    questions = {question.id for question in get_aws_questions()}
    diagrams = {diagram.id: diagram for diagram in get_aws_visual_diagrams()}
    for lab in labs:
        if lab.topic_id not in topics or not set(lab.related_question_ids) <= questions:
            raise ValueError(f"AWS troubleshooting lab {lab.id} has an unknown topic or question")
        diagram = diagrams.get(lab.diagram_id)
        if diagram is None:
            raise ValueError(f"AWS troubleshooting lab {lab.id} references an unknown diagram")
        node_ids = {node.id for node in diagram.nodes}
        if len(set(lab.node_ids)) != len(lab.node_ids) or not set(lab.node_ids) <= node_ids:
            raise ValueError(f"AWS troubleshooting lab {lab.id} has invalid diagram nodes")
        evidence_ids = {item.id for item in lab.evidence}
        if len(evidence_ids) != len(lab.evidence):
            raise ValueError(f"AWS troubleshooting lab {lab.id} has duplicate evidence IDs")
        if any(item.node_id not in node_ids or not item.content.strip() for item in lab.evidence):
            raise ValueError(f"AWS troubleshooting lab {lab.id} has invalid evidence references")
        if any(not set(step.evidence_ids) <= evidence_ids for step in lab.diagnostic_steps):
            raise ValueError(f"AWS troubleshooting lab {lab.id} references missing evidence")
        for step in lab.diagnostic_steps:
            if sum(option.correct for option in step.options) != 1:
                raise ValueError(f"AWS troubleshooting lab {lab.id} diagnostic steps require one correct action")
        if sum(option.correct and option.id == lab.root_cause_id for option in lab.root_cause_options) != 1:
            raise ValueError(f"AWS troubleshooting lab {lab.id} requires one matching root cause")
        if len(lab.diagnostic_steps) < 3:
            raise ValueError(f"AWS troubleshooting lab {lab.id} needs at least three diagnostic steps")
    return labs


def find_aws_troubleshooting_lab(slug: str) -> AwsTroubleshootingLab | None:
    return next((lab for lab in get_aws_troubleshooting_labs() if lab.slug == slug or lab.id == slug), None)
