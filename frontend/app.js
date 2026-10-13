// T03: 등록·목록·localStorage 저장·복원 + 상태 변경·제목 수정·삭제.
const TITLE_MAX_LENGTH = 100;
const STORAGE_KEY = "task-flow-v1";
const TASK_STATUSES = ["TODO", "DOING", "DONE"];
const STATUS_LABELS = { TODO: "할 일", DOING: "진행 중", DONE: "완료" };
const SAVE_ERROR_MESSAGE = "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";

let tasks = [];
// 저장값이 손상되었거나 저장소를 쓸 수 없으면 false가 되어 저장을 멈춘다.
let canSave = true;
// 수정 중인 항목의 id. 수정·삭제는 화면 순번이 아닌 id로 처리한다.
let editingId = null;
let editError = "";
// 수정 중 입력값. 다른 항목 변경으로 다시 그려져도 유지한다.
let editDraft = "";

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

function findTask(id) {
  return tasks.find((task) => task.id === id);
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

// 변경을 적용하고 저장한다. 저장에 실패하면 화면과 저장값이 어긋나지 않도록 되돌린다.
function applyChange(change) {
  const previous = tasks.map((task) => ({ ...task }));
  change();
  if (saveTasks()) {
    return true;
  }
  tasks = previous;
  return false;
}

function createButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

function renderViewItem(item, task) {
  const title = document.createElement("span");
  title.className = "task-title";
  // 사용자 입력은 HTML로 해석하지 않고 글자로만 표시한다.
  title.textContent = task.title;

  const statusSelect = document.createElement("select");
  statusSelect.className = "task-status";
  statusSelect.setAttribute("aria-label", "상태");
  for (const status of TASK_STATUSES) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = STATUS_LABELS[status];
    statusSelect.appendChild(option);
  }
  statusSelect.value = task.status;

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(statusSelect, createButton("수정", "edit"), createButton("삭제", "delete"));

  item.append(title, actions);
}

function renderEditItem(item, task) {
  const editForm = document.createElement("form");
  editForm.className = "edit-form";
  editForm.noValidate = true;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-title";
  input.value = editDraft;
  input.setAttribute("aria-label", "제목 수정");

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "저장";

  editForm.append(input, saveButton, createButton("취소", "cancel-edit"));
  item.appendChild(editForm);

  const error = document.createElement("p");
  error.className = "edit-error";
  error.setAttribute("role", "alert");
  error.textContent = editError;
  item.appendChild(error);
}

function renderTasks() {
  taskList.replaceChildren();
  for (const task of tasks) {
    const item = document.createElement("li");
    item.className = "task-item";
    item.dataset.id = task.id;
    item.dataset.status = task.status;
    if (task.id === editingId) {
      renderEditItem(item, task);
    } else {
      renderViewItem(item, task);
    }
    taskList.appendChild(item);
  }
  emptyMessage.hidden = tasks.length > 0;
}

function focusEditInput() {
  const input = taskList.querySelector(".edit-title");
  if (input) {
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const result = validateTitle(titleInput.value);
  if (result.error) {
    formError.textContent = result.error;
    titleInput.focus();
    return;
  }

  const saved = applyChange(() => {
    tasks.push({
      id: createId(),
      title: result.title,
      status: "TODO",
      created_at: new Date().toISOString(),
    });
  });
  if (!saved) {
    formError.textContent = SAVE_ERROR_MESSAGE;
    titleInput.focus();
    return;
  }

  formError.textContent = "";
  titleInput.value = "";
  titleInput.focus();
  renderTasks();
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const id = button.closest(".task-item").dataset.id;
  const task = findTask(id);
  if (!task) {
    return;
  }

  if (button.dataset.action === "edit") {
    editingId = id;
    editDraft = task.title;
    editError = "";
    renderTasks();
    focusEditInput();
  } else if (button.dataset.action === "cancel-edit") {
    editingId = null;
    editError = "";
    renderTasks();
  } else if (button.dataset.action === "delete") {
    if (!window.confirm(`"${task.title}" 할 일을 삭제할까요?`)) {
      return;
    }
    const saved = applyChange(() => {
      tasks = tasks.filter((item) => item.id !== id);
    });
    if (!saved) {
      formError.textContent = SAVE_ERROR_MESSAGE;
      return;
    }
    if (editingId === id) {
      editingId = null;
    }
    formError.textContent = "";
    renderTasks();
  }
});

taskList.addEventListener("input", (event) => {
  if (event.target.classList.contains("edit-title")) {
    editDraft = event.target.value;
  }
});

taskList.addEventListener("change", (event) => {
  const select = event.target.closest(".task-status");
  if (!select) {
    return;
  }
  const id = select.closest(".task-item").dataset.id;
  const saved = applyChange(() => {
    const task = findTask(id);
    if (task && TASK_STATUSES.includes(select.value)) {
      task.status = select.value;
    }
  });
  formError.textContent = saved ? "" : SAVE_ERROR_MESSAGE;
  renderTasks();
});

taskList.addEventListener("submit", (event) => {
  const editForm = event.target.closest(".edit-form");
  if (!editForm) {
    return;
  }
  event.preventDefault();

  const id = editForm.closest(".task-item").dataset.id;
  const input = editForm.querySelector(".edit-title");
  const result = validateTitle(input.value);
  if (result.error) {
    editError = result.error;
    editForm.parentElement.querySelector(".edit-error").textContent = editError;
    input.focus();
    return;
  }

  const saved = applyChange(() => {
    const task = findTask(id);
    if (task) {
      task.title = result.title;
    }
  });
  if (!saved) {
    editError = SAVE_ERROR_MESSAGE;
    editForm.parentElement.querySelector(".edit-error").textContent = editError;
    input.focus();
    return;
  }

  editingId = null;
  editError = "";
  renderTasks();
});

tasks = loadTasks();
renderTasks();
