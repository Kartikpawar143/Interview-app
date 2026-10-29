from fastapi import HTTPException

from app.main import app
from app.routes.azure import course as course_endpoint
from app.routes.azure import questions as questions_endpoint
from app.routes.azure import section as section_endpoint
from app.services.azure_content import get_course, get_questions


def test_az900_json_has_twenty_sections_forty_lessons_and_one_hundred_questions() -> None:
    course = get_course()
    questions = get_questions()
    assert len(course.sections) == 20
    assert sum(len(section.lessons) for section in course.sections) == 40
    assert len(questions) == 100
    assert all(len(section.objectives) and len(section.terminology) and len(section.revision_notes) for section in course.sections)
    assert {question.section_id for question in questions} == {section.id for section in course.sections}


def test_az900_api_serves_course_section_and_filtered_original_questions() -> None:
    course = course_endpoint()
    assert len(course.sections) == 20
    assert course.exam_objectives_as_of == '2026-07-20'

    section_id = course.sections[0].id
    section_data = section_endpoint(section_id)
    assert len(section_data['lessons']) == 2

    section_questions = questions_endpoint(section_id)
    assert len(section_questions) == 5
    assert all(len(item.choices) == 4 for item in section_questions)
    paths = set(app.openapi()['paths'])
    assert '/api/azure/az-900/course' in paths
    assert '/api/azure/az-900/sections/{section_id}' in paths
    assert '/api/azure/az-900/questions' in paths


def test_az900_api_rejects_unknown_section() -> None:
    try:
        section_endpoint('not-a-section')
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError('unknown section should return 404')
    try:
        questions_endpoint('not-a-section')
    except HTTPException as error:
        assert error.status_code == 404
    else:
        raise AssertionError('unknown question section should return 404')
