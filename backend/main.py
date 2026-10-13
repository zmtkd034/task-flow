"""Task Flow API.

T07: 할 일 등록·조회·부분 수정·삭제와 목록 필터.
T08: 개발용 화면(5500번 포트)에서 호출할 수 있도록 CORS를 허용한다.
T11: 할 일을 MariaDB(tasks 테이블)에 저장한다. API를 재시작해도 데이터가 유지된다.
     실행 전에 python -m backend.init_db로 테이블을 만들어 둔다.
"""

from collections.abc import Iterator
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.models import TaskRow
from backend.schemas import Priority, Status, Task, TaskCreate, TaskUpdate

app = FastAPI(title="Task Flow API")

# 화면(127.0.0.1:5500)과 API(127.0.0.1:8000)의 주소가 달라 브라우저가 막으므로 개발용 화면 주소만 허용한다.
# 배포 단계(T14)에서는 Nginx가 같은 주소로 /api를 전달하므로 CORS가 필요 없다.
DEV_FRONTEND_ORIGINS = ["http://127.0.0.1:5500", "http://localhost:5500"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_FRONTEND_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(OperationalError)
def database_unavailable(request: Request, exc: OperationalError) -> JSONResponse:
    # DB에 연결하지 못하면 내부 오류 내용(접속 정보 등)을 숨기고 503으로 알린다.
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content={"detail": "Database unavailable"})


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


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
