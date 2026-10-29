import json
from functools import lru_cache
from pathlib import Path

from app.schemas.azure import AzureCourse, AzurePracticeQuestion

CONTENT_DIR = Path(__file__).resolve().parents[1] / "content" / "azure"


@lru_cache(maxsize=1)
def get_course() -> AzureCourse:
    with (CONTENT_DIR / "az900_course.json").open(encoding="utf-8") as content_file:
        course = AzureCourse.model_validate(json.load(content_file))
    ids = [section.id for section in course.sections]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate AZ-900 section IDs")
    return course


@lru_cache(maxsize=1)
def get_questions() -> tuple[AzurePracticeQuestion, ...]:
    with (CONTENT_DIR / "az900_questions.json").open(encoding="utf-8") as content_file:
        questions = tuple(AzurePracticeQuestion.model_validate(item) for item in json.load(content_file))
    if len(questions) < 100:
        raise ValueError("AZ-900 practice bank must contain at least 100 questions")
    if len({question.id for question in questions}) != len(questions):
        raise ValueError("duplicate AZ-900 question IDs")
    section_ids = {section.id for section in get_course().sections}
    unknown = sorted({question.section_id for question in questions} - section_ids)
    if unknown:
        raise ValueError(f"practice questions reference unknown sections: {unknown}")
    return questions
