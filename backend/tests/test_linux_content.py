import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.routes.linux import question as question_endpoint
from app.routes.linux import questions as questions_endpoint
from app.routes.linux import search as search_endpoint
from app.routes.copilot import exercises as copilot_exercises_endpoint
from app.schemas.linux import LinuxCommand, LinuxQuestion, LinuxTopic
from app.services.linux_content import get_questions, get_topics

client = TestClient(app)
CONTENT = Path(__file__).resolve().parents[1] / "app" / "content" / "linux"


def test_content_json_validates_and_has_unique_ids_and_slugs() -> None:
    topics = [LinuxTopic.model_validate(item) for item in json.loads((CONTENT / "topics.json").read_text())]
    questions = [LinuxQuestion.model_validate(item) for item in json.loads((CONTENT / "questions.json").read_text())]
    commands = [LinuxCommand.model_validate(item) for item in json.loads((CONTENT / "commands.json").read_text())]
    assert len(topics) == 11
    assert len(questions) >= 60
    assert len(commands) >= 30
    assert len({topic.id for topic in topics}) == len(topics)
    assert len({topic.slug for topic in topics}) == len(topics)
    assert all(topic.id == topic.slug for topic in topics)
    assert len({question.id for question in questions}) == len(questions)
    assert len({question.slug for question in questions}) == len(questions)
    assert {question.topic_id for question in questions} == {topic.id for topic in topics}
    assert len({command.id for command in commands}) == len(commands)
    assert all(question.commands and question.detailed_explanation and question.follow_up_questions for question in questions)


def test_topics_endpoint_returns_all_linux_topics() -> None:
    response = client.get("/api/linux/topics")
    assert response.status_code == 200
    assert len(response.json()) == 11
    assert response.json()[0]["name"] == "Linux Fundamentals and Architecture"


def test_every_topic_id_and_slug_returns_only_its_questions() -> None:
    topics = [topic.model_dump() for topic in get_topics()]
    all_questions = [question.model_dump() for question in get_questions()]

    assert len(topics) == 11
    for topic in topics:
        expected_ids = {item["id"] for item in all_questions if item["topic_id"] == topic["id"]}
        assert expected_ids
        for identifier in (topic["id"], topic["slug"]):
            questions = questions_endpoint(topic=identifier)
            assert {item.id for item in questions} == expected_ids
            assert all(item.topic_id == topic["id"] for item in questions)


def test_question_detail_and_search_route_handlers() -> None:
    question = question_endpoint("kernel-user-space")
    assert question.id == "linux-001"
    assert question_endpoint(question.slug).slug == question.slug

    filtered = search_endpoint(q="SELinux", topic="security-selinux-firewalls", difficulty="intermediate")
    assert filtered
    assert all(item.topic_id == "security-selinux-firewalls" and item.difficulty == "intermediate" for item in filtered)


def test_questions_endpoint_filters_by_topic_and_difficulty() -> None:
    response = client.get("/api/linux/questions", params={"topic": "networking-dns-ssh", "difficulty": "advanced"})
    assert response.status_code == 200
    questions = response.json()
    assert len(questions) == 2
    assert all(item["topic_id"] == "networking-dns-ssh" and item["difficulty"] == "advanced" for item in questions)


def test_topic_filter_accepts_topic_name() -> None:
    response = client.get("/api/linux/questions", params={"topic": "Package Management"})
    assert response.status_code == 200
    assert len(response.json()) == 6
    assert all(item["topic_id"] == "package-management" for item in response.json())


def test_question_detail_and_not_found() -> None:
    response = client.get("/api/linux/questions/kernel-user-space")
    assert response.status_code == 200
    assert response.json()["id"] == "linux-001"
    assert response.json()["sample_output"]
    assert client.get("/api/linux/questions/no-such-question").status_code == 404


def test_search_and_search_filters() -> None:
    response = client.get("/api/linux/search", params={"q": "SELinux"})
    assert response.status_code == 200
    assert any("selinux" in item["question"].lower() for item in response.json())

    filtered = client.get("/api/linux/search", params={"q": "SELinux", "topic": "security-selinux-firewalls", "difficulty": "intermediate"})
    assert filtered.status_code == 200
    assert all(item["topic_id"] == "security-selinux-firewalls" and item["difficulty"] == "intermediate" for item in filtered.json())


def test_search_validates_query_and_difficulty() -> None:
    assert client.get("/api/linux/search", params={"q": "x"}).status_code == 422
    assert client.get("/api/linux/search", params={"q": "  "}).status_code == 422
    assert client.get("/api/linux/search", params={"q": "ok", "difficulty": "expert"}).status_code == 422
    assert client.get("/api/linux/questions", params={"difficulty": "expert"}).status_code == 422


def test_commands_endpoint_returns_command_references() -> None:
    response = client.get("/api/linux/commands")
    assert response.status_code == 200
    commands = response.json()
    assert len(commands) == 35
    assert any(item["name"] == "systemctl" for item in commands)


def test_linux_copilot_exercises_are_curated_and_link_to_existing_content() -> None:
    exercises = copilot_exercises_endpoint()
    assert {item["category"] for item in exercises} == {"Disk usage", "CPU", "Permissions", "Services", "Networking"}
    topic_ids = {topic.id for topic in get_topics()}
    question_slugs = {question.slug for question in get_questions()}
    assert all(item["topic_id"] in topic_ids for item in exercises)
    assert all(item["question_slug"] in question_slugs for item in exercises)
    assert all(item["solution"] and item["hint"] for item in exercises)
