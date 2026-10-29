from pydantic import BaseModel, ConfigDict, Field


class AzureVisualGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    caption: str
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class AzureVisualNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label: str
    x: int
    y: int
    description: str
    purpose: str
    example: str
    services: list[str] = Field(min_length=1)
    section_id: str
    question_ids: list[str] = Field(min_length=1)
    admin_topic_id: str | None = None


class AzureVisualDiagram(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    order: int = Field(ge=1)
    title: str
    summary: str
    groups: list[AzureVisualGroup] = Field(default_factory=list)
    nodes: list[AzureVisualNode] = Field(min_length=3)
    edges: list[tuple[str, str]]
    sequence: list[str] = Field(default_factory=list)
    quiz_question_ids: list[str] = Field(min_length=2, max_length=5)
