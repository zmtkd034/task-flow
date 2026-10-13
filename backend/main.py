"""Task Flow API.

T07: 할 일 등록·조회·부분 수정·삭제와 목록 필터.
서버 메모리에 저장하므로 API를 재시작하면 데이터가 사라진다(DB는 T11부터).
"""

from datetime import datetime, timezone
from threading import Lock

from fastapi import FastAPI, HTTPException, Response, status

from backend.schemas import Priority, Status, Task, TaskCreate, TaskUpdate

app = FastAPI(title="Task Flow API")

# 메모리 저장소. 등록 순서대로 보관하고 id는 1부터 발급한다.
_tasks: list[Task] = []
_next_id = 1
_lock = Lock()


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _find_index(task_id: int) -> int:
    for index, task in enumerate(_tasks):
        if task.id == task_id:
            return index
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/tasks")
def list_tasks(
    q: str | None = None,
    status: Status | None = None,
    priority: Priority | None = None,
) -> list[Task]:
    # 제목 검색·상태·우선순위를 모두 만족하는 항목만 돌려준다(AND).
    keyword = (q or "").strip().lower()
    with _lock:
        return [
            task
            for task in _tasks
            if (not keyword or keyword in task.title.lower())
            and (status is None or task.status == status)
            and (priority is None or task.priority == priority)
        ]


@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate) -> Task:
    global _next_id
    with _lock:
        task = Task(id=_next_id, created_at=_now_utc(), **payload.model_dump())
        _tasks.append(task)
        _next_id += 1
    return task


@app.patch("/api/tasks/{task_id}")
def update_task(task_id: int, payload: TaskUpdate) -> Task:
    changes = payload.model_dump(exclude_unset=True)
    with _lock:
        index = _find_index(task_id)
        task = _tasks[index].model_copy(update=changes)
        _tasks[index] = task
    return task


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int) -> Response:
    with _lock:
        del _tasks[_find_index(task_id)]
    return Response(status_code=status.HTTP_204_NO_CONTENT)
