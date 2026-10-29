import json
from functools import lru_cache
from pathlib import Path

from app.schemas.aws import AwsVisualDiagram
from app.services.aws_content import get_aws_questions, get_aws_topics

CONTENT_FILE = Path(__file__).resolve().parents[1] / "content" / "aws" / "visual_diagrams.json"


@lru_cache(maxsize=1)
def get_aws_visual_diagrams() -> tuple[AwsVisualDiagram, ...]:
    with CONTENT_FILE.open(encoding="utf-8") as source:
        raw = json.load(source)
    if not isinstance(raw, list):
        raise ValueError("AWS visual diagrams must be a JSON array")
    items = tuple(AwsVisualDiagram.model_validate(item) for item in raw)
    if len(items) != 12 or len({item.id for item in items}) != 12:
        raise ValueError("AWS visual learning must contain 12 uniquely identified diagrams")
    if [item.order for item in items] != list(range(1, 13)):
        raise ValueError("AWS visual diagrams must be ordered from 1 through 12")

    topic_ids = {item.id for item in get_aws_topics()}
    question_ids = {item.id for item in get_aws_questions()}
    for diagram in items:
        node_ids = {node.id for node in diagram.nodes}
        if len(node_ids) != len(diagram.nodes):
            raise ValueError(f"AWS visual diagram {diagram.id} has duplicate node IDs")
        edge_ids = {edge.id for edge in diagram.edges}
        if len(edge_ids) != len(diagram.edges):
            raise ValueError(f"AWS visual diagram {diagram.id} has duplicate edge IDs")
        if any(edge.source not in node_ids or edge.target not in node_ids for edge in diagram.edges):
            raise ValueError(f"AWS visual diagram {diagram.id} has an edge to an unknown node")
        if any(node.topic_id not in topic_ids for node in diagram.nodes):
            raise ValueError(f"AWS visual diagram {diagram.id} references an unknown AWS topic")
        if any(not set(node.question_ids) <= question_ids for node in diagram.nodes):
            raise ValueError(f"AWS visual diagram {diagram.id} references an unknown AWS question")
        if any(node_id not in node_ids for node_id in diagram.sequence):
            raise ValueError(f"AWS visual diagram {diagram.id} has an unknown sequence node")
        if any(edge.sequence_step and edge.sequence_step > len(diagram.sequence) for edge in diagram.edges):
            raise ValueError(f"AWS visual diagram {diagram.id} has an edge outside its sequence")
        if any(group.x + group.width > diagram.width or group.y + group.height > diagram.height for group in diagram.groups):
            raise ValueError(f"AWS visual diagram {diagram.id} has a boundary outside its canvas")
        if any(node.x + 166 > diagram.width or node.y + 82 > diagram.height for node in diagram.nodes):
            raise ValueError(f"AWS visual diagram {diagram.id} has a node outside its canvas")
        if any(not link.startswith("https://docs.aws.amazon.com/") for link in diagram.documentation_links):
            raise ValueError(f"AWS visual diagram {diagram.id} must link to official AWS documentation")
    return items
