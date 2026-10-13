"""요청·응답 데이터 형식과 입력 검증 규칙(API-SPEC.md의 Task)."""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TITLE_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 2000
DUE_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

Status = Literal["TODO", "DOING", "DONE"]
Priority = Literal["HIGH", "NORMAL", "LOW"]


def normalize_title(value: str) -> str:
    title = value.strip()
    if not 1 <= len(title) <= TITLE_MAX_LENGTH:
        raise ValueError(f"title must be 1-{TITLE_MAX_LENGTH} characters after trimming")
    return title


def validate_due_date(value: str | None) -> str | None:
    if value is None:
        return None
    if not DUE_DATE_PATTERN.fullmatch(value):
        raise ValueError("due_date must be YYYY-MM-DD")
    try:
        date.fromisoformat(value)
    except ValueError:
        raise ValueError("due_date must be a real calendar date") from None
    return value


class TaskCreate(BaseModel):
    # 정의되지 않은 필드(id, created_at 포함)는 거절한다.
    model_config = ConfigDict(extra="forbid")

    title: str
    description: str = Field(default="", max_length=DESCRIPTION_MAX_LENGTH)
    status: Status = "TODO"
    priority: Priority = "NORMAL"
    due_date: str | None = None

    _normalize_title = field_validator("title")(normalize_title)
    _validate_due_date = field_validator("due_date")(validate_due_date)


class Task(BaseModel):
    id: int
    title: str
    description: str
    status: Status
    priority: Priority
    due_date: str | None
    created_at: str
