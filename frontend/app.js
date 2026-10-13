// T08: 할 일 저장을 localStorage 대신 Task Flow API(/api/tasks) 호출로 처리한다.
// 검색·필터·지연 표시는 받아 온 목록으로 화면에서 계산한다.
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const TASK_STATUSES = ["TODO", "DOING", "DONE"];
const STATUS_LABELS = { TODO: "할 일", DOING: "진행 중", DONE: "완료" };
const TASK_PRIORITIES = ["HIGH", "NORMAL", "LOW"];
const PRIORITY_LABELS = { HIGH: "높음", NORMAL: "보통", LOW: "낮음" };

// 화면과 API는 항상 같은 주소에서 제공된다(개발: uvicorn 8000번, 배포: Nginx). 그래서 /api를 그대로 부른다.
const API_BASE = "";

let tasks = [];
// "loading" | "ready" | "error". 목록을 불러오지 못하면 빈 목록 안내 대신 오류를 보여 준다.
let loadState = "loading";
// 등록 요청이 끝나기 전에 다시 제출해도 중복 등록되지 않도록 막는다.
let isSubmitting = false;
// 수정 중인 항목의 id. 수정·삭제는 화면 순번이 아닌 id로 처리한다.
let editingId = null;
let editError = "";
// 수정 중 입력값. 다른 항목 변경으로 다시 그려져도 유지한다.
let editDraft = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const priorityInput = document.getElementById("task-priority");
const dueDateInput = document.getElementById("task-due-date");
const descriptionInput = document.getElementById("task-description");
const formError = document.getElementById("form-error");
const apiError = document.getElementById("api-error");
const apiErrorText = document.getElementById("api-error-text");
const retryButton = document.getElementById("retry-button");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");
const taskList = document.getElementById("task-list");
const loadingMessage = document.getElementById("loading-message");
const emptyMessage = document.getElementById("empty-message");
const filterEmptyMessage = document.getElementById("filter-empty-message");

class ApiError extends Error {
  constructor(status) {
    super(`API error ${status}`);
    // 0은 서버에 연결하지 못한 경우다.
    this.status = status;
  }
}

async function request(method, path, body) {
  const options = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError(0);
  }
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.status === 204 ? null : response.json();
}

function getErrorMessage(error) {
  if (!(error instanceof ApiError) || error.status === 0) {
    return "API 서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.";
  }
  if (error.status === 404) {
    return "이미 삭제되었거나 없는 할 일입니다. 목록을 새로 불러왔습니다.";
  }
  if (error.status === 422) {
    return "입력값이 올바르지 않아 서버가 거절했습니다.";
  }
  return `서버 오류가 발생했습니다(${error.status}). 잠시 후 다시 시도해 주세요.`;
}

function showApiError(message) {
  apiErrorText.textContent = message;
  apiError.hidden = false;
}

function hideApiError() {
  apiError.hidden = true;
  apiErrorText.textContent = "";
}

// 실제 존재하는 날짜의 YYYY-MM-DD인지 확인한다.
function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// 로컬 달력 기준 오늘 날짜(YYYY-MM-DD).
function getLocalToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function isOverdue(task, today) {
  return task.due_date !== null && task.due_date < today && task.status !== "DONE";
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

// 제목·설명·우선순위·마감일 입력을 검사해 API로 보낼 값으로 바꾼다. 서버도 같은 규칙으로 다시 검사한다.
function validateTaskInput(input) {
  const titleResult = validateTitle(input.title);
  if (titleResult.error) {
    return titleResult;
  }
  if (input.description.length > DESCRIPTION_MAX_LENGTH) {
    return { error: `설명은 ${DESCRIPTION_MAX_LENGTH}자 이하로 입력해 주세요.` };
  }
  if (!TASK_PRIORITIES.includes(input.priority)) {
    return { error: "우선순위를 선택해 주세요." };
  }
  const dueDate = input.due_date === "" ? null : input.due_date;
  if (dueDate !== null && !isValidDateString(dueDate)) {
    return { error: "마감일은 YYYY-MM-DD 형식의 올바른 날짜로 입력해 주세요." };
  }
  return {
    value: {
      title: titleResult.title,
      description: input.description,
      priority: input.priority,
      due_date: dueDate,
    },
  };
}

function findTask(id) {
  return tasks.find((task) => task.id === id);
}

function replaceTask(updated) {
  tasks = tasks.map((task) => (task.id === updated.id ? updated : task));
}

async function loadTasks() {
  loadState = "loading";
  renderTasks();
  try {
    tasks = await request("GET", "/api/tasks");
    loadState = "ready";
    hideApiError();
  } catch (error) {
    loadState = "error";
    showApiError(`할 일 목록을 불러오지 못했습니다. ${getErrorMessage(error)}`);
  }
  if (editingId !== null && !findTask(editingId)) {
    editingId = null;
    editDraft = null;
  }
  renderTasks();
}

// 수정·삭제 대상이 서버에 없으면(404) 서버 목록을 다시 불러와 화면을 맞춘다.
async function handleItemError(error) {
  if (error instanceof ApiError && error.status === 404) {
    await loadTasks();
  }
  showApiError(getErrorMessage(error));
}

// 요청이 끝날 때까지 해당 영역의 입력과 버튼을 막아 중복 요청을 방지한다.
function setBusy(container, busy) {
  for (const control of container.querySelectorAll("button, input, select, textarea")) {
    control.disabled = busy;
  }
}

// 제목 검색, 상태, 우선순위 조건을 모두 만족하는 항목만 남긴다(AND).
function getVisibleTasks() {
  const keyword = filterSearch.value.trim().toLowerCase();
  const status = filterStatus.value;
  const priority = filterPriority.value;
  return tasks.filter(
    (task) =>
      (keyword === "" || task.title.toLowerCase().includes(keyword)) &&
      (status === "" || task.status === status) &&
      (priority === "" || task.priority === priority)
  );
}

function createButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  return button;
}

function createSelect(className, label, values, labels, selected) {
  const select = document.createElement("select");
  select.className = className;
  select.setAttribute("aria-label", label);
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labels[value];
    select.appendChild(option);
  }
  select.value = selected;
  return select;
}

function createBadge(className, text) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

function renderViewItem(item, task, today) {
  const main = document.createElement("div");
  main.className = "task-main";

  const title = document.createElement("span");
  title.className = "task-title";
  // 사용자 입력은 HTML로 해석하지 않고 글자로만 표시한다.
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";
  meta.appendChild(createBadge(`priority-${task.priority.toLowerCase()}`, PRIORITY_LABELS[task.priority]));
  if (task.due_date !== null) {
    meta.appendChild(createBadge("due-date", `마감 ${task.due_date}`));
  }
  if (isOverdue(task, today)) {
    meta.appendChild(createBadge("overdue", "지연"));
  }

  main.append(title, meta);

  if (task.description !== "") {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    main.appendChild(description);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    createSelect("task-status", "상태", TASK_STATUSES, STATUS_LABELS, task.status),
    createButton("수정", "edit"),
    createButton("삭제", "delete")
  );

  item.append(main, actions);
}

function renderEditItem(item) {
  const editForm = document.createElement("form");
  editForm.className = "edit-form";
  editForm.noValidate = true;

  const titleField = document.createElement("input");
  titleField.type = "text";
  titleField.className = "edit-title";
  titleField.dataset.field = "title";
  titleField.value = editDraft.title;
  titleField.setAttribute("aria-label", "제목 수정");

  const priorityField = createSelect("edit-priority", "우선순위 수정", TASK_PRIORITIES, PRIORITY_LABELS, editDraft.priority);
  priorityField.dataset.field = "priority";

  const dueDateField = document.createElement("input");
  dueDateField.type = "date";
  dueDateField.className = "edit-due-date";
  dueDateField.dataset.field = "due_date";
  dueDateField.value = editDraft.due_date;
  dueDateField.setAttribute("aria-label", "마감일 수정");

  const descriptionField = document.createElement("textarea");
  descriptionField.className = "edit-description";
  descriptionField.dataset.field = "description";
  descriptionField.rows = 3;
  descriptionField.maxLength = DESCRIPTION_MAX_LENGTH;
  descriptionField.value = editDraft.description;
  descriptionField.placeholder = "설명 (선택, 2000자 이하)";
  descriptionField.setAttribute("aria-label", "설명 수정");

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "저장";

  const titleRow = document.createElement("div");
  titleRow.className = "edit-row";
  titleRow.append(titleField, saveButton, createButton("취소", "cancel-edit"));

  const optionRow = document.createElement("div");
  optionRow.className = "edit-row";
  optionRow.append(priorityField, dueDateField);

  editForm.append(titleRow, optionRow, descriptionField);
  item.appendChild(editForm);

  const error = document.createElement("p");
  error.className = "edit-error";
  error.setAttribute("role", "alert");
  error.textContent = editError;
  item.appendChild(error);
}

function renderTasks() {
  const today = getLocalToday();
  const visibleTasks = getVisibleTasks();

  taskList.replaceChildren();
  for (const task of visibleTasks) {
    const item = document.createElement("li");
    item.className = "task-item";
    item.dataset.id = String(task.id);
    item.dataset.status = task.status;
    if (isOverdue(task, today)) {
      item.classList.add("is-overdue");
    }
    if (task.id === editingId) {
      renderEditItem(item);
    } else {
      renderViewItem(item, task, today);
    }
    taskList.appendChild(item);
  }
  loadingMessage.hidden = loadState !== "loading";
  emptyMessage.hidden = loadState !== "ready" || tasks.length > 0;
  filterEmptyMessage.hidden = tasks.length === 0 || visibleTasks.length > 0;
}

function focusEditInput() {
  const input = taskList.querySelector(".edit-title");
  if (input) {
    input.focus();
  }
}

function showEditError(editForm, message) {
  editError = message;
  editForm.parentElement.querySelector(".edit-error").textContent = message;
}

function resetForm() {
  titleInput.value = "";
  descriptionInput.value = "";
  priorityInput.value = "NORMAL";
  dueDateInput.value = "";
}

function getItemId(element) {
  return Number(element.closest(".task-item").dataset.id);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) {
    return;
  }

  const result = validateTaskInput({
    title: titleInput.value,
    description: descriptionInput.value,
    priority: priorityInput.value,
    due_date: dueDateInput.value,
  });
  if (result.error) {
    formError.textContent = result.error;
    titleInput.focus();
    return;
  }

  isSubmitting = true;
  setBusy(form, true);
  try {
    const created = await request("POST", "/api/tasks", result.value);
    formError.textContent = "";
    resetForm();
    if (loadState === "ready") {
      tasks.push(created);
      renderTasks();
    } else {
      // 처음 목록을 불러오지 못한 상태였다면 서버 목록 전체를 다시 받아 맞춘다.
      await loadTasks();
    }
  } catch (error) {
    // 실패하면 입력값을 그대로 두어 다시 시도할 수 있게 한다.
    formError.textContent = getErrorMessage(error);
  } finally {
    isSubmitting = false;
    setBusy(form, false);
    titleInput.focus();
  }
});

retryButton.addEventListener("click", loadTasks);

for (const filter of [filterSearch, filterStatus, filterPriority]) {
  filter.addEventListener("input", renderTasks);
}

taskList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }
  const id = getItemId(button);
  const task = findTask(id);
  if (!task) {
    return;
  }

  if (button.dataset.action === "edit") {
    editingId = id;
    editDraft = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date ?? "",
    };
    editError = "";
    renderTasks();
    focusEditInput();
  } else if (button.dataset.action === "cancel-edit") {
    editingId = null;
    editDraft = null;
    editError = "";
    renderTasks();
  } else if (button.dataset.action === "delete") {
    if (!window.confirm(`"${task.title}" 할 일을 삭제할까요?`)) {
      return;
    }
    setBusy(button.closest(".task-item"), true);
    try {
      await request("DELETE", `/api/tasks/${id}`);
      tasks = tasks.filter((item) => item.id !== id);
      if (editingId === id) {
        editingId = null;
        editDraft = null;
      }
      hideApiError();
    } catch (error) {
      await handleItemError(error);
    }
    renderTasks();
  }
});

taskList.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (field && editDraft) {
    editDraft[field] = event.target.value;
  }
});

taskList.addEventListener("change", async (event) => {
  const select = event.target.closest(".task-status");
  if (!select || !TASK_STATUSES.includes(select.value)) {
    return;
  }
  const id = getItemId(select);
  setBusy(select.closest(".task-item"), true);
  try {
    replaceTask(await request("PATCH", `/api/tasks/${id}`, { status: select.value }));
    hideApiError();
  } catch (error) {
    // 실패하면 서버에 저장된 원래 상태로 다시 그린다.
    await handleItemError(error);
  }
  renderTasks();
});

taskList.addEventListener("submit", async (event) => {
  const editForm = event.target.closest(".edit-form");
  if (!editForm) {
    return;
  }
  event.preventDefault();

  const id = getItemId(editForm);
  const result = validateTaskInput(editDraft);
  if (result.error) {
    showEditError(editForm, result.error);
    editForm.querySelector(".edit-title").focus();
    return;
  }

  setBusy(editForm, true);
  try {
    replaceTask(await request("PATCH", `/api/tasks/${id}`, result.value));
    editingId = null;
    editDraft = null;
    editError = "";
    hideApiError();
    renderTasks();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      await handleItemError(error);
      return;
    }
    // 실패하면 수정 중인 입력값을 그대로 두어 다시 시도할 수 있게 한다.
    setBusy(editForm, false);
    showEditError(editForm, getErrorMessage(error));
    editForm.querySelector(".edit-title").focus();
  }
});

loadTasks();
