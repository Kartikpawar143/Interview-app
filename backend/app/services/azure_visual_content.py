import json
from functools import lru_cache
from pathlib import Path

from app.schemas.azure_visual import AzureVisualDiagram
from app.services.azure_admin_content import get_admin_topics
from app.services.azure_content import get_course, get_questions

CONTENT_DIR = Path(__file__).resolve().parents[1] / "content" / "azure"


@lru_cache(maxsize=1)
def get_visual_diagrams() -> tuple[AzureVisualDiagram, ...]:
    with (CONTENT_DIR / "az900_visual_diagrams.json").open(encoding="utf-8") as source:
        items = tuple(AzureVisualDiagram.model_validate(item) for item in json.load(source))
    if len(items) != 10 or len({item.id for item in items}) != len(items):
        raise ValueError("AZ-900 visual learning must contain ten unique diagrams")
    section_ids = {section.id for section in get_course().sections}
    question_ids = {question.id for question in get_questions()}
    topic_ids = {topic.id for topic in get_admin_topics()}
    for diagram in items:
        node_ids = {node.id for node in diagram.nodes}
        if len(node_ids) != len(diagram.nodes):
            raise ValueError(f"duplicate node ID in visual diagram {diagram.id}")
        if any(source not in node_ids or target not in node_ids for source, target in diagram.edges):
            raise ValueError(f"visual diagram {diagram.id} has an edge to an unknown node")
        if any(node.section_id not in section_ids for node in diagram.nodes):
            raise ValueError(f"visual diagram {diagram.id} has an unknown AZ-900 section")
        referenced_questions = set(diagram.quiz_question_ids).union(*(set(node.question_ids) for node in diagram.nodes))
        if not referenced_questions <= question_ids:
            raise ValueError(f"visual diagram {diagram.id} has an unknown practice question")
        if any(node.admin_topic_id is not None and node.admin_topic_id not in topic_ids for node in diagram.nodes):
            raise ValueError(f"visual diagram {diagram.id} has an unknown administration topic")
        if any(node_id not in node_ids for node_id in diagram.sequence):
            raise ValueError(f"visual diagram {diagram.id} has an unknown sequence node")
    return items
