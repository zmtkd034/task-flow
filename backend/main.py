"""Task Flow API.

T06: 할 일을 서버 메모리에 저장한다. API를 재시작하면 데이터가 사라진다(DB는 T11부터).
"""

from datetime import datetime, timezone
from threading import Lock

from fastapi import FastAPI, status

from backend.schemas import Task, TaskCreate

app = FastAPI(title="Task Flow API")

# 메모리 저장소. 등록 순서대로 보관하고 id는 1부터 발급한다.
_tasks: list[Task] = []
_next_id = 1
_lock = Lock()


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks")
def list_tasks() -> list[Task]:
    with _lock:
        return list(_tasks)


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate) -> Task:
    global _next_id
    with _lock:
        task = Task(id=_next_id, created_at=_now_utc(), **payload.model_dump())
        _tasks.append(task)
        _next_id += 1
    return task
