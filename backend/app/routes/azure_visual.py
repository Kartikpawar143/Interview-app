from fastapi import APIRouter

from app.schemas.azure_visual import AzureVisualDiagram
from app.services.azure_visual_content import get_visual_diagrams

router = APIRouter(prefix="/azure/az-900/visual-learning", tags=["AZ-900 visual learning"])


@router.get("/diagrams", response_model=list[AzureVisualDiagram])
def diagrams() -> list[AzureVisualDiagram]:
    return list(get_visual_diagrams())
