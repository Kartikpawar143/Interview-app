from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LinuxTopic(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    name: str
    description: str
    department_id: Literal["linux"]
    order: int = Field(ge=1)


class LinuxQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    topic_id: str
    topic: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    experience_level: Literal["Entry-level", "Mid-level", "Senior"]
    question: str
    short_answer: str
    detailed_explanation: str
    commands: list[str] = Field(min_length=1)
    sample_output: str
    real_world_examples: list[str] = Field(min_length=1)
    troubleshooting_steps: list[str] = Field(min_length=1)
    common_mistakes: list[str] = Field(min_length=1)
    cost_considerations: str
    follow_up_questions: list[str] = Field(min_length=1)

    @field_validator("id", "slug", "topic_id", "topic", "question", "short_answer", "detailed_explanation", "sample_output", "cost_considerations")
    @classmethod
    def non_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class LinuxCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str
    description: str
    example: str
    notes: str
    topic_ids: list[str]
