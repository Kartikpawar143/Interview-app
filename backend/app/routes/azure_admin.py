from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query

from app.schemas.azure_admin import AzureAdminQuestion, AzureAdminScenario, AzureAdminTopic
from app.services.azure_admin_content import (
    find_question, find_scenario, get_admin_questions, get_admin_scenarios, get_admin_topics,
)

router = APIRouter(prefix="/azure/administration", tags=["Azure administration"])
Difficulty = Literal["beginner", "intermediate", "advanced"]


@router.get("/topics", response_model=list[AzureAdminTopic])
def topics() -> list[AzureAdminTopic]:
    return list(get_admin_topics())


@router.get("/questions", response_model=list[AzureAdminQuestion])
def questions(
    q: Annotated[str | None, Query(max_length=100)] = None,
    topic: Annotated[str | None, Query(max_length=100)] = None,
    difficulty: Difficulty | None = None,
) -> list[AzureAdminQuestion]:
    result = list(get_admin_questions())
    if topic:
        result = [item for item in result if item.topic_id == topic or item.topic == topic]
    if difficulty:
        result = [item for item in result if item.difficulty == difficulty]
    if q and q.strip():
        term = q.strip().casefold()
        result = [item for item in result if term in " ".join((item.question, item.short_answer, item.topic, item.detailed_explanation, *item.services)).casefold()]
    return result


@router.get("/questions/{slug}", response_model=AzureAdminQuestion)
def question(slug: str) -> AzureAdminQuestion:
    result = find_question(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Azure administration question not found")
    return result


@router.get("/scenarios", response_model=list[AzureAdminScenario])
def scenarios() -> list[AzureAdminScenario]:
    return list(get_admin_scenarios())


@router.get("/scenarios/{slug}", response_model=AzureAdminScenario)
def scenario(slug: str) -> AzureAdminScenario:
    result = find_scenario(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Azure troubleshooting scenario not found")
    return result
