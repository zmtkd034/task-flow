"""DB 테이블 정의. 필드 규칙은 API-SPEC.md의 Task와 같다."""

from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base
from backend.schemas import DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH


class TaskRow(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        # API 검증과 별개로 DB에도 허용 값을 걸어 둔다.
        CheckConstraint("status IN ('TODO', 'DOING', 'DONE')", name="ck_tasks_status"),
        CheckConstraint("priority IN ('HIGH', 'NORMAL', 'LOW')", name="ck_tasks_priority"),
        CheckConstraint("CHAR_LENGTH(TRIM(title)) > 0", name="ck_tasks_title_not_blank"),
        {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(TITLE_MAX_LENGTH), nullable=False)
    description: Mapped[str] = mapped_column(
        String(DESCRIPTION_MAX_LENGTH), nullable=False, default="", server_default=""
    )
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="TODO", server_default="TODO")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="NORMAL", server_default="NORMAL")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # UTC 기준 생성 시각. API 응답에서는 ISO 8601(끝에 Z)로 바꾼다.
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
