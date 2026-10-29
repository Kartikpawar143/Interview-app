from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query

from app.schemas.linux import LinuxCommand, LinuxQuestion, LinuxTopic
from app.services.linux_content import get_commands, get_question, get_topics, list_questions, search_questions

router = APIRouter(prefix="/linux", tags=["Linux learning content"])
Difficulty = Literal["beginner", "intermediate", "advanced"]


@router.get("/topics", response_model=list[LinuxTopic])
def topics() -> list[LinuxTopic]:
    return list(get_topics())


@router.get("/questions", response_model=list[LinuxQuestion])
def questions(
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    difficulty: Difficulty | None = None,
) -> list[LinuxQuestion]:
    return list_questions(topic=topic, difficulty=difficulty)


@router.get("/questions/{slug}", response_model=LinuxQuestion)
def question(slug: str) -> LinuxQuestion:
    result = get_question(slug)
    if result is None:
        raise HTTPException(status_code=404, detail="Linux question not found")
    return result


@router.get("/search", response_model=list[LinuxQuestion])
def search(
    q: Annotated[str, Query(min_length=2, max_length=100)],
    topic: Annotated[str | None, Query(min_length=1, max_length=100)] = None,
    difficulty: Difficulty | None = None,
) -> list[LinuxQuestion]:
    if not q.strip():
        raise HTTPException(status_code=422, detail="Query must contain a non-whitespace character")
    return search_questions(q, topic=topic, difficulty=difficulty)


@router.get("/commands", response_model=list[LinuxCommand])
def commands() -> list[LinuxCommand]:
    return list(get_commands())
