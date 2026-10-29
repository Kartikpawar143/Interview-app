from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query

from app.schemas.aws import AwsQuestion, AwsTopic, AwsTroubleshootingLab, AwsVisualDiagram
from app.services.aws_content import find_aws_question, get_aws_topics, list_aws_questions
from app.services.aws_visual_content import get_aws_visual_diagrams
from app.services.aws_troubleshooting import find_aws_troubleshooting_lab, get_aws_troubleshooting_labs

router = APIRouter(prefix="/aws", tags=["AWS Cloud"])
Difficulty = Literal["beginner", "intermediate", "advanced"]


@router.get("/topics", response_model=list[AwsTopic])
def topics() -> list[AwsTopic]:
    return list(get_aws_topics())


@router.get("/questions", response_model=list[AwsQuestion])
def questions(
    q: Annotated[str | None, Query(max_length=100)] = None,
    topic: Annotated[str | None, Query(max_length=100)] = None,
    difficulty: Difficulty | None = None,
) -> list[AwsQuestion]:
    return list_aws_questions(q=q, topic=topic, difficulty=difficulty)


@router.get("/questions/{slug}", response_model=AwsQuestion)
def question(slug: str) -> AwsQuestion:
    result = find_aws_question(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="AWS question not found")
    return result


@router.get("/visual-learning/diagrams", response_model=list[AwsVisualDiagram])
def visual_diagrams() -> list[AwsVisualDiagram]:
    return list(get_aws_visual_diagrams())


@router.get("/troubleshooting/labs", response_model=list[AwsTroubleshootingLab])
def troubleshooting_labs() -> list[AwsTroubleshootingLab]:
    return list(get_aws_troubleshooting_labs())


@router.get("/troubleshooting/labs/{slug}", response_model=AwsTroubleshootingLab)
def troubleshooting_lab(slug: str) -> AwsTroubleshootingLab:
    result = find_aws_troubleshooting_lab(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="AWS troubleshooting lab not found")
    return result
