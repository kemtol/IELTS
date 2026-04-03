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

function nextOnbStep(step) {
  const steps = document.querySelectorAll('[id^="onb-step"]');
  if (!steps.length) return;

  steps.forEach((el) => {
    el.style.display = 'none';
  });

  const activeStep = document.getElementById(`onb-step${step}`);
  if (activeStep) {
    activeStep.style.display = '';
  }

  const dots = document.querySelectorAll('.step-dot');
  dots.forEach((dot, idx) => {
    dot.classList.remove('active', 'done');
    if (idx < step - 1) dot.classList.add('done');
    if (idx === step - 1) dot.classList.add('active');
  });
}

function selectOption(el) {
  const list = el.closest('.option-list');
  if (!list) return;
  list.querySelectorAll('.option-item').forEach((item) => item.classList.remove('selected'));
  el.classList.add('selected');
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

const PLACEMENT_API_BASE = window.PLACEMENT_API_BASE || 'https://ielts-core.mkemalw.workers.dev';
const placementState = {
  questions: [],
  answers: {},
  currentIndex: 0,
  loading: false,
  submitting: false,
};

function getPlacementElement(id) {
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

function setPlacementStatus(message, tone = 'default') {
  const statusEl = getPlacementElement('placementStatusText');
  if (!statusEl) return;

  statusEl.textContent = message || '';
  if (tone === 'error') statusEl.style.color = 'var(--coral)';
  else if (tone === 'success') statusEl.style.color = 'var(--teal)';
  else if (tone === 'warn') statusEl.style.color = 'var(--amber)';
  else statusEl.style.color = 'var(--text-secondary)';
}

function setPlacementButtonState(button, disabled) {
  if (!button) return;
  button.disabled = !!disabled;
  button.style.opacity = disabled ? '0.55' : '1';
  button.style.cursor = disabled ? 'not-allowed' : 'pointer';
}

function renderPlacementQuestion() {
  const total = placementState.questions.length;
  if (!total) return;

  const current = placementState.questions[placementState.currentIndex];
  if (!current) return;

  const answeredCount = Object.keys(placementState.answers).length;
  const unansweredCount = total - answeredCount;
  const selected = placementState.answers[current.id] || null;

  const progressCaption = getPlacementElement('placementProgressCaption');
  const progressFill = getPlacementElement('placementProgressFill');
  const answeredCaption = getPlacementElement('placementAnsweredCaption');
  const answeredBadge = getPlacementElement('placementAnsweredBadge');
  const questionMeta = getPlacementElement('placementQuestionMeta');
  const passageCard = getPlacementElement('placementPassageCard');
  const passageText = getPlacementElement('placementPassageText');
  const questionText = getPlacementElement('placementQuestionText');
  const optionList = getPlacementElement('placementOptionList');
  const questionChips = getPlacementElement('placementQuestionChips');
  const prevBtn = getPlacementElement('placementPrevBtn');
  const nextBtn = getPlacementElement('placementNextBtn');
  const submitBtn = getPlacementElement('placementSubmitBtn');

  if (progressCaption) progressCaption.textContent = `${answeredCount} / ${total}`;
  if (progressFill) {
    const progressPercent = total ? Math.round((answeredCount / total) * 100) : 0;
    progressFill.style.width = `${progressPercent}%`;
  }
  if (answeredCaption) answeredCaption.textContent = `${answeredCount} answered`;
  if (answeredBadge) answeredBadge.textContent = `${answeredCount} of ${total}`;
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

  if (questionChips) {
    questionChips.innerHTML = placementState.questions
      .map((question, index) => {
        const isCurrent = index === placementState.currentIndex;
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

  if (prevBtn) setPlacementButtonState(prevBtn, placementState.currentIndex === 0 || placementState.loading);
  if (nextBtn) {
    nextBtn.textContent = placementState.currentIndex === total - 1 ? 'Last question' : 'Next question →';
    setPlacementButtonState(nextBtn, placementState.currentIndex === total - 1 || placementState.loading);
  }
  if (submitBtn) {
    submitBtn.textContent = `Submit test (${unansweredCount} unanswered)`;
    setPlacementButtonState(submitBtn, placementState.loading || placementState.submitting);
  }
}

async function initializePlacementTest() {
  if (document.body?.dataset.page !== 'placement') return;
  placementState.loading = true;
  setPlacementStatus('Loading placement questions from IELTS Core...', 'default');

  try {
    const endpoint = `${PLACEMENT_API_BASE.replace(/\/$/, '')}/api/v1/placement/questions`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Questions API failed (${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.ok || !Array.isArray(payload.questions) || !payload.questions.length) {
      throw new Error('Placement question bank is empty');
    }

    placementState.questions = payload.questions;
    placementState.currentIndex = 0;
    placementState.answers = {};
    setPlacementStatus('Question bank loaded. Complete all questions, then submit.', 'default');
    renderPlacementQuestion();
  } catch (error) {
    console.error('Failed to initialize placement test:', error);
    setPlacementStatus('Failed to load question bank. Please refresh and try again.', 'error');

    const questionMeta = getPlacementElement('placementQuestionMeta');
    const questionText = getPlacementElement('placementQuestionText');
    const optionList = getPlacementElement('placementOptionList');
    if (questionMeta) questionMeta.textContent = 'Question bank unavailable';
    if (questionText) questionText.textContent = 'We could not fetch placement questions from IELTS Core.';
    if (optionList) optionList.innerHTML = '';
  } finally {
    placementState.loading = false;
    renderPlacementQuestion();
  }
}

function selectPlacementOption(optionId) {
  const current = placementState.questions[placementState.currentIndex];
  if (!current || placementState.loading) return;

  placementState.answers[current.id] = optionId;
  setPlacementStatus('', 'default');
  renderPlacementQuestion();
}

function nextPlacementQuestion() {
  if (!placementState.questions.length || placementState.loading) return;
  if (placementState.currentIndex >= placementState.questions.length - 1) return;

  placementState.currentIndex += 1;
  renderPlacementQuestion();
}

function prevPlacementQuestion() {
  if (!placementState.questions.length || placementState.loading) return;
  if (placementState.currentIndex <= 0) return;

  placementState.currentIndex -= 1;
  renderPlacementQuestion();
}

async function submitPlacementTest() {
  if (!placementState.questions.length || placementState.submitting) return;

  const total = placementState.questions.length;
  const answeredCount = Object.keys(placementState.answers).length;
  const unansweredCount = total - answeredCount;

  if (unansweredCount > 0) {
    const proceed = window.confirm(`You still have ${unansweredCount} unanswered question(s). Submit anyway?`);
    if (!proceed) return;
  }

  placementState.submitting = true;
  renderPlacementQuestion();
  setPlacementStatus('Submitting your answers...', 'default');

  try {
    const endpoint = `${PLACEMENT_API_BASE.replace(/\/$/, '')}/api/v1/placement/grade`;
    const answers = Object.entries(placementState.answers).map(([question_id, answer]) => ({
      question_id,
      answer,
    }));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ answers }),
    });

    if (!response.ok) {
      throw new Error(`Submit API failed (${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.ok) {
      throw new Error('Submit API returned unsuccessful response');
    }

    setPlacementStatus(
      `Submitted: ${payload.correct_answers}/${payload.total_questions} correct (${payload.score_percent}%). Estimated band ${payload.estimated_band}. Redirecting to study plan...`,
      'success',
    );

    setTimeout(() => {
      showScreen('studyplan');
    }, 1400);
  } catch (error) {
    console.error('Failed to submit placement test:', error);
    setPlacementStatus('Submit failed. Please try again in a moment.', 'error');
  } finally {
    placementState.submitting = false;
    renderPlacementQuestion();
  }
}

let recActive = false;
let recInterval;

function toggleRec() {
  const btn = document.getElementById('recBtn');
  const label = document.getElementById('recLabel');
  const hint = document.getElementById('recHint');
  const timerWrap = document.getElementById('recTimerWrap');
  const waveform = document.getElementById('waveform');
  const preview = document.getElementById('audioPreview');
  const timer = document.getElementById('recTimer');

  if (!btn || !label || !hint || !timerWrap || !waveform || !preview || !timer) return;

  if (!recActive) {
    recActive = true;
    btn.classList.remove('idle');
    btn.classList.add('recording');
    btn.textContent = '⏹';

    label.style.display = 'none';
    hint.style.display = 'none';
    timerWrap.style.display = '';

    let secs = 0;
    timer.textContent = '00:00';

    waveform.innerHTML = '';
    for (let i = 0; i < 28; i += 1) {
      const bar = document.createElement('div');
      bar.className = 'wave-bar';
      const height = 8 + Math.random() * 28;
      bar.style.cssText = `height:${height}px; animation-delay:${(i * 0.06).toFixed(2)}s; animation-duration:${(0.5 + Math.random() * 0.5).toFixed(2)}s`;
      waveform.appendChild(bar);
    }

    recInterval = setInterval(() => {
      secs += 1;
      const m = String(Math.floor(secs / 60)).padStart(2, '0');
      const s = String(secs % 60).padStart(2, '0');
      timer.textContent = `${m}:${s}`;
    }, 1000);
  } else {
    recActive = false;
    clearInterval(recInterval);
    btn.style.display = 'none';
    timerWrap.style.display = 'none';
    preview.style.display = '';
  }
}

function showWritingResult() {
  const panel = document.getElementById('writingFeedbackPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card card-pad mb-16">
      <div class="flex items-center gap-16 mb-16">
        <div class="score-ring-wrap">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#EDE7DE" stroke-width="6"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#D4860A" stroke-width="6"
              stroke-dasharray="213" stroke-dashoffset="57" stroke-linecap="round"/>
          </svg>
          <div class="score-ring-label">
            <span class="score-big">6.5</span>
            <span class="score-tiny">BAND</span>
          </div>
        </div>
        <div>
          <p class="font-medium mb-4">Overall band score</p>
          <p class="caption mb-8">Writing Task 2 · Opinion Essay</p>
          <span class="badge badge-teal">+1.0 from baseline</span>
        </div>
      </div>
      <div class="band-row">
        <p class="band-name" style="font-size:12px">Task Achievement</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:67%; background:var(--amber)"></div></div>
        <p class="band-score">6.5</p>
      </div>
      <div class="band-row">
        <p class="band-name" style="font-size:12px">Coherence & Cohesion</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:60%; background:var(--teal)"></div></div>
        <p class="band-score">6.0</p>
      </div>
      <div class="band-row">
        <p class="band-name" style="font-size:12px">Lexical Resource</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:72%; background:var(--navy)"></div></div>
        <p class="band-score">7.0</p>
      </div>
      <div class="band-row" style="margin-bottom:0">
        <p class="band-name" style="font-size:12px">Grammatical Range</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:65%; background:var(--coral)"></div></div>
        <p class="band-score">6.5</p>
      </div>
    </div>
    <div class="feedback-block strength">
      <p class="feedback-title teal">Strengths</p>
      <p class="feedback-text">Clear position stated in the introduction. Good use of academic vocabulary ("replicate", "facilitate", "nuances"). Body paragraphs are logically organised with supporting examples.</p>
    </div>
    <div class="feedback-block improve">
      <p class="feedback-title amber">Areas to improve</p>
      <p class="feedback-text">Conclusion is too brief and does not fully paraphrase the thesis. Cohesive devices are repetitive ("Furthermore" used twice). Try varied linkers: "What is more", "It follows that".</p>
    </div>
    <div class="feedback-block error">
      <p class="feedback-title coral">Grammar notes</p>
      <p class="feedback-text">"which builds trust" — relative clause without comma is ambiguous. "Research consistently shows" — consider passive: "Studies have consistently demonstrated..." for academic tone.</p>
    </div>
    <button class="btn btn-outline btn-full mt-12" onclick="showScreen('practice')">← Back to daily practice</button>
  `;
}

function showSpeakingResult() {
  const panel = document.getElementById('speakingFeedbackPanel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card card-pad mb-16">
      <div class="flex items-center gap-16 mb-16">
        <div class="score-ring-wrap">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#EDE7DE" stroke-width="6"/>
            <circle cx="40" cy="40" r="34" fill="none" stroke="#0E7A6B" stroke-width="6"
              stroke-dasharray="213" stroke-dashoffset="71" stroke-linecap="round"/>
          </svg>
          <div class="score-ring-label">
            <span class="score-big">6.0</span>
            <span class="score-tiny">BAND</span>
          </div>
        </div>
        <div>
          <p class="font-medium mb-4">Overall band score</p>
          <p class="caption mb-8">Speaking Part 2 · Cue Card</p>
          <span class="badge badge-amber">+0.5 from baseline</span>
        </div>
      </div>
      <div class="band-row">
        <p class="band-name" style="font-size:12px">Fluency</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:55%; background:var(--amber)"></div></div>
        <p class="band-score">5.5</p>
      </div>
      <div class="band-row">
        <p class="band-name" style="font-size:12px">Vocabulary</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:65%; background:var(--teal)"></div></div>
        <p class="band-score">6.5</p>
      </div>
      <div class="band-row">
        <p class="band-name" style="font-size:12px">Grammar</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:60%; background:var(--navy)"></div></div>
        <p class="band-score">6.0</p>
      </div>
      <div class="band-row" style="margin-bottom:0">
        <p class="band-name" style="font-size:12px">Pronunciation</p>
        <div class="band-bar-wrap"><div class="band-fill" style="width:58%; background:var(--coral)"></div></div>
        <p class="band-score">5.8</p>
      </div>
    </div>
    <div class="feedback-block strength">
      <p class="feedback-title teal">Strengths</p>
      <p class="feedback-text">Good range of descriptive vocabulary and clear narrative structure. You maintained topic relevance throughout the response. Natural intonation on shorter phrases.</p>
    </div>
    <div class="feedback-block improve">
      <p class="feedback-title amber">Areas to improve</p>
      <p class="feedback-text">Noticeable pauses mid-sentence reduce fluency score. Practice using filler phrases ("what I mean is...", "the thing is...") to maintain flow while thinking. Aim for 1.5–2 min responses.</p>
    </div>
    <div class="feedback-block error">
      <p class="feedback-title coral">Pronunciation notes</p>
      <p class="feedback-text">Focus on "particularly" and "previously" — these multisyllabic words were mispronounced. Stress pattern: par-TIC-u-lar-ly. Consider shadowing practice with native speaker recordings.</p>
    </div>
    <button class="btn btn-outline btn-full mt-12" onclick="showScreen('practice')">← Back to daily practice</button>
  `;
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

document.addEventListener('DOMContentLoaded', () => {
  ensureWaveKeyframes();
  initializePlacementTest();
});
