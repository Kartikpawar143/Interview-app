from typing import Literal

from pydantic import BaseModel


class Department(BaseModel):
    id: str
    name: str
    short_name: str
    description: str
    status: Literal["available", "coming_soon"]
    accent: str
    topics: list[str]
