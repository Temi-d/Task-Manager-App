// ===== STATE =====
const STORAGE_KEY = 'ontrack_data';
const JOURNAL_KEY = 'ontrack_journal';
const PRIORITIES = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIORITY_ORDER = ['high', 'medium', 'low'];
const PRIORITY_COLORS = { high: 'high', medium: 'medium', low: 'low' };

const CATEGORIES = [
  { id: 'all', label: 'All Tasks', color: 'all' },
  { id: 'work', label: 'Work', color: 'work' },
  { id: 'health', label: 'Health', color: 'health' },
  { id: 'personal-growth', label: 'Personal Growth', color: 'personal-growth' },
  { id: 'finance', label: 'Finance', color: 'finance' },
  { id: 'home', label: 'Home', color: 'home' },
  { id: 'social', label: 'Social', color: 'social' },
  { id: 'learning', label: 'Learning', color: 'learning' },
];

const state = {
  tasks: [],
  nextId: 1,
  calendarOpen: false,
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
  selectedDate: formatDateKey(new Date()),
  activeCategory: 'all',
  journalOpen: true,
};

let newTaskPriority = 'medium';
let editingTaskId = null;

const DAYS_SHOWN = 3;

// ===== HELPERS =====
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return formatDateKey(new Date());
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ===== DOM REFERENCES =====
const $dateDisplay   = document.getElementById('date-display');
const $calSection    = document.getElementById('calendar-section');
const $calMonthYear  = document.getElementById('cal-month-year');
const $calGrid       = document.getElementById('calendar-grid');
const $calPrev       = document.getElementById('cal-prev');
const $calNext       = document.getElementById('cal-next');
const $taskList      = document.getElementById('task-list');
const $emptyState    = document.getElementById('empty-state');
const $totalCount    = document.getElementById('total-count');
const $doneCount     = document.getElementById('done-count');
const $modalOverlay  = document.getElementById('modal-overlay');
const $modalClose    = document.getElementById('modal-close');
const $modalTitle    = document.getElementById('modal-title');
const $taskInput     = document.getElementById('task-input');
const $taskDate      = document.getElementById('task-date');
const $taskCategory  = document.getElementById('task-category');
const $btnCancel     = document.getElementById('btn-cancel');
const $btnAdd        = document.getElementById('btn-add');
const $streakCount   = document.getElementById('streak-count');
const $streakBadge   = document.getElementById('streak-badge');
const $priorityBtns  = document.querySelectorAll('.priority-btn');
const $navBtns       = document.querySelectorAll('.nav-item');
const $upcomingView  = document.getElementById('upcoming-view');
const $popupOverlay  = document.getElementById('popup-overlay');
const $popupClose    = document.getElementById('popup-close');
const $popupBody     = document.getElementById('popup-body');
const $btnGotIt      = document.getElementById('btn-got-it');
const $sidenav       = document.getElementById('sidenav');
const $sidenavOverlay = document.getElementById('sidenav-overlay');
const $sidenavClose  = document.getElementById('sidenav-close');
const $sidenavCats   = document.getElementById('sidenav-categories');
const $hamburger     = document.getElementById('hamburger');
const $journalTextarea = document.getElementById('journal-textarea');
const $journalStatus = document.getElementById('journal-status');
const $journalToggle  = document.getElementById('journal-toggle');
const $journalBody   = document.getElementById('journal-body');
const $journalToggleBtn = document.getElementById('journal-toggle-btn');

// ===== STORAGE =====
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tasks: state.tasks,
      nextId: state.nextId,
    }));
  } catch (e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.tasks = data.tasks || [];
      state.nextId = data.nextId || 1;
    }
  } catch (e) {}
}

function saveJournal() {
  try {
    localStorage.setItem(JOURNAL_KEY, $journalTextarea.value);
  } catch (e) {}
}

function loadJournal() {
  try {
    const val = localStorage.getItem(JOURNAL_KEY);
    if (val !== null) {
      $journalTextarea.value = val;
    }
  } catch (e) {}
}

// ===== STREAK =====
function calculateStreak() {
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 366; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateKey = formatDateKey(checkDate);
    const dayTasks = state.tasks.filter(t => t.date === dateKey);

    if (dayTasks.length === 0) continue;
    if (dayTasks.every(t => t.done)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function renderStreak() {
  const streak = calculateStreak();
  $streakCount.textContent = streak;
  $streakBadge.style.opacity = streak > 0 ? '1' : '0.6';
}

// ===== UPCOMING TASKS =====
function getUpcomingTasks() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayKeyStr = todayKey();
  const tomorrowKey = formatDateKey(tomorrow);

  return state.tasks.filter(t =>
    (t.date === todayKeyStr || t.date === tomorrowKey) && !t.done
  );
}

function showUpcomingPopup(tasks) {
  $popupBody.innerHTML = '';
  tasks.forEach(task => {
    const el = document.createElement('div');
    el.className = 'popup-task-item';
    const dateLabel = task.date === todayKey() ? 'Today' : 'Tomorrow';
    const color = PRIORITY_COLORS[task.priority] || 'medium';
    el.innerHTML = `
      <div class="popup-task-info">
        <span class="popup-task-text">${escapeHtml(task.text)}</span>
        <span class="popup-task-meta">
          <span class="priority-badge priority-badge-${color}">${PRIORITIES[task.priority] || 'Medium'}</span>
          <span class="popup-task-date">${dateLabel}</span>
        </span>
      </div>
    `;
    $popupBody.appendChild(el);
  });
  $popupOverlay.classList.add('open');
}

function closePopup() {
  $popupOverlay.classList.remove('open');
}

function checkUpcomingTasks() {
  const upcoming = getUpcomingTasks();
  if (upcoming.length > 0) {
    showUpcomingPopup(upcoming);
  }
}

// ===== TOMORROW PREVIEW =====
function renderTomorrowPreview() {
  const $preview = document.getElementById('tomorrow-preview');
  const selected = new Date(state.selectedDate + 'T00:00:00');
  const nextDate = new Date(selected);
  nextDate.setDate(selected.getDate() + 1);
  const nextKey = formatDateKey(nextDate);

  const nextTasks = state.tasks.filter(t => t.date === nextKey && !t.done);

  if (nextTasks.length === 0) {
    $preview.classList.remove('visible');
    return;
  }

  const groups = { high: [], medium: [], low: [] };
  nextTasks.forEach(t => {
    const p = t.priority || 'medium';
    if (groups[p]) groups[p].push(t);
  });

  const dayName = nextDate.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  let html = `
    <div class="tomorrow-preview-header">
      <span class="tomorrow-preview-icon">Upcoming</span>
      <span class="tomorrow-preview-title">${dayName} — ${monthDay}</span>
      <span class="tomorrow-preview-count">${nextTasks.length} upcoming</span>
    </div>
    <div class="tomorrow-preview-list">
  `;

  PRIORITY_ORDER.forEach(p => {
    if (groups[p].length === 0) return;
    groups[p].forEach(task => {
      const color = PRIORITY_COLORS[p];
      html += `
        <div class="tomorrow-preview-item">
          <span class="tomorrow-preview-bullet" style="background:var(--${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}-400)"></span>
          <span class="task-text">${escapeHtml(task.text)}</span>
          <span class="priority-badge priority-badge-${color}">${PRIORITIES[p]}</span>
        </div>
      `;
    });
  });

  html += '</div>';
  $preview.innerHTML = html;
  $preview.classList.add('visible');
}

// ===== UPCOMING VIEW =====
function renderUpcomingView() {
  const selected = new Date(state.selectedDate + 'T00:00:00');
  let html = `
    <div class="upcoming-view-header">
      <span class="upcoming-view-icon">Next Days</span>
      <span class="upcoming-view-title">Next ${DAYS_SHOWN} Days</span>
      <span class="upcoming-view-count" id="upcoming-view-count"></span>
    </div>
  `;

  let totalTasks = 0;

  for (let i = 0; i < DAYS_SHOWN; i++) {
    const dayDate = new Date(selected);
    dayDate.setDate(selected.getDate() + i);
    const dayKey = formatDateKey(dayDate);
    const dayTasks = state.tasks.filter(t => t.date === dayKey && !t.done);

    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    html += `
      <div class="upcoming-day-group">
        <div class="upcoming-day-header">
          <span class="upcoming-day-name">${dayName}</span>
          <span class="upcoming-day-date">${monthDay}</span>
        </div>
    `;

    if (dayTasks.length === 0) {
      html += `<div class="upcoming-day-empty">All caught up</div>`;
    } else {
      totalTasks += dayTasks.length;
      const groups = { high: [], medium: [], low: [] };
      dayTasks.forEach(t => {
        const p = t.priority || 'medium';
        if (groups[p]) groups[p].push(t);
      });

      PRIORITY_ORDER.forEach(p => {
        if (groups[p].length === 0) return;
        groups[p].forEach(task => {
          const color = PRIORITY_COLORS[p];
          html += `
            <div class="upcoming-day-item">
              <span class="upcoming-day-bullet" style="background:var(--${p === 'high' ? 'red' : p === 'medium' ? 'blue' : 'green'}-400)"></span>
              <span class="task-text">${escapeHtml(task.text)}</span>
              <span class="priority-badge priority-badge-${color}">${PRIORITIES[p]}</span>
            </div>
          `;
        });
      });
    }

    html += '</div>';
  }

  $upcomingView.innerHTML = html;
  document.getElementById('upcoming-view-count').textContent = `${totalTasks} pending`;
  $upcomingView.classList.add('visible');
}

function hideUpcomingView() {
  $upcomingView.classList.remove('visible');
}

function setNavActive(action) {
  $navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.action === action);
  });
}

// ===== SIDE NAV =====
function renderCategories() {
  $sidenavCats.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const el = document.createElement('div');
    el.className = 'category-item';
    if (cat.id === state.activeCategory) el.classList.add('active');
    el.dataset.category = cat.id;

    const count = cat.id === 'all'
      ? state.tasks.length
      : state.tasks.filter(t => (t.category || 'none') === cat.id).length;

    el.innerHTML = `
      <span class="category-dot category-dot-${cat.color}"></span>
      <span>${cat.label}</span>
      <span class="category-count">${count}</span>
    `;

    el.addEventListener('click', () => {
      state.activeCategory = cat.id;
      renderCategories();
      renderTasks();
      closeSidenav();
    });

    $sidenavCats.appendChild(el);
  });
}

function openSidenav() {
  $sidenav.classList.add('open');
  $sidenavOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidenav() {
  $sidenav.classList.remove('open');
  $sidenavOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ===== JOURNAL =====
function toggleJournal() {
  state.journalOpen = !state.journalOpen;
  $journalBody.classList.toggle('collapsed', !state.journalOpen);
  $journalToggleBtn.classList.toggle('open', state.journalOpen);
}

function updateJournalStatus() {
  $journalStatus.textContent = 'Auto-saved';
  clearTimeout(window._journalTimer);
  window._journalTimer = setTimeout(() => {
    $journalStatus.textContent = 'Auto-saved';
  }, 2000);
  $journalStatus.textContent = 'Saving...';
}

// ===== INIT =====
function init() {
  loadState();
  renderDate();
  renderStreak();
  renderCalendar();
  renderCategories();
  renderTasks();
  loadJournal();
  bindEvents();
  checkUpcomingTasks();
}

// ===== RENDER DATE =====
function renderDate() {
  $dateDisplay.textContent = formatDisplayDate(new Date());
}

// ===== CALENDAR =====
function renderCalendar() {
  const { calendarMonth, calendarYear } = state;
  $calMonthYear.textContent = `${MONTHS[calendarMonth]} ${calendarYear}`;

  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

  const today = todayKey();
  $calGrid.innerHTML = '';

  const taskMap = {};
  state.tasks.forEach(t => {
    if (!taskMap[t.date]) taskMap[t.date] = { total: 0, done: 0 };
    taskMap[t.date].total++;
    if (t.done) taskMap[t.date].done++;
  });

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const el = createDayEl(day, true);
    $calGrid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const el = createDayEl(d, false, dateKey, today, taskMap[dateKey]);
    $calGrid.appendChild(el);
  }

  const totalCells = $calGrid.children.length;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const el = createDayEl(i, true);
    $calGrid.appendChild(el);
  }
}

function createDayEl(day, isOther, dateKey, today, taskInfo) {
  const el = document.createElement('div');
  el.classList.add('cal-day');
  el.textContent = day;

  if (isOther) {
    el.classList.add('other-month');
    return el;
  }

  if (dateKey === today) el.classList.add('today');
  if (dateKey === state.selectedDate) el.classList.add('selected');

  if (taskInfo) {
    el.classList.add('has-tasks');
    if (taskInfo.total > 0 && taskInfo.done === taskInfo.total) {
      el.classList.add('all-done');
    }
  }

  el.addEventListener('click', () => {
    state.selectedDate = dateKey;
    renderCalendar();
    renderTasks();
  });

  return el;
}

function prevMonth() {
  if (state.calendarMonth === 0) {
    state.calendarMonth = 11;
    state.calendarYear--;
  } else {
    state.calendarMonth--;
  }
  renderCalendar();
}

function nextMonth() {
  if (state.calendarMonth === 11) {
    state.calendarMonth = 0;
    state.calendarYear++;
  } else {
    state.calendarMonth++;
  }
  renderCalendar();
}

function toggleCalendar() {
  state.calendarOpen = !state.calendarOpen;
  $calSection.classList.toggle('open', state.calendarOpen);
  setNavActive(state.calendarOpen ? 'calendar' : 'today');
  if (state.calendarOpen) hideUpcomingView();
}

function closeCalendar() {
  state.calendarOpen = false;
  $calSection.classList.remove('open');
}

// ===== TASKS =====
function getFilteredTasks() {
  const dateTasks = state.tasks.filter(t => t.date === state.selectedDate);
  if (state.activeCategory === 'all') return dateTasks;
  return dateTasks.filter(t => (t.category || 'none') === state.activeCategory);
}

function renderTasks() {
  const tasks = getFilteredTasks();
  $taskList.innerHTML = '';

  const groups = { high: [], medium: [], low: [] };
  tasks.forEach(t => {
    const p = t.priority || 'medium';
    if (groups[p]) groups[p].push(t);
  });

  let hasTasks = false;
  let globalIdx = 0;

  PRIORITY_ORDER.forEach(p => {
    if (groups[p].length === 0) return;
    hasTasks = true;

    const color = PRIORITY_COLORS[p];
    const header = document.createElement('div');
    header.className = `priority-section-header priority-section-${color}`;
    header.innerHTML = `
      <span class="priority-section-dot"></span>
      <span class="priority-section-label">${PRIORITIES[p]} Priority</span>
      <span class="priority-section-count">${groups[p].length}</span>
    `;
    $taskList.appendChild(header);

    groups[p].forEach(task => {
      const item = document.createElement('div');
      item.classList.add('task-item');
      if (task.done) item.classList.add('done');
      item.style.animationDelay = `${globalIdx * 0.05}s`;
      globalIdx++;

      const dateLabel = task.date !== todayKey()
        ? `<span class="task-date-tag">${formatShortDate(task.date)}</span>`
        : '';

      item.innerHTML = `
        <label class="task-checkbox">
          <input type="checkbox" ${task.done ? 'checked' : ''} data-id="${task.id}" />
          <span class="checkmark">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
        </label>
        <span class="task-text">${escapeHtml(task.text)}</span>
        <span class="priority-badge priority-badge-${color}">${PRIORITIES[p]}</span>
        ${dateLabel}
        <span class="task-actions">
          <button class="task-edit" data-id="${task.id}" aria-label="Edit task">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="task-delete" data-id="${task.id}" aria-label="Delete task">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </span>
      `;

      $taskList.appendChild(item);
    });
  });

  $emptyState.classList.toggle('hidden', hasTasks);
  updateCounts();
  renderStreak();
  renderTomorrowPreview();
  renderCategories();

  const isUpcoming = document.querySelector('.nav-item[data-action="upcoming"]').classList.contains('active');
  if (isUpcoming) {
    renderUpcomingView();
  } else {
    hideUpcomingView();
  }
}

function updateCounts() {
  const tasks = getFilteredTasks();
  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;

  $totalCount.textContent = `${total} total`;
  $doneCount.textContent = `${done} done`;
}

function addTask(text, date, priority) {
  const category = $taskCategory.value;
  state.tasks.push({
    id: state.nextId++,
    text: text.trim(),
    date,
    priority: priority || 'medium',
    category: category === 'none' ? '' : category,
    done: false,
  });
  renderTasks();
  renderCalendar();
  saveState();
}

function editTask(id, text, date, priority) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const category = $taskCategory.value;
  task.text = text.trim();
  task.date = date;
  task.priority = priority || 'medium';
  task.category = category === 'none' ? '' : category;
  renderTasks();
  renderCalendar();
  saveState();
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    renderTasks();
    renderCalendar();
    saveState();
  }
}

function deleteTask(id) {
  const items = $taskList.querySelectorAll('.task-item');
  items.forEach(item => {
    const btn = item.querySelector('.task-delete');
    if (btn && Number(btn.dataset.id) === id) {
      item.classList.add('removing');
      item.addEventListener('animationend', () => {
        state.tasks = state.tasks.filter(t => t.id !== id);
        renderTasks();
        renderCalendar();
        saveState();
      }, { once: true });
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== PRIORITY SELECTION =====
function setPriority(p) {
  newTaskPriority = p;
  $priorityBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === p);
  });
}

// ===== MODAL =====
function openAddModal() {
  editingTaskId = null;
  $modalTitle.textContent = 'New Task';
  $btnAdd.textContent = 'Add Task';
  $taskDate.value = state.selectedDate;
  $taskCategory.value = 'none';
  $taskInput.value = '';
  $btnAdd.disabled = true;
  setPriority('medium');
  $modalOverlay.classList.add('open');
  setTimeout(() => $taskInput.focus(), 350);
}

function openEditModal(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  editingTaskId = id;
  $modalTitle.textContent = 'Edit Task';
  $btnAdd.textContent = 'Save Changes';
  $taskDate.value = task.date;
  $taskCategory.value = task.category || 'none';
  $taskInput.value = task.text;
  $btnAdd.disabled = false;
  setPriority(task.priority || 'medium');
  $modalOverlay.classList.add('open');
  setTimeout(() => $taskInput.focus(), 350);
}

function closeModal() {
  $modalOverlay.classList.remove('open');
  editingTaskId = null;
}

function handleSubmit() {
  const text = $taskInput.value.trim();
  const date = $taskDate.value || todayKey();
  if (!text) return;

  if (editingTaskId !== null) {
    editTask(editingTaskId, text, date, newTaskPriority);
    editingTaskId = null;
  } else {
    addTask(text, date, newTaskPriority);
    if (date !== state.selectedDate) {
      state.selectedDate = date;
      const d = new Date(date + 'T00:00:00');
      state.calendarMonth = d.getMonth();
      state.calendarYear = d.getFullYear();
      renderCalendar();
      renderTasks();
    }
  }
  closeModal();
}

// ===== EVENT BINDINGS =====
function bindEvents() {
  $calPrev.addEventListener('click', prevMonth);
  $calNext.addEventListener('click', nextMonth);

  // Side nav
  $hamburger.addEventListener('click', openSidenav);
  $sidenavClose.addEventListener('click', closeSidenav);
  $sidenavOverlay.addEventListener('click', closeSidenav);

  // Bottom nav
  $navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'add') {
        openAddModal();
        return;
      }
      if (action === 'today') {
        closeCalendar();
        setNavActive('today');
        hideUpcomingView();
        state.selectedDate = todayKey();
        const d = new Date();
        state.calendarMonth = d.getMonth();
        state.calendarYear = d.getFullYear();
        renderCalendar();
        renderTasks();
        return;
      }
      if (action === 'calendar') {
        toggleCalendar();
        return;
      }
      if (action === 'journal') {
        closeCalendar();
        setNavActive('journal');
        hideUpcomingView();
        // Scroll to journal section
        document.getElementById('journal-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (action === 'upcoming') {
        closeCalendar();
        const wasActive = btn.classList.contains('active');
        setNavActive(wasActive ? 'today' : 'upcoming');
        if (wasActive) {
          hideUpcomingView();
          state.selectedDate = todayKey();
          const d = new Date();
          state.calendarMonth = d.getMonth();
          state.calendarYear = d.getFullYear();
          renderCalendar();
        }
        renderTasks();
        if (!wasActive) {
          document.getElementById('upcoming-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
    });
  });

  $modalClose.addEventListener('click', closeModal);
  $btnCancel.addEventListener('click', closeModal);
  $btnAdd.addEventListener('click', handleSubmit);

  $modalOverlay.addEventListener('click', (e) => {
    if (e.target === $modalOverlay) closeModal();
  });

  $taskInput.addEventListener('input', () => {
    $btnAdd.disabled = !$taskInput.value.trim();
  });

  $taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && $taskInput.value.trim()) {
      handleSubmit();
    }
  });

  $taskList.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      toggleTask(Number(e.target.dataset.id));
    }
  });

  $taskList.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.task-edit');
    if (editBtn) {
      openEditModal(Number(editBtn.dataset.id));
      return;
    }
    const deleteBtn = e.target.closest('.task-delete');
    if (deleteBtn) {
      deleteTask(Number(deleteBtn.dataset.id));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closePopup();
      closeSidenav();
    }
  });

  $priorityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setPriority(btn.dataset.priority);
    });
  });

  $popupClose.addEventListener('click', closePopup);
  $btnGotIt.addEventListener('click', closePopup);
  $popupOverlay.addEventListener('click', (e) => {
    if (e.target === $popupOverlay) closePopup();
  });

  // Journal
  $journalToggle.addEventListener('click', toggleJournal);
  $journalToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleJournal();
  });

  let journalSaveTimer;
  $journalTextarea.addEventListener('input', () => {
    clearTimeout(journalSaveTimer);
    $journalStatus.textContent = 'Unsaved changes';
    journalSaveTimer = setTimeout(() => {
      saveJournal();
      $journalStatus.textContent = 'Auto-saved';
    }, 600);
  });
}

// ===== LAUNCH =====
init();
