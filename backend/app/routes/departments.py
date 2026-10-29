from fastapi import APIRouter

from app.schemas.department import Department
from app.services.departments import list_departments

router = APIRouter(tags=["departments"])


@router.get("/departments", response_model=list[Department])
def departments() -> list[Department]:
    return list_departments()
