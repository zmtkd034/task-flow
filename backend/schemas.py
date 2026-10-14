"""요청·응답 데이터 형식과 입력 검증 규칙(API-SPEC.md의 Task·User)."""

import re
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TITLE_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 2000
DUE_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
USERNAME_PATTERN = r"^[a-z0-9]{4,20}$"
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 64

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


class TaskUpdate(BaseModel):
    """부분 수정. 보낸 필드만 바꾸고 보내지 않은 필드는 그대로 둔다(model_fields_set으로 구분)."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = None
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    status: Status | None = None
    priority: Priority | None = None
    due_date: str | None = None

    # 기본값은 검증하지 않으므로, 이 검증은 값을 실제로 보냈을 때만 실행된다.
    @field_validator("title", "description", "status", "priority")
    @classmethod
    def reject_null(cls, value, info):
        if value is None:
            raise ValueError(f"{info.field_name} cannot be null")
        return value

    @field_validator("title")
    @classmethod
    def check_title(cls, value: str) -> str:
        return normalize_title(value)

    _validate_due_date = field_validator("due_date")(validate_due_date)


class Task(BaseModel):
    id: int
    title: str
    description: str
    status: Status
    priority: Priority
    due_date: str | None
    created_at: str


class SignupRequest(BaseModel):
    # 아이디는 공백 제거·소문자 변환 없이 그대로 검사한다. 비밀번호는 앞뒤 공백도 비밀번호로 본다.
    model_config = ConfigDict(extra="forbid")

    username: str = Field(pattern=USERNAME_PATTERN)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)


class User(BaseModel):
    # 비밀번호와 해시는 응답에 넣지 않는다.
    id: int
    username: str
    created_at: str
