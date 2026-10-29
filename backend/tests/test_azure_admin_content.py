from fastapi import HTTPException

from app.main import app
from app.routes.azure_admin import question, questions, scenario, scenarios, topics
from app.services.azure_admin_content import get_admin_questions, get_admin_scenarios, get_admin_topics


def test_azure_admin_content_counts_and_references() -> None:
    topic_items = get_admin_topics()
    question_items = get_admin_questions()
    scenario_items = get_admin_scenarios()
    assert len(topic_items) == 14
    assert len(question_items) >= 80
    assert len(scenario_items) >= 8
    topic_ids = {item.id for item in topic_items}
    assert all(item.topic_id in topic_ids for item in question_items)
    assert all(item.topic_id in topic_ids for item in scenario_items)
    assert all(item.real_world_example and item.cost_considerations and item.follow_up_questions for item in question_items)
    assert all(item.diagnostic_steps and item.safe_remediation and item.safety_notes for item in scenario_items)


def test_azure_admin_routes_search_filter_and_detail() -> None:
    assert len(topics()) == 14
    assert len(scenarios()) == 8
    assert len(questions()) == 84
    found = questions(q="private endpoint", topic="networking")
    assert found and all(item.topic_id == "networking" for item in found)
    advanced = questions(topic="networking", difficulty="advanced")
    assert advanced and all(item.difficulty == "advanced" for item in advanced)
    assert question(found[0].slug).id == found[0].id
    assert scenario("vm-unreachable").title == "Azure VM unreachable over SSH or RDP"
    try:
        question("not-a-question")
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError("unknown question should return 404")


def test_azure_admin_endpoints_are_additive_and_separate_from_az900() -> None:
    paths = set(app.openapi()["paths"])
    assert "/api/azure/administration/topics" in paths
    assert "/api/azure/administration/questions" in paths
    assert "/api/azure/administration/questions/{slug}" in paths
    assert "/api/azure/administration/scenarios" in paths
    assert "/api/azure/administration/scenarios/{slug}" in paths
    assert "/api/azure/az-900/course" in paths
    assert "/api/linux/questions" in paths
