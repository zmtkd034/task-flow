"""Task Flow API.

T07: 할 일 등록·조회·부분 수정·삭제와 목록 필터.
T08: 화면이 API를 호출해 저장한다.
T11: 할 일을 MariaDB(tasks 테이블)에 저장한다. API를 재시작해도 데이터가 유지된다.
     실행 전에 python -m backend.init_db로 테이블을 만들어 둔다.
개발 서버 통합: 프로젝트에 frontend/가 있으면 화면도 같은 주소로 제공한다(개발 서버 하나로 화면+API).
T17: 회원가입(POST /api/auth/signup). 비밀번호는 해시로만 저장한다.
T18: 로그인·로그아웃·현재 사용자. 로그인 상태는 DB 세션과 HttpOnly 쿠키로 유지한다.
"""

from collections.abc import Iterator
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated

from fastapi import Cookie, Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import SessionRow, TaskRow, UserRow
from backend.schemas import (
    PASSWORD_MAX_LENGTH,
    LoginRequest,
    Priority,
    SignupRequest,
    Status,
    Task,
    TaskCreate,
    TaskUpdate,
    User,
)
from backend.security import (
    hash_password,
    hash_session_token,
    new_session_token,
    verify_dummy_password,
    verify_password,
)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
SESSION_COOKIE = "task_flow_session"
SESSION_MAX_AGE = timedelta(days=7)
# HTTP 배포(http://localhost)에서도 동작하도록 Secure는 붙이지 않는다(API-SPEC 인증 참고).
SESSION_COOKIE_OPTIONS = {"path": "/api", "httponly": True, "samesite": "lax", "secure": False}

app = FastAPI(title="Task Flow API")


@app.exception_handler(OperationalError)
def database_unavailable(request: Request, exc: OperationalError) -> JSONResponse:
    # DB에 연결하지 못하면 내부 오류 내용(접속 정보 등)을 숨기고 503으로 알린다.
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"detail": "Database unavailable"})


@app.exception_handler(RequestValidationError)
async def hide_auth_input(request: Request, exc: RequestValidationError) -> JSONResponse:
    # 인증 API의 422에는 보낸 값(input, 비밀번호 포함)을 되돌려 주지 않는다. 다른 API는 기본 형식 그대로다.
    if not request.url.path.startswith("/api/auth/"):
        return await request_validation_exception_handler(request, exc)
    errors = [{key: value for key, value in error.items() if key != "input"} for error in exc.errors()]
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content={"detail": jsonable_encoder(errors)})


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]
SessionCookie = Annotated[str | None, Cookie(alias=SESSION_COOKIE)]


def _find_session(session: Session, token: str | None) -> SessionRow | None:
    # 만료된 세션은 없는 것으로 본다.
    if not token:
        return None
    return session.scalar(
        select(SessionRow).where(
            SessionRow.token_hash == hash_session_token(token), SessionRow.expires_at > _utc_now()
        )
    )


def get_current_user(session: SessionDep, token: SessionCookie = None) -> UserRow:
    found = _find_session(session, token)
    if found is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return session.get(UserRow, found.user_id)


CurrentUser = Annotated[UserRow, Depends(get_current_user)]


def _to_task(row: TaskRow) -> Task:
    return Task(
        id=row.id,
        title=row.title,
        description=row.description,
        status=row.status,
        priority=row.priority,
        due_date=row.due_date.isoformat() if row.due_date else None,
        created_at=row.created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
    )


def _utc_now() -> datetime:
    # UTC 기준, 초 단위로 저장한다.
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def _to_user(row: UserRow) -> User:
    return User(id=row.id, username=row.username, created_at=row.created_at.strftime("%Y-%m-%dT%H:%M:%SZ"))


def _to_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _get_row(session: Session, task_id: int) -> TaskRow:
    row = session.get(TaskRow, task_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return row


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, session: SessionDep) -> User:
    # 가입만 하고 로그인은 하지 않는다(쿠키를 보내지 않음).
    username_taken = HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
    if session.scalar(select(UserRow.id).where(UserRow.username == payload.username)) is not None:
        raise username_taken
    row = UserRow(username=payload.username, password_hash=hash_password(payload.password), created_at=_utc_now())
    session.add(row)
    try:
        session.commit()
    except IntegrityError:
        # 같은 아이디로 동시에 가입한 경우 DB의 UNIQUE 제약이 막는다.
        session.rollback()
        raise username_taken from None
    return _to_user(row)


@app.post("/api/auth/login")
def login(payload: LoginRequest, response: Response, session: SessionDep, token: SessionCookie = None) -> User:
    # 없는 아이디와 틀린 비밀번호를 같은 401로 응답한다(무엇이 틀렸는지 알려 주지 않는다).
    invalid = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
    if len(payload.password) > PASSWORD_MAX_LENGTH:
        # 가입 규칙보다 긴 비밀번호는 맞을 수 없으므로 해시 계산 없이 거절한다.
        raise invalid
    user = session.scalar(select(UserRow).where(UserRow.username == payload.username))
    if user is None:
        verify_dummy_password(payload.password)
        raise invalid
    if not verify_password(payload.password, user.password_hash):
        raise invalid

    # 이미 로그인한 쿠키가 있으면 그 세션은 지우고 새 세션을 만든다.
    old = _find_session(session, token)
    if old is not None:
        session.delete(old)
    new_token = new_session_token()
    now = _utc_now()
    session.add(
        SessionRow(
            token_hash=hash_session_token(new_token), user_id=user.id, created_at=now, expires_at=now + SESSION_MAX_AGE
        )
    )
    session.commit()
    response.set_cookie(
        SESSION_COOKIE, new_token, max_age=int(SESSION_MAX_AGE.total_seconds()), **SESSION_COOKIE_OPTIONS
    )
    return _to_user(user)


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(session: SessionDep, token: SessionCookie = None) -> Response:
    # 로그인하지 않았거나 이미 로그아웃했어도 204로 응답한다.
    if token:
        session.execute(delete(SessionRow).where(SessionRow.token_hash == hash_session_token(token)))
        session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(SESSION_COOKIE, **SESSION_COOKIE_OPTIONS)
    return response


@app.get("/api/auth/me")
def me(user: CurrentUser) -> User:
    return _to_user(user)


@app.get("/api/tasks")
def list_tasks(
    session: SessionDep,
    q: str | None = None,
    status: Status | None = None,
    priority: Priority | None = None,
) -> list[Task]:
    # 제목 검색·상태·우선순위를 모두 만족하는 항목만 등록 순서대로 돌려준다(AND).
    query = select(TaskRow).order_by(TaskRow.id)
    keyword = (q or "").strip()
    if keyword:
        # 테이블 정렬 규칙(utf8mb4_unicode_ci)이 대소문자를 구분하지 않는다. %, _는 글자로 찾는다.
        query = query.where(TaskRow.title.contains(keyword, autoescape=True))
    if status is not None:
        query = query.where(TaskRow.status == status)
    if priority is not None:
        query = query.where(TaskRow.priority == priority)
    return [_to_task(row) for row in session.scalars(query)]


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, session: SessionDep) -> Task:
    row = TaskRow(
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        due_date=_to_date(payload.due_date),
        # UTC 기준, 초 단위로 저장한다.
        created_at=datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0),
    )
    session.add(row)
    session.commit()
    return _to_task(row)


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate, session: SessionDep) -> Task:
    row = _get_row(session, task_id)
    # 보낸 필드만 바꾸고 보내지 않은 필드는 그대로 둔다.
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, _to_date(value) if field == "due_date" else value)
    session.commit()
    return _to_task(row)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, session: SessionDep) -> Response:
    session.delete(_get_row(session, task_id))
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# 개발 환경(프로젝트 폴더)에서는 화면 파일도 같은 주소로 제공해 개발 서버 하나로 쓴다.
# 배포된 App(/opt/task-flow)에는 frontend/가 없어 API만 제공하고, 화면은 Nginx가 제공한다.
# API 경로를 먼저 등록했으므로 /api/... 요청은 화면 파일보다 API가 먼저 처리한다.
if (FRONTEND_DIR / "index.html").is_file():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
