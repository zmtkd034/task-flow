// T01: 제목 입력·등록·목록 표시만 구현한다. 저장은 하지 않는다(T02에서 추가).
const TITLE_MAX_LENGTH = 100;

const tasks = [];

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const formError = document.getElementById("form-error");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateTitle(rawTitle) {
  const title = rawTitle.trim();
  if (title.length === 0) {
    return { error: "제목을 입력해 주세요." };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return { error: `제목은 ${TITLE_MAX_LENGTH}자 이하로 입력해 주세요.` };
  }
  return { title };
}

function renderTasks() {
  taskList.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement("li");
    item.dataset.id = task.id;
    // 사용자 입력은 HTML로 해석하지 않고 글자로만 표시한다.
    item.textContent = task.title;
    taskList.appendChild(item);
  }
  emptyMessage.hidden = tasks.length > 0;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const result = validateTitle(titleInput.value);
  if (result.error) {
    formError.textContent = result.error;
    titleInput.focus();
    return;
  }

  tasks.push({
    id: createId(),
    title: result.title,
    status: "TODO",
    created_at: new Date().toISOString(),
  });

  formError.textContent = "";
  titleInput.value = "";
  titleInput.focus();
  renderTasks();
});

renderTasks();
