from fastapi import APIRouter

from app.schemas.azure_visual import AzureVisualDiagram
from app.services.azure_visual_content import get_visual_diagrams

router = APIRouter(prefix="/azure/administration/visual-learning", tags=["Azure visual learning"])


@router.get("/diagrams", response_model=list[AzureVisualDiagram])
def diagrams() -> list[AzureVisualDiagram]:
    return list(get_visual_diagrams())
