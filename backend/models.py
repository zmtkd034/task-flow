"""DB 테이블 정의. 필드 규칙은 API-SPEC.md의 Task·User와 같다."""

from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base
from backend.schemas import DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH

USERNAME_MAX_LENGTH = 20
# 사용자별 salt를 포함한 해시 문자열(T17에서 hashlib.scrypt로 만든다). 원문 비밀번호는 저장하지 않는다.
PASSWORD_HASH_MAX_LENGTH = 255
# 세션 값의 SHA-256 해시(16진수 64자). 세션 값 자체는 저장하지 않는다.
TOKEN_HASH_LENGTH = 64


class UserRow(Base):
    __tablename__ = "users"
    __table_args__ = (
        # 아이디 규칙(영문 소문자·숫자 4~20자). 대소문자를 구분하도록 이 열만 utf8mb4_bin을 쓴다.
        CheckConstraint("username REGEXP '^[a-z0-9]{4,20}$'", name="ck_users_username"),
        {"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(
        String(USERNAME_MAX_LENGTH, collation="utf8mb4_bin"), nullable=False, unique=True
    )
    password_hash: Mapped[str] = mapped_column(String(PASSWORD_HASH_MAX_LENGTH), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class SessionRow(Base):
    __tablename__ = "sessions"
    __table_args__ = ({"mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_hash: Mapped[str] = mapped_column(String(TOKEN_HASH_LENGTH), nullable=False, unique=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", name="fk_sessions_user_id"), nullable=False, index=True
    )
    # UTC 기준. expires_at이 지난 세션은 로그인 상태로 보지 않는다.
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


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
    # 할 일의 주인. 다중 사용자 전환 전에 만든 행은 NULL로 남으며 누구에게도 보이지 않는다(T19).
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", name="fk_tasks_user_id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(TITLE_MAX_LENGTH), nullable=False)
    description: Mapped[str] = mapped_column(
        String(DESCRIPTION_MAX_LENGTH), nullable=False, default="", server_default=""
    )
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="TODO", server_default="TODO")
    priority: Mapped[str] = mapped_column(String(10), nullable=False, default="NORMAL", server_default="NORMAL")
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # UTC 기준 생성 시각. API 응답에서는 ISO 8601(끝에 Z)로 바꾼다.
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
