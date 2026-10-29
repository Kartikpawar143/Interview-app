from app.main import app
from app.routes.aws import visual_diagrams
from app.services.aws_visual_content import get_aws_visual_diagrams


def test_twelve_diagrams_have_complete_graphs_and_reusable_learning_references() -> None:
    diagrams = get_aws_visual_diagrams()
    assert len(diagrams) == 12
    for diagram in diagrams:
        nodes = {node.id for node in diagram.nodes}
        questions = {question_id for node in diagram.nodes for question_id in node.question_ids}
        assert len(nodes) == len(diagram.nodes)
        assert diagram.edges
        for edge in diagram.edges:
            assert edge.source in nodes and edge.target in nodes
            assert edge.label.strip()
        assert questions


def test_guided_walkthroughs_follow_real_directed_connections() -> None:
    by_id = {diagram.id: diagram for diagram in get_aws_visual_diagrams()}
    for diagram_id in ("vpc-networking", "iam-authorization", "cicd-pipeline", "backup-disaster-recovery"):
        diagram = by_id[diagram_id]
        assert len(diagram.sequence) >= 4
        for source, target in zip(diagram.sequence, diagram.sequence[1:]):
            assert any(edge.source == source and edge.target == target for edge in diagram.edges), (diagram_id, source, target)


def test_visual_learning_api_route_is_registered_and_loads_diagrams() -> None:
    assert len(visual_diagrams()) == 12
    assert "/api/aws/visual-learning/diagrams" in app.openapi()["paths"]
