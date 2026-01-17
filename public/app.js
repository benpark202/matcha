import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const config = await fetch('/config').then((res) => res.json());
const supabaseUrl = (config.SUPABASE_URL || '').trim();
const supabaseAnonKey = (config.SUPABASE_ANON_KEY || '').trim();
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const passwordRevealButton = document.getElementById('passwordRevealButton');
const signInButton = document.getElementById('signInButton');
const createAccountButton = document.getElementById('createAccountButton');
const authStatus = document.getElementById('authStatus');
const signOutButton = document.getElementById('signOutButton');
const authForm = document.getElementById('authForm');

const bannerPreview = document.getElementById('bannerPreview');
const bannerUpload = document.getElementById('bannerUpload');
const bannerChangeButton = document.getElementById('bannerChangeButton');
const bannerRemoveButton = document.getElementById('bannerRemoveButton');
const greetingMessage = document.getElementById('greetingMessage');
const profileSidebarToggle = document.getElementById('profileSidebarToggle');
const profileSidebar = document.getElementById('profileSidebar');
const profileSidebarClose = document.getElementById('profileSidebarClose');
const profileSidebarName = document.getElementById('profileSidebarName');
const profileSidebarStatus = document.getElementById('profileSidebarStatus');
const profileDarkModeToggle = document.getElementById('profileDarkModeToggle');
const darkModeState = document.getElementById('darkModeState');
const appShell = document.querySelector('.app-shell');
const calendarContent = document.getElementById('calendarContent');
const viewButtons = Array.from(document.querySelectorAll('[data-view]'));
const viewHeadline = document.getElementById('viewHeadline');
const prevPeriod = document.getElementById('prevPeriod');
const nextPeriod = document.getElementById('nextPeriod');

const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const tasksList = document.getElementById('tasksList');
const assignmentForm = document.getElementById('assignmentForm');
const assignmentInput = document.getElementById('assignmentInput');
const assignmentsList = document.getElementById('assignmentsList');
const tasksRatioDisplay = document.getElementById('tasksRatio');
const assignmentsRatioDisplay = document.getElementById('assignmentsRatio');

const body = document.body;
const DARK_MODE_STORAGE_KEY = 'matcha-dark-mode-enabled';
let darkModeEnabled = false;
let isProfileSidebarOpen = false;

let isAuthenticated = false;
let displayName = 'matcha';
let lastGreetingIndex = null;

function ensurePathForAuth(authenticated) {
  const desiredPath = authenticated ? '/dashboard' : '/';
  const currentPath = window.location.pathname;
  if (currentPath === desiredPath) {
    return;
  }
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', desiredPath);
  } else {
    window.location.pathname = desiredPath;
  }
}

function setAuthenticatedState(value) {
  isAuthenticated = value;
  body.dataset.authenticated = value ? 'true' : 'false';
  ensurePathForAuth(value);
  if (value) {
    updateSelectedDate();
  }
  if (profileSidebarStatus) {
    profileSidebarStatus.textContent = value ? 'signed in' : 'signed out';
  }
  setProfileControlsVisibility(value);
}

function closeProfileSidebar() {
  profileSidebar?.setAttribute('aria-hidden', 'true');
  profileSidebarToggle?.setAttribute('aria-expanded', 'false');
  profileSidebarToggle?.classList.remove('is-active');
  appShell?.classList.remove('has-profile-sidebar');
  isProfileSidebarOpen = false;
}

function openProfileSidebar() {
  if (!profileSidebar) {
    return;
  }
  profileSidebar.setAttribute('aria-hidden', 'false');
  profileSidebarToggle?.setAttribute('aria-expanded', 'true');
  profileSidebarToggle?.classList.add('is-active');
  appShell?.classList.add('has-profile-sidebar');
  isProfileSidebarOpen = true;
}

function setProfileControlsVisibility(show) {
  if (!profileSidebarToggle) {
    return;
  }
  if (show) {
    profileSidebarToggle.classList.remove('hidden');
    return;
  }
  profileSidebarToggle.classList.add('hidden');
  closeProfileSidebar();
}

function readDarkModePreference() {
  if (!('localStorage' in window)) {
    return false;
  }
  try {
    return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
}

function persistDarkModePreference(enabled) {
  if (!('localStorage' in window)) {
    return;
  }
  try {
    localStorage.setItem(DARK_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (error) {
    // ignore failures when storage is unavailable
  }
}

function applyDarkMode(enabled, shouldPersist = true) {
  darkModeEnabled = enabled;
  body.classList.toggle('dark-mode', enabled);
  profileDarkModeToggle?.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  if (darkModeState) {
    darkModeState.textContent = enabled ? 'on' : 'off';
  }
  if (shouldPersist) {
    persistDarkModePreference(enabled);
  }
}

setAuthenticatedState(false);

applyDarkMode(readDarkModePreference(), false);

if (profileSidebarToggle) {
  profileSidebarToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (isProfileSidebarOpen) {
      closeProfileSidebar();
    } else {
      openProfileSidebar();
    }
  });
}

if (profileSidebar) {
  profileSidebar.addEventListener('click', (event) => {
    event.stopPropagation();
  });
}

if (profileSidebarClose) {
  profileSidebarClose.addEventListener('click', closeProfileSidebar);
}

if (profileDarkModeToggle) {
  profileDarkModeToggle.addEventListener('click', () => {
    applyDarkMode(!darkModeEnabled);
  });
}

document.addEventListener('click', (event) => {
  if (!isProfileSidebarOpen) {
    return;
  }
  if (profileSidebar?.contains(event.target)) {
    return;
  }
  if (profileSidebarToggle?.contains(event.target)) {
    return;
  }
  closeProfileSidebar();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeProfileSidebar();
  }
});

const TASK_STORAGE_KEY = 'matcha-tasks';
const ASSIGNMENT_STORAGE_KEY = 'matcha-assignments';

let taskCache = loadTaskCache();
let selectedDate = new Date();
let currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
const todayKey = dateKey(new Date());
let assignments = loadAssignmentCache();

const BANNER_STORAGE_KEY = 'matcha-banner';
const HEIC_MIME_TYPES = ['image/heic', 'image/heif'];
const HEIC_EXTENSIONS = ['.heic', '.heif'];
let viewMode = 'daily';
const CALENDAR_TIMELINE_START_HOUR = 0;
const CALENDAR_TIMELINE_END_HOUR = 24;
const TIME_LINE_UPDATE_INTERVAL = 30 * 1000;
const GREETING_ROTATION_INTERVAL_MS = 30 * 1000;

function deriveDisplayName(session) {
  const metadata = session?.user?.user_metadata || {};
  const nameFromMetadata = metadata?.full_name || metadata?.name;
  if (nameFromMetadata?.trim()) {
    return nameFromMetadata.trim().split(' ')[0];
  }
  const email = session?.user?.email;
  if (email) {
    return email.split('@')[0];
  }
  return 'matcha';
}

function applySessionDetails(session) {
  displayName = session ? deriveDisplayName(session) : 'matcha';
  refreshGreeting();
}

function loadTaskCache() {
  try {
    return JSON.parse(localStorage.getItem(TASK_STORAGE_KEY) || '{}');
  } catch (error) {
    console.error('failed to parse saved tasks', error);
    return {};
  }
}

function loadAssignmentCache() {
  if (!('localStorage' in window)) {
    return [];
  }
  try {
    return JSON.parse(localStorage.getItem(ASSIGNMENT_STORAGE_KEY) || '[]');
  } catch (error) {
    console.error('failed to parse saved assignments', error);
    return [];
  }
}

function persistTasks() {
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(taskCache));
}

function persistAssignments() {
  if (!('localStorage' in window)) {
    return;
  }
  localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments));
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tasksForDate(date) {
  return taskCache[dateKey(date)] || [];
}

function setTasksForDate(date, tasks) {
  const storageKey = dateKey(date);
  if (tasks.length) {
    taskCache = { ...taskCache, [storageKey]: tasks };
  } else {
    const { [storageKey]: _removed, ...rest } = taskCache;
    taskCache = rest;
  }
  persistTasks();
}

function updateTasksRatio(todaysTasks = null) {
  if (!tasksRatioDisplay) {
    return;
  }
  const tasks = todaysTasks || tasksForDate(selectedDate);
  const total = tasks.length;
  const completed = tasks.reduce((count, task) => count + (task.done ? 1 : 0), 0);
  const ratioText = total ? `${completed}/${total} done` : '0/0 done';
  tasksRatioDisplay.textContent = ratioText;
}

function captureAssignmentRects() {
  const map = new Map();
  if (!assignmentsList) {
    return map;
  }
  assignmentsList.querySelectorAll('.assignment-row').forEach((row) => {
    map.set(row.dataset.assignmentId, row.getBoundingClientRect());
  });
  return map;
}

function updateAssignmentsRatio() {
  if (!assignmentsRatioDisplay) {
    return;
  }
  const total = assignments.length;
  const flaggedCount = assignments.filter((assignment) => assignment.flagged).length;
  const ratioText = total ? `${flaggedCount}/${total} flagged` : '0/0 flagged';
  assignmentsRatioDisplay.textContent = ratioText;
}

function animateAssignmentReorder(previousRects) {
  if (!assignmentsList) {
    return;
  }
  assignmentsList.querySelectorAll('.assignment-row').forEach((row) => {
    const prevRect = previousRects.get(row.dataset.assignmentId);
    if (!prevRect) {
      return;
    }
    const nextRect = row.getBoundingClientRect();
    const deltaY = prevRect.top - nextRect.top;
    if (!deltaY) {
      return;
    }
    row.style.transition = 'transform 0.3s ease';
    row.style.transform = `translateY(${deltaY}px)`;
    requestAnimationFrame(() => {
      row.style.transform = '';
    });
    const cleanup = () => {
      row.style.transition = '';
      row.removeEventListener('transitionend', cleanup);
    };
    row.addEventListener('transitionend', cleanup);
  });
}

function renderAssignments({ animate = true } = {}) {
  if (!assignmentsList) {
    return;
  }
  const previousRects = animate ? captureAssignmentRects() : new Map();
  const ordered = [...assignments].sort((a, b) => {
    if (a.flagged === b.flagged) {
      return a.createdAt - b.createdAt;
    }
    return (b.flagged ? 1 : 0) - (a.flagged ? 1 : 0);
  });
  assignments = ordered;
  updateAssignmentsRatio();
  assignmentsList.innerHTML = '';

  if (!ordered.length) {
    const message = document.createElement('p');
    message.className = 'status-line muted';
    message.textContent = 'no assignments yet';
    assignmentsList.appendChild(message);
    return;
  }

  ordered.forEach((assignment) => {
    const row = document.createElement('div');
    row.className = 'assignment-row';
    if (assignment.flagged) {
      row.classList.add('is-flagged');
    }
    row.dataset.assignmentId = assignment.id;

    const text = document.createElement('span');
    text.textContent = assignment.text;

    const actions = document.createElement('div');
    actions.className = 'assignment-actions';
    const flagButton = document.createElement('button');
    flagButton.type = 'button';
    flagButton.className = 'assignment-flag-btn';
    flagButton.dataset.action = 'flag';
    flagButton.setAttribute('aria-pressed', String(assignment.flagged));
    flagButton.setAttribute(
      'aria-label',
      assignment.flagged ? 'unflag assignment' : 'flag assignment'
    );
    if (assignment.flagged) {
      flagButton.classList.add('is-active');
    }
    const flagIcon = document.createElement('span');
    flagIcon.className = 'assignment-flag-icon';
    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = assignment.flagged ? 'flagged' : 'flag';
    flagButton.append(flagIcon, srText);
    actions.append(flagButton);

    row.append(text, actions);
    assignmentsList.appendChild(row);
  });

  if (animate) {
    requestAnimationFrame(() => animateAssignmentReorder(previousRects));
  }
}

function createTimeLabels(className) {
  const column = document.createElement('div');
  column.className = className;
  column.classList.add('calendar-time-labels');
  for (let hour = CALENDAR_TIMELINE_START_HOUR; hour < CALENDAR_TIMELINE_END_HOUR; hour += 1) {
    const label = document.createElement('span');
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const period = hour < 12 ? 'am' : 'pm';
    label.textContent = `${displayHour} ${period}`;
    column.appendChild(label);
  }
  return column;
}

function createTimeLine(view) {
  const line = document.createElement('div');
  line.className = 'time-line';
  line.dataset.view = view;
  return line;
}

function refreshCurrentTimeLine() {
  const now = new Date();
  const totalMinutes = (CALENDAR_TIMELINE_END_HOUR - CALENDAR_TIMELINE_START_HOUR) * 60;
  const minutesSinceStart =
    now.getHours() * 60 +
    now.getMinutes() -
    CALENDAR_TIMELINE_START_HOUR * 60;
  const clampedMinutes = Math.max(0, Math.min(minutesSinceStart, totalMinutes));
  const ratio = totalMinutes ? clampedMinutes / totalMinutes : 0;
  const showLine = minutesSinceStart >= 0 && minutesSinceStart <= totalMinutes;
  document.querySelectorAll('.time-line').forEach((line) => {
    line.style.top = `${ratio * 100}%`;
    line.style.display = showLine ? 'block' : 'none';
  });
}

function applyBannerImage(value) {
  if (!bannerPreview) return;
  bannerPreview.style.backgroundImage = `url(${value})`;
  bannerPreview.classList.add('has-image');
}

function clearBannerImage() {
  if (!bannerPreview) return;
  bannerPreview.style.backgroundImage = '';
  bannerPreview.classList.remove('has-image');
  if (bannerUpload) {
    bannerUpload.value = '';
  }
  if ('localStorage' in window) {
    localStorage.removeItem(BANNER_STORAGE_KEY);
  }
}

function loadStoredBanner() {
  if (!('localStorage' in window)) return;
  const stored = localStorage.getItem(BANNER_STORAGE_KEY);
  if (stored) {
    applyBannerImage(stored);
  }
}

function isHeicFile(file) {
  if (!file) {
    return false;
  }
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (HEIC_MIME_TYPES.includes(type)) {
    return true;
  }
  return HEIC_EXTENSIONS.some((extension) => name.endsWith(extension));
}

async function ensureBannerCompatibleFile(file) {
  if (!isHeicFile(file)) {
    return file;
  }
  const converter = globalThis?.heic2any;
  if (typeof converter !== 'function') {
    console.warn('HEIC conversion library missing; using original banner file');
    return file;
  }
  try {
    const converted = await converter({
      blob: file,
      toType: 'image/png',
      quality: 0.92,
    });
    return converted instanceof Blob ? converted : file;
  } catch (error) {
    console.error('failed to convert HEIC banner image', error);
    return file;
  }
}

async function handleBannerUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const fileToRead = await ensureBannerCompatibleFile(file);
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    applyBannerImage(dataUrl);
    localStorage.setItem(BANNER_STORAGE_KEY, dataUrl);
  };
  reader.readAsDataURL(fileToRead);
}


function refreshGreeting() {
  if (!greetingMessage) return;
  const hour = new Date().getHours();
  const period =
    hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const name = displayName || 'matcha';
  const capitalize = (value) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  const capitalizedName = capitalize(name);
  const greetings = [
    `Good ${period}, ${name}`,
    `${capitalize(period)}, ${name}`,
    "let's get to work",
    'ready to roll',
  ];
  let variantIndex = Math.floor(Math.random() * greetings.length);
  if (greetings.length > 1 && variantIndex === lastGreetingIndex) {
    variantIndex = (variantIndex + 1) % greetings.length;
  }
  lastGreetingIndex = variantIndex;
  greetingMessage.textContent = greetings[variantIndex];
  if (profileSidebarName) {
    profileSidebarName.textContent = capitalizedName;
  }
}

function setStatus(message, tone) {
  authStatus.textContent = message;
  if (!message) {
    authStatus.removeAttribute('data-status');
    return;
  }
  authStatus.dataset.status = tone || 'neutral';
}

function updatePasswordRevealButton(isVisible) {
  if (!passwordRevealButton) {
    return;
  }
  passwordRevealButton.textContent = isVisible ? 'hide' : 'show';
  passwordRevealButton.setAttribute('aria-pressed', String(isVisible));
  passwordRevealButton.setAttribute('aria-label', isVisible ? 'hide password' : 'show password');
}

function togglePasswordVisibility() {
  if (!passwordInput) {
    return;
  }
  const shouldShow = passwordInput.type === 'password';
  passwordInput.type = shouldShow ? 'text' : 'password';
  updatePasswordRevealButton(shouldShow);
  if (shouldShow) {
    passwordInput.focus();
  }
}

function setViewMode(mode) {
  viewMode = mode;
  viewButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === mode);
  });
  updateSelectedDate();
}

function changePeriod(delta) {
  if (viewMode === 'monthly') {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
    selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  } else if (viewMode === 'weekly') {
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + delta * 7);
  } else {
    selectedDate = new Date(selectedDate);
    selectedDate.setDate(selectedDate.getDate() + delta);
  }
  currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  updateSelectedDate();
}

function renderView() {
  if (!calendarContent) return;
  calendarContent.innerHTML = '';
  if (viewMode === 'monthly') {
    renderMonthlyView();
  } else if (viewMode === 'weekly') {
    renderWeeklyView();
  } else {
    renderDailyView();
  }
  refreshCurrentTimeLine();
}

function renderMonthlyView() {
  const monthName = currentMonth.toLocaleString('default', { month: 'long' }).toLowerCase();
  viewHeadline.textContent = `${monthName} ${currentMonth.getFullYear()}`;
  const dayNames = document.createElement('div');
  dayNames.className = 'day-names';
  ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach((label) => {
    const span = document.createElement('span');
    span.textContent = label;
    dayNames.appendChild(span);
  });

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const emptySlots = firstDay.getDay();

  for (let i = 0; i < emptySlots; i += 1) {
    const spacer = document.createElement('span');
    spacer.className = 'calendar-day empty';
    grid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const cellDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-day';
    cell.dataset.date = cellDate.toISOString();
    cell.textContent = day;

    if (dateKey(cellDate) === todayKey) {
      cell.classList.add('today');
    }

    if (dateKey(cellDate) === dateKey(selectedDate)) {
      cell.classList.add('selected');
    }

    cell.addEventListener('click', () => {
      selectedDate = new Date(cellDate);
      updateSelectedDate();
    });

    grid.appendChild(cell);
  }

  calendarContent.appendChild(dayNames);
  calendarContent.appendChild(grid);
}

function renderWeeklyView() {
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weeklyHeadline = `${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  viewHeadline.textContent = weeklyHeadline.toLowerCase();

  const weekContainer = document.createElement('div');
  weekContainer.className = 'weekly-grid weekly-view__grid';

  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayColumn = document.createElement('button');
    dayColumn.type = 'button';
    dayColumn.className = 'weekly-column';
    dayColumn.dataset.date = day.toISOString();

    if (dateKey(day) === dateKey(selectedDate)) {
      dayColumn.classList.add('is-selected');
    }

    const heading = document.createElement('div');
    heading.className = 'weekly-column__label';
    const shortDay = day
      .toLocaleDateString('en-US', { weekday: 'short' })
      .charAt(0);
    heading.textContent = `${shortDay}${day.getDate()}`.toLowerCase();

    dayColumn.appendChild(heading);
    dayColumn.addEventListener('click', () => {
      selectedDate = new Date(day);
      updateSelectedDate();
    });
    weekContainer.appendChild(dayColumn);
  }

  const weeklyWrapper = document.createElement('div');
  weeklyWrapper.className = 'weekly-view';

  const timeLabels = createTimeLabels('weekly-view__times');

  const weeklyContent = document.createElement('div');
  weeklyContent.className = 'weekly-view__content';
  weeklyContent.appendChild(weekContainer);
  weeklyContent.appendChild(createTimeLine('weekly'));

  weeklyWrapper.append(timeLabels, weeklyContent);
  calendarContent.appendChild(weeklyWrapper);
}

function renderDailyView() {
  viewHeadline.textContent = formatWeekday(selectedDate);
  const container = document.createElement('div');
  container.className = 'daily-view';

  const grid = document.createElement('div');
  grid.className = 'daily-view__grid';

  const timeline = createTimeLabels('daily-view__times');

  const eventsColumn = document.createElement('div');
  eventsColumn.className = 'daily-view__events';

  eventsColumn.append(createTimeLine('daily'));

  grid.append(timeline, eventsColumn);
  container.append(grid);
  calendarContent.append(container);
}

function formatWeekday(date) {
  return date
    .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    .toLowerCase();
}

function renderTasks() {
  tasksList.innerHTML = '';
  const todaysTasks = tasksForDate(selectedDate);
  updateTasksRatio(todaysTasks);

  if (!todaysTasks.length) {
    const empty = document.createElement('p');
    empty.className = 'status-line muted';
    empty.textContent = 'no tasks yet';
    tasksList.appendChild(empty);
    return;
  }

  todaysTasks.forEach((task) => {
    const row = document.createElement('div');
    row.className = 'task-row';
    row.dataset.taskId = task.id;
    if (task.done) {
      row.classList.add('is-done');
    }

    const checkbox = document.createElement('button');
    checkbox.type = 'button';
    checkbox.className = 'task-checkbox';
    checkbox.dataset.action = 'toggle';
    checkbox.setAttribute('aria-pressed', String(task.done));
    checkbox.setAttribute('aria-label', task.done ? 'mark as not done' : 'mark as done');

    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;

    row.append(checkbox, text);
    tasksList.appendChild(row);
  });
}

function updateSelectedDate() {
  currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderTasks();
  renderView();
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = taskInput.value.trim();
  if (!value) {
    return;
  }

  const todaysTasks = tasksForDate(selectedDate);
  const updated = [...todaysTasks, { id: Date.now().toString(), text: value, done: false }];
  setTasksForDate(selectedDate, updated);
  taskInput.value = '';
  updateSelectedDate();
});

tasksList.addEventListener('click', (event) => {
  if (event.target.dataset.action !== 'toggle') return;
  const row = event.target.closest('.task-row');
  if (!row) return;
  const taskId = row.dataset.taskId;
  const todaysTasks = tasksForDate(selectedDate);
  const updated = todaysTasks.map((task) =>
    task.id === taskId ? { ...task, done: !task.done } : task
  );
  setTasksForDate(selectedDate, updated);

  updateSelectedDate();
});

if (assignmentForm) {
  assignmentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!assignmentInput) {
      return;
    }
    const value = assignmentInput.value.trim();
    if (!value) {
      return;
    }
    const newAssignment = {
      id: Date.now().toString(),
      text: value,
      flagged: false,
      createdAt: Date.now(),
    };
    assignments = [...assignments, newAssignment];
    persistAssignments();
    assignmentInput.value = '';
    renderAssignments();
  });
}

if (assignmentsList) {
  assignmentsList.addEventListener('click', (event) => {
    const action = event.target.dataset.action;
    if (action !== 'flag') {
      return;
    }
    const row = event.target.closest('.assignment-row');
    if (!row) {
      return;
    }
    const assignmentId = row.dataset.assignmentId;
    let changed = false;
    assignments = assignments.map((assignment) => {
      if (assignment.id !== assignmentId) {
        return assignment;
      }
      changed = true;
      return { ...assignment, flagged: !assignment.flagged };
    });
    if (!changed) {
      return;
    }
    persistAssignments();
    renderAssignments();
  });
}

viewButtons.forEach((button) => {
  button.addEventListener('click', () => setViewMode(button.dataset.view));
});

prevPeriod.addEventListener('click', () => changePeriod(-1));
nextPeriod.addEventListener('click', () => changePeriod(1));

authForm.addEventListener('submit', (event) => {
  event.preventDefault();
  authenticateWithPassword('signIn');
});

if (passwordRevealButton) {
  passwordRevealButton.addEventListener('click', togglePasswordVisibility);
  updatePasswordRevealButton(false);
}

async function authenticateWithPassword(action) {
  if (!supabase) {
    setStatus('configure supabase credentials to enable signin', 'error');
    return;
  }

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setStatus('enter an email and password', 'error');
    return;
  }

  setStatus(action === 'signIn' ? 'signing in…' : 'creating account…');

  const handler =
    action === 'signIn'
      ? supabase.auth.signInWithPassword
      : supabase.auth.signUp;

  const { error } = await handler.call(supabase.auth, {
    email,
    password,
  });

  if (error) {
    setStatus(error.message, 'error');
  } else {
    setStatus(
      action === 'signIn'
        ? 'signed in – welcome back'
        : 'account created – welcome'
    );
    passwordInput.value = '';
    if (passwordInput.type !== 'password') {
      passwordInput.type = 'password';
    }
    updatePasswordRevealButton(false);
  }
}

signInButton.addEventListener('click', () => authenticateWithPassword('signIn'));
createAccountButton.addEventListener('click', () => authenticateWithPassword('signUp'));

if (bannerChangeButton && bannerUpload) {
  bannerChangeButton.addEventListener('click', () => bannerUpload.click());
}

if (bannerRemoveButton) {
  bannerRemoveButton.addEventListener('click', clearBannerImage);
}

if (bannerUpload) {
  bannerUpload.addEventListener('change', handleBannerUpload);
}

refreshGreeting();
setInterval(refreshGreeting, GREETING_ROTATION_INTERVAL_MS);
loadStoredBanner();
refreshCurrentTimeLine();
setInterval(refreshCurrentTimeLine, TIME_LINE_UPDATE_INTERVAL);

if (supabase) {

  signOutButton.addEventListener('click', async () => {
    closeProfileMenu();
    await supabase.auth.signOut();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    const authenticated = Boolean(session?.user);
    applySessionDetails(session);
    setAuthenticatedState(authenticated);
    if (authenticated) {
      setStatus(`signed in as ${session.user.email}`, 'success');
      setProfileControlsVisibility(true);
    } else {
      setStatus('');
      setProfileControlsVisibility(false);
    }
  });

  const { data } = await supabase.auth.getSession();
  const initialSession = data?.session;
  const authenticated = Boolean(initialSession?.user);
  applySessionDetails(initialSession);
  setAuthenticatedState(authenticated);
  if (authenticated) {
    setStatus(`signed in as ${initialSession.user.email}`, 'success');
    setProfileControlsVisibility(true);
  } else {
    setProfileControlsVisibility(false);
  }
  signInButton.disabled = false;
  createAccountButton.disabled = false;
} else {
  setAuthenticatedState(false);
  setProfileControlsVisibility(false);
  signInButton.disabled = true;
  createAccountButton.disabled = true;
  setStatus('configure supabase credentials to enable signin', 'error');
}

updateSelectedDate();
renderAssignments({ animate: false });
openProfileSidebar();
