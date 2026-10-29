from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AzureAdminTopic(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    name: str
    description: str
    order: int = Field(ge=1)


class AzureAdminQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    topic_id: str
    topic: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    question: str
    short_answer: str
    detailed_explanation: str
    real_world_example: str
    services: list[str] = Field(min_length=1)
    troubleshooting_steps: list[str] = Field(min_length=1)
    common_mistakes: list[str] = Field(min_length=1)
    cost_considerations: str
    follow_up_questions: list[str] = Field(min_length=1)


class AzureScenarioCheck(BaseModel):
    model_config = ConfigDict(extra="forbid")
    step: str
    check: str
    expected_observation: str


class AzureAdminScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    title: str
    topic_id: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    symptoms: list[str] = Field(min_length=1)
    diagnostic_steps: list[AzureScenarioCheck] = Field(min_length=1)
    root_cause_reasoning: str
    safe_remediation: list[str] = Field(min_length=1)
    safety_notes: list[str] = Field(min_length=1)
