from collections import Counter

import pytest
from fastapi import HTTPException

from app.main import app
from app.routes.aws import question, questions, topics
from app.routes.departments import departments
from app.services.aws_content import get_aws_questions, get_aws_topics, validate_aws_questions


EXPECTED_TOPICS = [
    "AWS Fundamentals and Global Infrastructure", "IAM, Roles, Policies, and Security",
    "EC2, AMIs, and Auto Scaling", "VPC, Subnets, Routing, and Security Groups",
    "S3 and AWS Storage Services", "Load Balancing and Route 53", "Lambda and Serverless Computing",
    "RDS, DynamoDB, and Databases", "ECS, ECR, Docker, and Fargate", "CloudWatch, CloudTrail, and X-Ray",
    "Backup, Disaster Recovery, and Reliability", "CloudFormation and Terraform",
    "CI/CD and Deployment Strategies", "Cost Management and Troubleshooting",
]


def test_aws_question_library_has_balanced_complete_original_content() -> None:
    topic_items, items = get_aws_topics(), get_aws_questions()
    assert [item.name for item in topic_items] == EXPECTED_TOPICS
    assert len(items) >= 100
    assert len({item.id for item in items}) == len(items)
    assert len({item.slug for item in items}) == len(items)
    assert set(Counter(item.topic_id for item in items).values()) == {8}
    assert set(Counter(item.difficulty for item in items)) == {"beginner", "intermediate", "advanced"}
    for item in items:
        assert item.question and item.short_answer and item.detailed_explanation and item.real_world_example
        assert item.services and item.troubleshooting_steps and item.common_mistakes and item.interview_tips
        assert item.cost_considerations and item.follow_up_questions and item.documentation_links
        assert item.related_question_ids and all(any(other.id == ref for other in items) for ref in item.related_question_ids)


def test_aws_routes_search_combine_filters_and_retrieve_related_question() -> None:
    found = questions(q="least privilege", topic="iam-security", difficulty="beginner")
    assert found and all(item.topic_id == "iam-security" and item.difficulty == "beginner" for item in found)
    by_answer = questions(q="immutable", topic="infrastructure-as-code")
    assert by_answer
    detail = question(found[0].slug)
    assert detail.id == found[0].id
    assert detail.related_question_ids
    assert topics()[0].id == "fundamentals-global-infrastructure"
    try:
        question("not-a-question")
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError("unknown AWS question should return 404")
    paths = set(app.openapi()["paths"])
    assert {"/api/aws/topics", "/api/aws/questions", "/api/aws/questions/{slug}"} <= paths


def test_aws_department_metadata_matches_topic_catalog() -> None:
    department = next(item for item in departments() if item.id == "aws")
    assert department.status == "available"
    assert department.topics == [item.id for item in topics()]


def test_invalid_question_content_is_rejected() -> None:
    raw = [item.model_dump() for item in get_aws_questions()]
    raw[1]["id"] = raw[0]["id"]
    with pytest.raises(ValueError, match="unique"):
        validate_aws_questions(raw, get_aws_topics())

    raw = [item.model_dump() for item in get_aws_questions()]
    raw[0]["topic_id"] = "missing-topic"
    with pytest.raises(ValueError, match="unknown topic"):
        validate_aws_questions(raw, get_aws_topics())

    raw = [item.model_dump() for item in get_aws_questions()]
    raw[0]["related_question_ids"] = ["missing-id"]
    with pytest.raises(ValueError, match="unknown or self-related"):
        validate_aws_questions(raw, get_aws_topics())

    with pytest.raises(ValueError, match="at least 100"):
        validate_aws_questions([], get_aws_topics())
