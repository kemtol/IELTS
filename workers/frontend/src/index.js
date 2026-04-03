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

function setActiveNavTab() {
  const page = document.body.dataset.page || 'onboarding';
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.screen === page);
  });
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
  setActiveNavTab();
  ensureWaveKeyframes();
});
