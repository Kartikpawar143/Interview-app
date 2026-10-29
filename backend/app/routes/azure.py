from fastapi import APIRouter, HTTPException

from app.schemas.azure import AzureCourse, AzurePracticeQuestion
from app.services.azure_content import get_course, get_questions

router = APIRouter(prefix="/azure/az-900", tags=["AZ-900 course"])


@router.get("/course", response_model=AzureCourse)
def course() -> AzureCourse:
    return get_course()


@router.get("/sections/{section_id}")
def section(section_id: str) -> dict[str, object]:
    item = next((section for section in get_course().sections if section.id == section_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="AZ-900 section not found")
    return item.model_dump()


@router.get("/questions", response_model=list[AzurePracticeQuestion])
def questions(section_id: str | None = None) -> list[AzurePracticeQuestion]:
    items = get_questions()
    if section_id is not None and section_id not in {section.id for section in get_course().sections}:
        raise HTTPException(status_code=404, detail="AZ-900 section not found")
    return [item for item in items if section_id is None or item.section_id == section_id]
