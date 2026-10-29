from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class AwsTopic(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    name: str
    description: str
    order: int = Field(ge=1)


class AwsQuestion(BaseModel):
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
    interview_tips: list[str] = Field(min_length=1)
    cost_considerations: str
    follow_up_questions: list[str] = Field(min_length=1)
    related_question_ids: list[str] = Field(min_length=1)
    documentation_links: list[str] = Field(min_length=1)


class AwsVisualGroup(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    caption: str
    kind: Literal["global", "region", "availability-zone", "vpc", "subnet-public", "subnet-private", "subnet-isolated", "edge", "identity"]
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class AwsVisualNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label: str
    code: str
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    description: str
    purpose: str
    example: str
    services: list[str] = Field(min_length=1)
    topic_id: str
    question_ids: list[str] = Field(min_length=1)


class AwsVisualEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    source: str
    target: str
    label: str
    kind: Literal["traffic", "authorization", "control", "event", "replication", "monitoring", "recovery", "containment"]
    sequence_step: int | None = Field(default=None, ge=1)


class AwsVisualDiagram(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    order: int = Field(ge=1)
    title: str
    summary: str
    width: int = Field(ge=980)
    height: int = Field(ge=480)
    groups: list[AwsVisualGroup] = Field(default_factory=list)
    nodes: list[AwsVisualNode] = Field(min_length=3)
    edges: list[AwsVisualEdge] = Field(min_length=2)
    sequence: list[str] = Field(min_length=2)
    documentation_links: list[str] = Field(min_length=1)


class AwsTroubleshootingOption(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label: str
    feedback: str
    correct: bool = False


class AwsTroubleshootingStep(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    prompt: str
    evidence_ids: list[str] = Field(min_length=1)
    hint: str
    options: list[AwsTroubleshootingOption] = Field(min_length=2)


class AwsTroubleshootingEvidence(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    label: str
    kind: Literal["log", "configuration", "metric", "symptom"]
    content: str
    node_id: str


class AwsTroubleshootingLab(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    slug: str
    title: str
    category: str
    difficulty: Literal["beginner", "intermediate", "advanced"]
    summary: str
    symptoms: list[str] = Field(min_length=2)
    diagram_id: str
    node_ids: list[str] = Field(min_length=2)
    topic_id: str
    related_question_ids: list[str] = Field(min_length=1)
    evidence: list[AwsTroubleshootingEvidence] = Field(min_length=2)
    diagnostic_steps: list[AwsTroubleshootingStep] = Field(min_length=3)
    root_cause_id: str
    root_cause_options: list[AwsTroubleshootingOption] = Field(min_length=3)
    root_cause_explanation: str
    remediation: list[str] = Field(min_length=2)
    verification: list[str] = Field(min_length=2)
    interview_takeaways: list[str] = Field(min_length=2)
