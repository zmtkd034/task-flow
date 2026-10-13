// T02: 제목 입력·등록·목록 표시 + localStorage 저장·복원.
const TITLE_MAX_LENGTH = 100;
const STORAGE_KEY = "task-flow-v1";
const TASK_STATUSES = ["TODO", "DOING", "DONE"];

let tasks = [];
// 저장값이 손상되었거나 저장소를 쓸 수 없으면 false가 되어 저장을 멈춘다.
let canSave = true;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const formError = document.getElementById("form-error");
const storageWarning = document.getElementById("storage-warning");
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

function isValidTask(task) {
  return (
    task !== null &&
    typeof task === "object" &&
    typeof task.id === "string" &&
    task.id.length > 0 &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    task.title.length <= TITLE_MAX_LENGTH &&
    TASK_STATUSES.includes(task.status) &&
    typeof task.created_at === "string"
  );
}

function showStorageWarning(message) {
  storageWarning.textContent = message;
  storageWarning.hidden = false;
}

function loadTasks() {
  let raw;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    canSave = false;
    showStorageWarning("브라우저 저장소를 사용할 수 없습니다. 새로고침하면 등록한 할 일이 사라집니다.");
    return [];
  }

  if (raw === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(isValidTask)) {
      return parsed;
    }
  } catch {
    // 아래에서 손상된 값으로 처리한다.
  }

  // 손상된 저장값은 자동으로 덮어쓰지 않는다.
  canSave = false;
  showStorageWarning(
    `저장된 데이터(${STORAGE_KEY})가 손상되어 불러오지 못했습니다. ` +
      "기존 값을 보호하기 위해 저장하지 않으며, 새로고침하면 새로 등록한 할 일이 사라집니다."
  );
  return [];
}

function saveTasks() {
  if (!canSave) {
    return true;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
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

  if (!saveTasks()) {
    // 저장에 실패하면 화면과 저장값이 어긋나지 않도록 방금 항목을 되돌린다.
    tasks.pop();
    formError.textContent = "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    titleInput.focus();
    return;
  }

  formError.textContent = "";
  titleInput.value = "";
  titleInput.focus();
  renderTasks();
});

tasks = loadTasks();
renderTasks();
