from pydantic import BaseModel, ConfigDict, Field


class AzureLesson(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    notes: str
    example: str
    learn_more: str


class AzureSection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    number: int = Field(ge=1)
    title: str
    domain: str
    objective_note: str
    estimated_minutes: int = Field(ge=1)
    objectives: list[str] = Field(min_length=1)
    terminology: list[str] = Field(min_length=1)
    revision_notes: list[str] = Field(min_length=1)
    related_sections: list[str]
    lessons: list[AzureLesson] = Field(min_length=1)


class AzureCourse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    description: str
    disclaimer: str
    exam_objectives_as_of: str
    exam_domains: list[dict[str, str]]
    official_study_guide: str
    sections: list[AzureSection] = Field(min_length=20, max_length=20)


class AzurePracticeQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    section_id: str
    type: str
    prompt: str
    choices: list[str] = Field(min_length=4, max_length=4)
    answer: int = Field(ge=0, le=3)
    explanation: str
    tags: list[str] = Field(min_length=1)

