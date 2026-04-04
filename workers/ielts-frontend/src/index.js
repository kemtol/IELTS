const ROUTES = {
  onboarding: 'index.html',
  login: 'login.html',
  placement: 'placement.html',
  studyplan: 'studyplan.html',
  practice: 'practice.html',
  writing: 'writing.html',
  speaking: 'speaking.html',
  dashboard: 'dashboard.html',
};

const CORE_API_BASE = window.CORE_API_BASE || 'https://ielts-core.mkemalw.workers.dev';
const AUTH_TOKEN_KEY = 'bandup_auth_token';
const AUTH_USER_KEY = 'bandup_auth_user';
const WRITING_TASK_KEY = 'bandup_writing_task_id';
const SPEAKING_TASK_KEY = 'bandup_speaking_task_id';

const PROTECTED_PAGES = new Set(['placement', 'studyplan', 'practice', 'writing', 'speaking', 'dashboard']);

const placementState = {
  questions: [],
  answers: {},
  currentIndex: 0,
  loading: false,
  submitting: false,
  started: false,
};

const practiceState = {
  tasks: [],
  loading: false,
};

let speakingDurationSeconds = 0;
let recActive = false;
let recInterval;

function currentPageFile() {
  const path = window.location.pathname;
  const file = path.split('/').pop();
  return file || 'index.html';
}

function showScreen(id) {
  const target = ROUTES[id] || ROUTES.onboarding;
  if (currentPageFile() !== target) {
    window.location.href = target;
  }
}

function getEl(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseJsonSafe(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveAuth(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function updateStoredUser(patch) {
  const current = getStoredUser();
  if (!current) return;
  const next = { ...current, ...patch };
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(next));
}

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  return parseJsonSafe(raw, null);
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(WRITING_TASK_KEY);
  localStorage.removeItem(SPEAKING_TASK_KEY);
}

async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    auth = false,
    headers = {},
  } = options;

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Missing auth token');
    }
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${CORE_API_BASE.replace(/\/$/, '')}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({ ok: false, error: { message: 'Invalid API response' } }));

  if (!response.ok || payload?.ok === false) {
    const message = payload?.error?.message || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

async function ensureAuthenticated() {
  if (!PROTECTED_PAGES.has(document.body?.dataset.page || '')) {
    return true;
  }

  const token = getAuthToken();
  if (!token) {
    showScreen('login');
    return false;
  }

  try {
    const me = await apiRequest('/api/v1/me', { auth: true });
    updateStoredUser(me.user);
    return true;
  } catch {
    clearAuth();
    showScreen('login');
    return false;
  }
}

function setCaption(id, message, tone = 'default') {
  const el = getEl(id);
  if (!el) return;
  el.textContent = message || '';
  if (tone === 'error') el.style.color = 'var(--coral)';
  else if (tone === 'success') el.style.color = 'var(--teal)';
  else if (tone === 'warn') el.style.color = 'var(--amber)';
  else el.style.color = 'var(--text-secondary)';
}

function setButtonState(id, isDisabled) {
  const btn = getEl(id);
  if (!btn) return;
  btn.disabled = !!isDisabled;
  btn.style.opacity = isDisabled ? '0.55' : '1';
  btn.style.cursor = isDisabled ? 'not-allowed' : 'pointer';
}

function nextOnbStep(step) {
  const steps = document.querySelectorAll('[id^="onb-step"]');
  if (!steps.length) return;

  steps.forEach((el) => {
    el.style.display = 'none';
  });

  const activeStep = document.getElementById(`onb-step${step}`);
  if (activeStep) activeStep.style.display = '';

  const dots = document.querySelectorAll('.step-dot');
  dots.forEach((dot, idx) => {
    dot.classList.remove('active', 'done');
    if (idx < step - 1) dot.classList.add('done');
    if (idx === step - 1) dot.classList.add('active');
  });
}

async function registerOnboarding() {
  const fullName = String(getEl('onbNameInput')?.value || '').trim();
  const email = String(getEl('onbEmailInput')?.value || '').trim().toLowerCase();
  const password = String(getEl('onbPasswordInput')?.value || '');

  setCaption('onbStep1Status', 'Creating account...', 'default');
  setButtonState('onbRegisterBtn', true);

  try {
    const payload = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: {
        full_name: fullName,
        email,
        password,
      },
    });

    const verifyLabel = getEl('onbVerifyEmailLabel');
    if (verifyLabel) {
      verifyLabel.innerHTML = `We've sent a 6-digit code to <strong>${escapeHtml(email)}</strong>.`;
    }
    setCaption('onbStep1Status', payload.message || 'Registration success.', 'success');
    setCaption('onbStep2Status', `Use OTP ${payload.dev_otp_code} in test mode.`, 'warn');
    nextOnbStep(2);
  } catch (error) {
    setCaption('onbStep1Status', error.message, 'error');
  } finally {
    setButtonState('onbRegisterBtn', false);
  }
}

async function resendOtp() {
  setCaption('onbStep2Status', 'Use OTP 482901 (test mode).', 'warn');
}

async function verifyOnboarding() {
  const email = String(getEl('onbEmailInput')?.value || '').trim().toLowerCase();
  const otp = String(getEl('onbOtpInput')?.value || '').trim();

  setCaption('onbStep2Status', 'Verifying account...', 'default');
  setButtonState('onbVerifyBtn', true);

  try {
    const payload = await apiRequest('/api/v1/auth/verify', {
      method: 'POST',
      body: {
        email,
        code: otp,
      },
    });

    saveAuth(payload.token, payload.user);
    setCaption('onbStep2Status', 'Verification successful.', 'success');
    nextOnbStep(3);
  } catch (error) {
    setCaption('onbStep2Status', error.message, 'error');
  } finally {
    setButtonState('onbVerifyBtn', false);
  }
}

function selectDuration(el) {
  const parent = el.parentElement;
  if (!parent) return;
  parent.querySelectorAll('.option-item').forEach((item) => item.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleSkill(el) {
  el.classList.toggle('selected');
}

async function completeOnboarding() {
  const targetScore = Number(getEl('onbTargetSelect')?.value || 0);
  const selectedDuration = document.querySelector('#onbDurationWrap .option-item.selected');
  const dailyMinutes = Number(selectedDuration?.dataset.minutes || 60);
  const focusSkills = Array.from(document.querySelectorAll('#onbSkillWrap .skill-toggle.selected'))
    .map((el) => el.dataset.skill)
    .filter(Boolean);

  setCaption('onbStep3Status', 'Saving your goals...', 'default');
  setButtonState('onbCompleteBtn', true);

  try {
    const payload = await apiRequest('/api/v1/onboarding/complete', {
      method: 'POST',
      auth: true,
      body: {
        target_score: targetScore,
        daily_minutes: dailyMinutes,
        focus_skills: focusSkills,
      },
    });

    updateStoredUser(payload.user);
    const finalText = getEl('onbFinalText');
    if (finalText) {
      finalText.textContent = `Target ${payload.user.target_score} saved with ${payload.user.daily_minutes} mins/day focus on ${payload.user.focus_skills.join(', ')}.`;
    }
    setCaption('onbStep3Status', 'Onboarding completed.', 'success');
    nextOnbStep(4);
  } catch (error) {
    setCaption('onbStep3Status', error.message, 'error');
  } finally {
    setButtonState('onbCompleteBtn', false);
  }
}

async function loginUser() {
  const email = String(getEl('loginEmailInput')?.value || '').trim().toLowerCase();
  const password = String(getEl('loginPasswordInput')?.value || '');

  setCaption('loginStatus', 'Signing in...', 'default');
  setButtonState('loginSubmitBtn', true);

  try {
    const payload = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
      },
    });

    saveAuth(payload.token, payload.user);
    setCaption('loginStatus', 'Login successful. Redirecting...', 'success');
    setTimeout(() => showScreen('dashboard'), 300);
  } catch (error) {
    setCaption('loginStatus', error.message, 'error');
  } finally {
    setButtonState('loginSubmitBtn', false);
  }
}

async function handleLogout() {
  const token = getAuthToken();
  if (token) {
    try {
      await apiRequest('/api/v1/auth/logout', {
        method: 'POST',
        auth: true,
      });
    } catch {
      // ignore logout API failure on client side
    }
  }

  clearAuth();
  showScreen('login');
}

function renderPlacementQuestion() {
  const total = placementState.questions.length;
  const current = placementState.questions[placementState.currentIndex];

  const started = placementState.started;
  const answeredCount = Object.keys(placementState.answers).length;
  const unansweredCount = Math.max(total - answeredCount, 0);
  const selected = current ? placementState.answers[current.id] || null : null;

  const leftStatus = getEl('placementLeftPanelStatus');
  if (leftStatus) {
    leftStatus.innerHTML = started
      ? 'Answer at least 7 questions to submit your placement test.'
      : 'Click <strong>Mulai Test</strong> to begin.';
  }

  const progressCaption = getEl('placementProgressCaption');
  const progressFill = getEl('placementProgressFill');
  const answeredCaption = getEl('placementAnsweredCaption');
  const answeredBadge = getEl('placementAnsweredBadge');
  const questionMeta = getEl('placementQuestionMeta');
  const questionText = getEl('placementQuestionText');
  const passageCard = getEl('placementPassageCard');
  const passageText = getEl('placementPassageText');
  const optionList = getEl('placementOptionList');
  const questionChips = getEl('placementQuestionChips');
  const nextBtn = getEl('placementNextBtn');
  const prevBtn = getEl('placementPrevBtn');
  const submitBtn = getEl('placementSubmitBtn');

  if (progressCaption) progressCaption.textContent = `${answeredCount} / ${total}`;
  if (progressFill) {
    const pct = total ? Math.round((answeredCount / total) * 100) : 0;
    progressFill.style.width = `${pct}%`;
  }
  if (answeredCaption) answeredCaption.textContent = `${answeredCount} answered`;
  if (answeredBadge) answeredBadge.textContent = `${answeredCount} of ${total}`;

  if (!started || !current) {
    if (questionMeta) questionMeta.textContent = 'Question not started';
    if (questionText) questionText.textContent = 'Start the test to load your first question.';
    if (optionList) optionList.innerHTML = '';
    if (passageCard) passageCard.style.display = 'none';
  } else {
    if (questionMeta) questionMeta.textContent = `Question ${placementState.currentIndex + 1} of ${total} · ${current.section}`;
    if (questionText) questionText.textContent = current.question;

    if (passageCard && passageText) {
      if (current.passage) {
        passageText.textContent = `"${current.passage}"`;
        passageCard.style.display = '';
      } else {
        passageText.textContent = '';
        passageCard.style.display = 'none';
      }
    }

    if (optionList) {
      optionList.innerHTML = (current.options || [])
        .map((option) => {
          const isSelected = selected === option.id;
          return `
            <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectPlacementOption('${option.id}')">
              <div class="option-circle">${escapeHtml(option.id)}</div>
              ${escapeHtml(option.text)}
            </div>
          `;
        })
        .join('');
    }
  }

  if (questionChips) {
    questionChips.innerHTML = placementState.questions
      .map((question, index) => {
        const isCurrent = started && index === placementState.currentIndex;
        const isAnswered = Boolean(placementState.answers[question.id]);
        const background = isCurrent
          ? 'var(--amber)'
          : isAnswered
            ? 'var(--teal)'
            : 'rgba(255,255,255,0.12)';
        const color = isCurrent || isAnswered ? 'white' : 'rgba(255,255,255,0.4)';
        return `
          <div style="width:28px;height:28px;border-radius:6px;background:${background};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:${color}">
            ${index + 1}
          </div>
        `;
      })
      .join('');
  }

  if (prevBtn) setButtonState('placementPrevBtn', !started || placementState.currentIndex === 0 || placementState.loading);
  if (nextBtn) {
    nextBtn.textContent = placementState.currentIndex >= total - 1 ? 'Last question' : 'Next question →';
    setButtonState('placementNextBtn', !started || placementState.currentIndex >= total - 1 || placementState.loading);
  }
  if (submitBtn) {
    submitBtn.textContent = `Submit test (${unansweredCount} unanswered)`;
    setButtonState('placementSubmitBtn', !started || placementState.loading || placementState.submitting);
  }
}

async function loadPlacementQuestions() {
  placementState.loading = true;
  setCaption('placementStatusText', 'Loading placement question bank...', 'default');
  try {
    const payload = await apiRequest('/api/v1/placement/questions?count=10', { auth: true });
    placementState.questions = payload.questions || [];
    placementState.answers = {};
    placementState.currentIndex = 0;
    placementState.started = false;
    setCaption('placementStatusText', 'Question bank ready. Click Mulai Test.', 'success');
  } catch (error) {
    setCaption('placementStatusText', error.message, 'error');
  } finally {
    placementState.loading = false;
    renderPlacementQuestion();
  }
}

function startPlacementTest() {
  if (!placementState.questions.length) {
    setCaption('placementStatusText', 'Question bank not loaded yet.', 'warn');
    return;
  }
  placementState.started = true;
  const startBtn = getEl('placementStartBtn');
  if (startBtn) {
    startBtn.textContent = 'Test Started';
    startBtn.disabled = true;
    startBtn.style.opacity = '0.65';
  }
  setCaption('placementStatusText', 'Test started. Pick your answer and continue.', 'default');
  renderPlacementQuestion();
}

function selectPlacementOption(optionId) {
  if (!placementState.started || placementState.loading) return;
  const current = placementState.questions[placementState.currentIndex];
  if (!current) return;

  placementState.answers[current.id] = optionId;
  setCaption('placementStatusText', '', 'default');
  renderPlacementQuestion();
}

function nextPlacementQuestion() {
  if (!placementState.started || placementState.loading) return;
  if (placementState.currentIndex >= placementState.questions.length - 1) return;
  placementState.currentIndex += 1;
  renderPlacementQuestion();
}

function prevPlacementQuestion() {
  if (!placementState.started || placementState.loading) return;
  if (placementState.currentIndex <= 0) return;
  placementState.currentIndex -= 1;
  renderPlacementQuestion();
}

async function submitPlacementTest() {
  if (!placementState.started || placementState.submitting) return;

  const total = placementState.questions.length;
  const answeredCount = Object.keys(placementState.answers).length;
  const unansweredCount = total - answeredCount;

  if (answeredCount < 7) {
    setCaption('placementStatusText', 'Please answer at least 7 questions before submit.', 'error');
    return;
  }

  const proceed = window.confirm(
    unansweredCount > 0
      ? `You still have ${unansweredCount} unanswered question(s). Submit anyway?`
      : 'Submit placement test now?',
  );

  if (!proceed) return;

  placementState.submitting = true;
  renderPlacementQuestion();
  setCaption('placementStatusText', 'Submitting answers...', 'default');

  try {
    const answers = Object.entries(placementState.answers).map(([question_id, answer]) => ({
      question_id,
      answer,
    }));

    const payload = await apiRequest('/api/v1/placement/grade', {
      method: 'POST',
      auth: true,
      body: { answers },
    });

    updateStoredUser({
      placement_completed: true,
      baseline_score: payload.estimated_band,
    });

    const resultCard = getEl('placementResultCard');
    const resultScore = getEl('placementResultScore');
    const resultSummary = getEl('placementResultSummary');

    if (resultScore) {
      resultScore.textContent = `Band ${payload.estimated_band.toFixed(1)}`;
    }
    if (resultSummary) {
      resultSummary.textContent = `${payload.correct_answers}/${payload.total_questions} correct (${payload.score_percent}%). Placement completed and saved to your profile.`;
    }
    if (resultCard) {
      resultCard.style.display = '';
    }

    const startBtn = getEl('placementStartBtn');
    if (startBtn) {
      startBtn.textContent = 'Placement Completed';
      startBtn.disabled = true;
      startBtn.style.opacity = '0.65';
    }

    placementState.started = false;
    setCaption('placementStatusText', 'Placement test completed successfully.', 'success');
  } catch (error) {
    setCaption('placementStatusText', error.message, 'error');
  } finally {
    placementState.submitting = false;
    renderPlacementQuestion();
  }
}

function renderStudyPlan(plan) {
  const summaryEl = getEl('studyPlanSummary');
  const baselineEl = getEl('studyPlanBaselineVal');
  const targetEl = getEl('studyPlanTargetVal');
  const priorityEl = getEl('studyPlanPriorityList');
  const insightEl = getEl('studyPlanInsight');
  const titleEl = getEl('studyPlanTitle');
  const weekListEl = getEl('studyPlanWeekList');
  const footerEl = getEl('studyPlanFooter');

  if (summaryEl) summaryEl.textContent = plan.summary || '-';
  if (baselineEl) baselineEl.textContent = Number(plan.baseline_score || 0).toFixed(1);
  if (targetEl) targetEl.textContent = Number(plan.target_score || 0).toFixed(1);
  if (insightEl) insightEl.textContent = plan.ai_insight || '-';
  if (titleEl) titleEl.textContent = plan.title || 'Week 1 — Foundation';
  if (footerEl) footerEl.textContent = `Estimated: ${plan.daily_minutes || 60} min/day`;

  if (priorityEl) {
    const focusSkills = Array.isArray(plan.focus_skills) ? plan.focus_skills : [];
    priorityEl.innerHTML = focusSkills.length
      ? focusSkills.map((skill, idx) => {
        const width = `${Math.max(45, 80 - idx * 10)}%`;
        const color = idx === 0 ? 'var(--coral)' : idx === 1 ? 'var(--amber)' : 'var(--teal)';
        return `
          <div class="band-row">
            <p class="band-name">${escapeHtml(skill)}</p>
            <div class="band-bar-wrap"><div class="band-fill" style="width:${width}; background:${color}"></div></div>
            <p class="band-score">P${idx + 1}</p>
          </div>
        `;
      }).join('')
      : '<p class="caption">No priority skills found.</p>';
  }

  if (weekListEl) {
    const weekItems = Array.isArray(plan.week_1) ? plan.week_1 : [];
    weekListEl.innerHTML = weekItems
      .map((item) => {
        const chips = (item.tasks || []).map((task) => `<span class="plan-chip">${escapeHtml(task)}</span>`).join('');
        return `
          <div class="plan-row">
            <div class="day-badge">${escapeHtml(item.day || '-')}</div>
            <div class="plan-tasks">${chips}</div>
          </div>
        `;
      })
      .join('');
  }
}

async function generateStudyPlan() {
  setCaption('studyPlanStatus', 'Generating study plan...', 'default');
  setButtonState('studyPlanGenerateBtn', true);
  try {
    const payload = await apiRequest('/api/v1/study-plan/generate', {
      method: 'POST',
      auth: true,
      body: {},
    });

    renderStudyPlan(payload.plan);
    setCaption('studyPlanStatus', 'Study plan generated and saved.', 'success');
  } catch (error) {
    setCaption('studyPlanStatus', error.message, 'error');
  } finally {
    setButtonState('studyPlanGenerateBtn', false);
  }
}

async function loadStudyPlan() {
  setCaption('studyPlanStatus', 'Loading study plan...', 'default');
  try {
    const payload = await apiRequest('/api/v1/study-plan', { auth: true });
    renderStudyPlan(payload.plan);
    setCaption('studyPlanStatus', 'Study plan loaded.', 'success');
  } catch (error) {
    if (error.status === 404) {
      setCaption('studyPlanStatus', 'No study plan yet. Click Generate Plan.', 'warn');
      return;
    }
    setCaption('studyPlanStatus', error.message, 'error');
  }
}

function taskTypeIcon(type) {
  if (type === 'reading') return '📖';
  if (type === 'writing') return '✍️';
  if (type === 'speaking') return '🎙️';
  return '•';
}

function taskTypeClass(type) {
  if (type === 'reading') return 'reading';
  if (type === 'writing') return 'writing';
  if (type === 'speaking') return 'speaking';
  return 'reading';
}

function renderPracticeTasks(tasks, completedCount, totalCount) {
  const taskList = getEl('practiceTaskList');
  const progressText = getEl('practiceProgressText');
  const progressFill = getEl('practiceProgressFill');
  const remaining = getEl('practiceRemainingText');

  if (progressText) progressText.textContent = `${completedCount} / ${totalCount} tasks`;
  if (progressFill) {
    const pct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    progressFill.style.width = `${pct}%`;
  }
  if (remaining) remaining.textContent = `${Math.max(totalCount - completedCount, 0)} task remaining`;

  if (!taskList) return;

  if (!tasks.length) {
    taskList.innerHTML = '<div class="task-item"><p class="caption">No task available for today.</p></div>';
    return;
  }

  taskList.innerHTML = tasks
    .map((task) => {
      const done = task.status === 'completed';
      const scoreBadge = done && task.score ? `<span class="badge badge-teal">${Number(task.score).toFixed(1)}</span>` : '<span class="badge badge-outline">Pending</span>';
      let actionButton = '';

      if (task.task_type === 'reading' && !done) {
        actionButton = `<button class="btn btn-outline btn-sm" onclick="completeReadingTask('${task.id}')">Mark complete</button>`;
      } else if (task.task_type === 'writing') {
        actionButton = `<button class="btn btn-outline btn-sm" onclick="openWritingTask('${task.id}')">${done ? 'Review' : 'Open'} writing</button>`;
      } else if (task.task_type === 'speaking') {
        actionButton = `<button class="btn btn-outline btn-sm" onclick="openSpeakingTask('${task.id}')">${done ? 'Review' : 'Open'} speaking</button>`;
      }

      return `
        <div class="task-item" style="cursor:default">
          <div class="task-icon ${taskTypeClass(task.task_type)}">${taskTypeIcon(task.task_type)}</div>
          <div class="task-info">
            <p class="task-title">${escapeHtml(task.title)}</p>
            <p class="task-meta">${escapeHtml(task.meta || '')}</p>
          </div>
          <div class="flex flex-col items-end gap-6">
            <span class="task-status ${done ? 'done' : 'pending'}">${done ? 'Completed ✓' : 'In progress'}</span>
            ${scoreBadge}
            ${actionButton}
          </div>
        </div>
      `;
    })
    .join('');
}

function renderPracticeRecentFeedback(feedbackItems) {
  const panel = getEl('practiceRecentFeedback');
  if (!panel) return;

  if (!feedbackItems.length) {
    panel.innerHTML = `
      <div style="padding:16px 20px">
        <p class="caption">No feedback yet. Complete writing and speaking tasks to see insights here.</p>
      </div>
    `;
    return;
  }

  panel.innerHTML = feedbackItems
    .map((item, index) => {
      const border = index === feedbackItems.length - 1 ? '' : 'border-bottom:0.5px solid var(--border);';
      const badgeClass = item.type === 'writing' ? 'badge-amber' : 'badge-teal';
      return `
        <div style="padding:16px 20px; ${border}">
          <div class="flex justify-between items-center mb-4">
            <p class="font-medium" style="font-size:13px">${escapeHtml(item.type)} feedback</p>
            <span class="badge ${badgeClass}">${Number(item.score || 0).toFixed(1)}</span>
          </div>
          <p class="caption">${escapeHtml(item.summary || '')}</p>
        </div>
      `;
    })
    .join('');
}

async function loadDailyPractice() {
  practiceState.loading = true;
  setCaption('practiceStatus', 'Loading daily tasks...', 'default');

  try {
    const user = getStoredUser();
    if (user) {
      const avatar = getEl('practiceAvatar');
      const name = getEl('practiceUserName');
      const target = getEl('practiceTarget');
      if (avatar) avatar.textContent = String(user.full_name || 'TR').slice(0, 2).toUpperCase();
      if (name) name.textContent = user.full_name || '-';
      if (target) target.textContent = user.target_score ? Number(user.target_score).toFixed(1) : '-';
    }

    const payload = await apiRequest('/api/v1/practice/today', { auth: true });
    practiceState.tasks = payload.tasks || [];

    renderPracticeTasks(practiceState.tasks, payload.completed_tasks || 0, payload.total_tasks || 0);

    const dashboardPayload = await apiRequest('/api/v1/progress/dashboard', { auth: true });
    renderPracticeRecentFeedback(dashboardPayload.recent_feedback || []);

    setCaption('practiceStatus', 'Daily tasks loaded.', 'success');
  } catch (error) {
    setCaption('practiceStatus', error.message, 'error');
  } finally {
    practiceState.loading = false;
  }
}

async function completeReadingTask(taskId) {
  setCaption('practiceStatus', 'Marking reading task as completed...', 'default');
  try {
    await apiRequest(`/api/v1/practice/tasks/${taskId}/complete`, {
      method: 'POST',
      auth: true,
      body: {},
    });

    await loadDailyPractice();
    setCaption('practiceStatus', 'Reading task completed.', 'success');
  } catch (error) {
    setCaption('practiceStatus', error.message, 'error');
  }
}

function openWritingTask(taskId) {
  localStorage.setItem(WRITING_TASK_KEY, taskId);
  showScreen('writing');
}

function openSpeakingTask(taskId) {
  localStorage.setItem(SPEAKING_TASK_KEY, taskId);
  showScreen('speaking');
}

function renderWritingFeedback(payload) {
  const panel = getEl('writingFeedbackPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card card-pad mb-16">
      <div class="flex items-center gap-16 mb-16">
        <div class="score-ring-wrap">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#EDE7DE" stroke-width="6"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#D4860A" stroke-width="6"
              stroke-dasharray="213" stroke-dashoffset="${Math.max(10, 213 - Number(payload.overall_score) * 23)}" stroke-linecap="round"/>
          </svg>
          <div class="score-ring-label">
            <span class="score-big">${Number(payload.overall_score).toFixed(1)}</span>
            <span class="score-tiny">BAND</span>
          </div>
        </div>
        <div>
          <p class="font-medium mb-4">Overall band score</p>
          <p class="caption mb-8">Writing Task 2 · Opinion Essay</p>
          <span class="badge badge-teal">${payload.word_count} words</span>
        </div>
      </div>
    </div>
    <div class="feedback-block strength">
      <p class="feedback-title teal">Strengths</p>
      <p class="feedback-text">${escapeHtml(payload.strengths || '')}</p>
    </div>
    <div class="feedback-block improve">
      <p class="feedback-title amber">Areas to improve</p>
      <p class="feedback-text">${escapeHtml(payload.improvements || '')}</p>
    </div>
    <div class="feedback-block error">
      <p class="feedback-title coral">Grammar notes</p>
      <p class="feedback-text">${escapeHtml(payload.grammar_notes || '')}</p>
    </div>
    <button class="btn btn-outline btn-full mt-12" onclick="showScreen('practice')">← Back to daily practice</button>
  `;
}

function bindWritingWordCounter() {
  const textarea = getEl('writingResponseInput');
  const badge = getEl('writingWordCountBadge');
  if (!textarea || !badge) return;

  const update = () => {
    const words = String(textarea.value || '').trim().split(/\s+/).filter(Boolean).length;
    badge.textContent = `${words} words`;
  };

  textarea.addEventListener('input', update);
  update();
}

async function submitWritingTask() {
  const taskId = localStorage.getItem(WRITING_TASK_KEY) || undefined;
  const responseText = String(getEl('writingResponseInput')?.value || '').trim();

  const words = responseText.split(/\s+/).filter(Boolean).length;
  if (words < 150) {
    setCaption('writingStatus', `Minimum 150 words required. Current: ${words}.`, 'error');
    return;
  }

  setCaption('writingStatus', 'Submitting writing task...', 'default');
  setButtonState('writingSubmitBtn', true);

  try {
    const payload = await apiRequest('/api/v1/writing/submit', {
      method: 'POST',
      auth: true,
      body: {
        task_id: taskId,
        response_text: responseText,
      },
    });

    renderWritingFeedback(payload);
    setCaption('writingStatus', 'Writing feedback received.', 'success');
  } catch (error) {
    setCaption('writingStatus', error.message, 'error');
  } finally {
    setButtonState('writingSubmitBtn', false);
  }
}

function ensureWaveKeyframes() {
  if (document.getElementById('wave-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'wave-keyframes';
  style.textContent = `
    @keyframes waveAnim {
      from { transform: scaleY(0.4); }
      to { transform: scaleY(1.2); }
    }
  `;
  document.head.appendChild(style);
}

function toggleRec() {
  const btn = getEl('recBtn');
  const label = getEl('recLabel');
  const hint = getEl('recHint');
  const timerWrap = getEl('recTimerWrap');
  const waveform = getEl('waveform');
  const preview = getEl('audioPreview');
  const timer = getEl('recTimer');
  const durationCaption = getEl('speakingDurationCaption');

  if (!btn || !label || !hint || !timerWrap || !waveform || !preview || !timer || !durationCaption) return;

  if (!recActive) {
    recActive = true;
    speakingDurationSeconds = 0;
    btn.classList.remove('idle');
    btn.classList.add('recording');
    btn.textContent = '⏹';

    label.style.display = 'none';
    hint.style.display = 'none';
    preview.style.display = 'none';
    timerWrap.style.display = '';

    waveform.innerHTML = '';
    for (let i = 0; i < 24; i += 1) {
      const bar = document.createElement('div');
      bar.className = 'wave-bar';
      bar.style.cssText = `height:${8 + Math.random() * 28}px; animation-delay:${(i * 0.06).toFixed(2)}s; animation-duration:${(0.5 + Math.random() * 0.5).toFixed(2)}s`;
      waveform.appendChild(bar);
    }

    timer.textContent = '00:00';
    recInterval = setInterval(() => {
      speakingDurationSeconds += 1;
      const m = String(Math.floor(speakingDurationSeconds / 60)).padStart(2, '0');
      const s = String(speakingDurationSeconds % 60).padStart(2, '0');
      timer.textContent = `${m}:${s}`;
    }, 1000);
  } else {
    recActive = false;
    clearInterval(recInterval);

    if (speakingDurationSeconds < 60) {
      speakingDurationSeconds = 95;
    }

    const m = Math.floor(speakingDurationSeconds / 60);
    const s = String(speakingDurationSeconds % 60).padStart(2, '0');
    durationCaption.textContent = `${m}:${s}`;

    btn.style.display = 'none';
    timerWrap.style.display = 'none';
    preview.style.display = '';
  }
}

function renderSpeakingFeedback(payload) {
  const panel = getEl('speakingFeedbackPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card card-pad mb-16">
      <div class="flex items-center gap-16 mb-16">
        <div class="score-ring-wrap">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#EDE7DE" stroke-width="6"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#0E7A6B" stroke-width="6"
              stroke-dasharray="213" stroke-dashoffset="${Math.max(10, 213 - Number(payload.overall_score) * 23)}" stroke-linecap="round"/>
          </svg>
          <div class="score-ring-label">
            <span class="score-big">${Number(payload.overall_score).toFixed(1)}</span>
            <span class="score-tiny">BAND</span>
          </div>
        </div>
        <div>
          <p class="font-medium mb-4">Overall band score</p>
          <p class="caption mb-8">Speaking Part 2 · Cue Card</p>
          <span class="badge badge-amber">${payload.duration_seconds}s response</span>
        </div>
      </div>
    </div>
    <div class="feedback-block strength">
      <p class="feedback-title teal">Strengths</p>
      <p class="feedback-text">${escapeHtml(payload.strengths || '')}</p>
    </div>
    <div class="feedback-block improve">
      <p class="feedback-title amber">Areas to improve</p>
      <p class="feedback-text">${escapeHtml(payload.improvements || '')}</p>
    </div>
    <div class="feedback-block error">
      <p class="feedback-title coral">Pronunciation notes</p>
      <p class="feedback-text">${escapeHtml(payload.pronunciation_notes || '')}</p>
    </div>
    <button class="btn btn-outline btn-full mt-12" onclick="showScreen('practice')">← Back to daily practice</button>
  `;
}

async function submitSpeakingTask() {
  const taskId = localStorage.getItem(SPEAKING_TASK_KEY) || undefined;
  const transcript = String(getEl('speakingTranscriptInput')?.value || '').trim();

  const duration = speakingDurationSeconds >= 60 ? speakingDurationSeconds : 95;

  setCaption('speakingStatus', 'Submitting speaking task...', 'default');
  setButtonState('speakingSubmitBtn', true);

  try {
    const payload = await apiRequest('/api/v1/speaking/submit', {
      method: 'POST',
      auth: true,
      body: {
        task_id: taskId,
        duration_seconds: duration,
        transcript,
      },
    });

    renderSpeakingFeedback(payload);
    setCaption('speakingStatus', 'Speaking feedback received.', 'success');
  } catch (error) {
    setCaption('speakingStatus', error.message, 'error');
  } finally {
    setButtonState('speakingSubmitBtn', false);
  }
}

function renderDashboard(payload) {
  const { metrics, weekly_activity: weeklyActivity, recent_feedback: recentFeedback, user } = payload;

  const avatar = getEl('dashboardAvatar');
  if (avatar) avatar.textContent = String(user.full_name || 'TR').slice(0, 2).toUpperCase();

  const trendBadge = getEl('dashboardTrendBadge');
  if (trendBadge) {
    trendBadge.textContent = `Trend: ${metrics.trend}`;
  }

  const status = getEl('dashboardStatus');
  if (status) {
    const focusText = Array.isArray(user.focus_skills) && user.focus_skills.length
      ? user.focus_skills.join(', ')
      : '-';
    const targetText = user.target_score ? Number(user.target_score).toFixed(1) : '-';
    const minutesText = user.daily_minutes ? `${user.daily_minutes} mins/day` : '-';
    status.textContent = `${user.full_name} · onboarding ${user.onboarding_completed ? 'completed' : 'pending'} · placement ${user.placement_completed ? 'completed' : 'pending'} · target ${targetText} · ${minutesText} · focus ${focusText}.`;
  }

  const currentBand = getEl('dashCurrentBand');
  if (currentBand) currentBand.textContent = Number(metrics.current_band || 0).toFixed(1);

  const trendText = getEl('dashTrendText');
  if (trendText) {
    const delta = Number(metrics.trend_delta || 0);
    trendText.textContent = `${delta >= 0 ? '↑' : '↓'} ${delta.toFixed(1)} recent change`;
  }

  const targetBand = getEl('dashTargetBand');
  if (targetBand) targetBand.textContent = Number(metrics.target_band || 0).toFixed(1);

  const gapText = getEl('dashGapText');
  if (gapText) {
    const gap = Number(metrics.target_band || 0) - Number(metrics.current_band || 0);
    gapText.textContent = gap > 0 ? `${gap.toFixed(1)} to go` : 'Target reached';
  }

  const tasksCompleted = getEl('dashTasksCompleted');
  if (tasksCompleted) tasksCompleted.textContent = String(metrics.tasks_completed || 0);

  const completionToday = getEl('dashCompletionToday');
  if (completionToday) {
    completionToday.textContent = `${metrics.completion_today || 0}/${metrics.total_today || 0} today`;
  }

  const streak = getEl('dashStudyStreak');
  if (streak) streak.textContent = `${metrics.study_streak || 0} 🔥`;

  const latestWriting = getEl('dashLatestWriting');
  if (latestWriting) latestWriting.textContent = metrics.latest_writing_score ? Number(metrics.latest_writing_score).toFixed(1) : '-';

  const latestSpeaking = getEl('dashLatestSpeaking');
  if (latestSpeaking) latestSpeaking.textContent = metrics.latest_speaking_score ? Number(metrics.latest_speaking_score).toFixed(1) : '-';

  const placementBtn = getEl('dashPlacementBtn');
  if (placementBtn) {
    placementBtn.textContent = user.placement_completed ? 'Retake Placement' : 'Placement Test';
  }

  const weeklyBars = getEl('dashWeeklyBars');
  if (weeklyBars) {
    weeklyBars.innerHTML = (weeklyActivity || [])
      .map((item) => {
        const height = 12 + Number(item.completed || 0) * 22;
        const label = String(item.date || '').slice(5);
        return `
          <div class="bar-col">
            <div class="bar ${item.completed > 0 ? 'filled' : ''}" style="height:${height}px"></div>
            <span class="bar-label">${escapeHtml(label)}</span>
          </div>
        `;
      })
      .join('');
  }

  const weeklySummary = getEl('dashWeeklySummary');
  if (weeklySummary) {
    const totalWeek = (weeklyActivity || []).reduce((sum, item) => sum + Number(item.completed || 0), 0);
    weeklySummary.textContent = `${totalWeek} completed task(s) in the last 7 days.`;
  }

  const recentPanel = getEl('dashRecentFeedback');
  if (recentPanel) {
    if (!(recentFeedback || []).length) {
      recentPanel.innerHTML = '<div style="padding:16px 22px"><p class="caption">No feedback yet. Complete writing and speaking tasks first.</p></div>';
    } else {
      recentPanel.innerHTML = recentFeedback
        .map((item, idx) => {
          const border = idx === recentFeedback.length - 1 ? '' : 'border-bottom:0.5px solid var(--border);';
          const badgeClass = item.type === 'writing' ? 'badge-amber' : 'badge-teal';
          return `
            <div style="padding:16px 22px; ${border}">
              <div class="flex justify-between items-center mb-6">
                <p class="font-medium" style="font-size:13px">${escapeHtml(item.type)}</p>
                <span class="badge ${badgeClass}">${Number(item.score || 0).toFixed(1)}</span>
              </div>
              <p class="caption">${escapeHtml(item.summary || '')}</p>
            </div>
          `;
        })
        .join('');
    }
  }
}

async function loadProgressDashboard() {
  try {
    const payload = await apiRequest('/api/v1/progress/dashboard', { auth: true });
    renderDashboard(payload);
  } catch (error) {
    setCaption('dashboardStatus', error.message, 'error');
  }
}

async function initOnboardingPage() {
  const token = getAuthToken();
  if (token) {
    try {
      const me = await apiRequest('/api/v1/me', { auth: true });
      if (me?.user?.onboarding_completed) {
        showScreen('dashboard');
      }
    } catch {
      clearAuth();
    }
  }
}

function initLoginPage() {
  const token = getAuthToken();
  if (token) {
    showScreen('dashboard');
  }
}

async function initPlacementPage() {
  const ok = await ensureAuthenticated();
  if (!ok) return;
  await loadPlacementQuestions();
}

async function initStudyPlanPage() {
  const ok = await ensureAuthenticated();
  if (!ok) return;
  await loadStudyPlan();
}

async function initPracticePage() {
  const ok = await ensureAuthenticated();
  if (!ok) return;
  await loadDailyPractice();
}

async function initWritingPage() {
  const ok = await ensureAuthenticated();
  if (!ok) return;
  bindWritingWordCounter();

  if (!localStorage.getItem(WRITING_TASK_KEY)) {
    try {
      const payload = await apiRequest('/api/v1/practice/today', { auth: true });
      const task = (payload.tasks || []).find((item) => item.task_type === 'writing');
      if (task) localStorage.setItem(WRITING_TASK_KEY, task.id);
    } catch {
      // ignore
    }
  }
}

async function initSpeakingPage() {
  const ok = await ensureAuthenticated();
  if (!ok) return;

  if (!localStorage.getItem(SPEAKING_TASK_KEY)) {
    try {
      const payload = await apiRequest('/api/v1/practice/today', { auth: true });
      const task = (payload.tasks || []).find((item) => item.task_type === 'speaking');
      if (task) localStorage.setItem(SPEAKING_TASK_KEY, task.id);
    } catch {
      // ignore
    }
  }
}

async function initDashboardPage() {
  const ok = await ensureAuthenticated();
  if (!ok) return;
  await loadProgressDashboard();
}

function initApp() {
  ensureWaveKeyframes();

  const page = document.body?.dataset.page || 'onboarding';
  if (page === 'onboarding') {
    initOnboardingPage();
    return;
  }

  if (page === 'login') {
    initLoginPage();
    return;
  }

  if (page === 'placement') {
    initPlacementPage();
    return;
  }

  if (page === 'studyplan') {
    initStudyPlanPage();
    return;
  }

  if (page === 'practice') {
    initPracticePage();
    return;
  }

  if (page === 'writing') {
    initWritingPage();
    return;
  }

  if (page === 'speaking') {
    initSpeakingPage();
    return;
  }

  if (page === 'dashboard') {
    initDashboardPage();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
