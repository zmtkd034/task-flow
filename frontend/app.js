// T04: 등록·목록·저장·상태 변경·수정·삭제 + 설명·우선순위·마감일·검색·필터·지연 표시.
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const STORAGE_KEY = "task-flow-v1";
const TASK_STATUSES = ["TODO", "DOING", "DONE"];
const STATUS_LABELS = { TODO: "할 일", DOING: "진행 중", DONE: "완료" };
const TASK_PRIORITIES = ["HIGH", "NORMAL", "LOW"];
const PRIORITY_LABELS = { HIGH: "높음", NORMAL: "보통", LOW: "낮음" };
const SAVE_ERROR_MESSAGE = "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";

let tasks = [];
// 저장값이 손상되었거나 저장소를 쓸 수 없으면 false가 되어 저장을 멈춘다.
let canSave = true;
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
const storageWarning = document.getElementById("storage-warning");
const filterSearch = document.getElementById("filter-search");
const filterStatus = document.getElementById("filter-status");
const filterPriority = document.getElementById("filter-priority");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const filterEmptyMessage = document.getElementById("filter-empty-message");

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

// 제목·설명·우선순위·마감일 입력을 검사해 저장할 값으로 바꾼다.
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

// 저장값의 항목을 검사한다. T02·T03에서 저장한 항목처럼 새 필드가 없으면 기본값을 채운다.
// 필드가 있는데 형식이 틀리면 null을 돌려 손상된 값으로 처리한다.
function normalizeTask(task) {
  if (
    task === null ||
    typeof task !== "object" ||
    typeof task.id !== "string" ||
    task.id.length === 0 ||
    typeof task.title !== "string" ||
    task.title.trim().length === 0 ||
    task.title.length > TITLE_MAX_LENGTH ||
    !TASK_STATUSES.includes(task.status) ||
    typeof task.created_at !== "string"
  ) {
    return null;
  }

  const description = task.description === undefined ? "" : task.description;
  const priority = task.priority === undefined ? "NORMAL" : task.priority;
  const dueDate = task.due_date === undefined ? null : task.due_date;
  if (
    typeof description !== "string" ||
    description.length > DESCRIPTION_MAX_LENGTH ||
    !TASK_PRIORITIES.includes(priority) ||
    (dueDate !== null && !isValidDateString(dueDate))
  ) {
    return null;
  }

  return {
    id: task.id,
    title: task.title,
    description,
    status: task.status,
    priority,
    due_date: dueDate,
    created_at: task.created_at,
  };
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
    if (Array.isArray(parsed)) {
      const normalized = parsed.map(normalizeTask);
      if (normalized.every((task) => task !== null)) {
        return normalized;
      }
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
    item.dataset.id = task.id;
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
  emptyMessage.hidden = tasks.length > 0;
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

form.addEventListener("submit", (event) => {
  event.preventDefault();

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

  const saved = applyChange(() => {
    tasks.push({
      id: createId(),
      title: result.value.title,
      description: result.value.description,
      status: "TODO",
      priority: result.value.priority,
      due_date: result.value.due_date,
      created_at: new Date().toISOString(),
    });
  });
  if (!saved) {
    formError.textContent = SAVE_ERROR_MESSAGE;
    titleInput.focus();
    return;
  }

  formError.textContent = "";
  resetForm();
  titleInput.focus();
  renderTasks();
});

for (const filter of [filterSearch, filterStatus, filterPriority]) {
  filter.addEventListener("input", renderTasks);
}

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
    const saved = applyChange(() => {
      tasks = tasks.filter((item) => item.id !== id);
    });
    if (!saved) {
      formError.textContent = SAVE_ERROR_MESSAGE;
      return;
    }
    if (editingId === id) {
      editingId = null;
      editDraft = null;
    }
    formError.textContent = "";
    renderTasks();
  }
});

taskList.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (field && editDraft) {
    editDraft[field] = event.target.value;
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
  const result = validateTaskInput(editDraft);
  if (result.error) {
    showEditError(editForm, result.error);
    editForm.querySelector(".edit-title").focus();
    return;
  }

  const saved = applyChange(() => {
    const task = findTask(id);
    if (task) {
      Object.assign(task, result.value);
    }
  });
  if (!saved) {
    showEditError(editForm, SAVE_ERROR_MESSAGE);
    editForm.querySelector(".edit-title").focus();
    return;
  }

  editingId = null;
  editDraft = null;
  editError = "";
  renderTasks();
});

tasks = loadTasks();
renderTasks();
