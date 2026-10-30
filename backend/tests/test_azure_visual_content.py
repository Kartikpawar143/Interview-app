from app.main import app
from app.routes.azure_visual import diagrams as diagrams_endpoint
from app.services.azure_content import get_course, get_questions
from app.services.azure_visual_content import get_visual_diagrams


def test_az900_visual_diagrams_cover_ten_topics_and_reuse_course_questions() -> None:
    diagrams = get_visual_diagrams()
    assert len(diagrams) == 10
    assert sum(len(diagram.nodes) for diagram in diagrams) == 56
    question_ids = {question.id for question in get_questions()}
    section_ids = {section.id for section in get_course().sections}
    assert all(node.section_id in section_ids for diagram in diagrams for node in diagram.nodes)
    assert all(set(diagram.quiz_question_ids) <= question_ids for diagram in diagrams)
    assert all(set(node.question_ids) <= question_ids for diagram in diagrams for node in diagram.nodes)
    assert all(len(diagram.quiz_question_ids) >= 2 for diagram in diagrams)
    assert all(len(diagram.groups) >= 2 for diagram in diagrams)
    assert all(group.x + group.width <= 1160 and group.y + group.height <= 390 for diagram in diagrams for group in diagram.groups)
    assert all(node.x + 184 <= 1160 and node.y + 84 <= 390 for diagram in diagrams for node in diagram.nodes)
    assert all(any(sum(source == node_id for source, _ in diagram.edges) > 1 for node_id in {source for source, _ in diagram.edges}) for diagram in diagrams)


def test_az900_visual_sequences_cover_required_workflows_and_route_is_registered() -> None:
    diagrams = {diagram.id: diagram for diagram in diagrams_endpoint()}
    assert len(diagrams) == 10
    assert diagrams["resource-hierarchy"].sequence == ["management-group", "subscription", "resource-group", "resource"]
    assert diagrams["azure-networking"].sequence
    assert diagrams["identity-access"].sequence
    assert diagrams["monitoring-observability"].sequence
    assert "/api/azure/administration/visual-learning/diagrams" in app.openapi()["paths"]
    assert "/api/azure/az-900/course" in app.openapi()["paths"]
    assert "/api/azure/administration/topics" in app.openapi()["paths"]
    assert "/api/linux/topics" in app.openapi()["paths"]
