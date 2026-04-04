const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const OTP_CODE = '482901';
const SESSION_TTL_DAYS = 30;
const DEFAULT_PLACEMENT_COUNT = 10;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message, status = 400, details = null) {
  return jsonResponse(
    {
      ok: false,
      error: {
        message,
        details,
      },
    },
    status,
  );
}

function nowIso() {
  return new Date().toISOString();
}

function addDaysIso(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function dateYmd(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseJsonField(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function roundOne(number) {
  return Math.round(number * 10) / 10;
}

function sanitizeSkills(rawSkills) {
  if (!Array.isArray(rawSkills)) return [];
  const allowed = new Set(['Reading', 'Writing', 'Speaking', 'Listening']);
  const deduped = [];

  for (const skill of rawSkills) {
    const normalized = String(skill || '').trim();
    if (!allowed.has(normalized)) continue;
    if (deduped.includes(normalized)) continue;
    deduped.push(normalized);
  }

  return deduped;
}

function estimateBandFromPercent(scorePercent) {
  if (scorePercent < 30) return 4.5;
  if (scorePercent < 45) return 5.0;
  if (scorePercent < 60) return 5.5;
  if (scorePercent < 70) return 6.0;
  if (scorePercent < 80) return 6.5;
  if (scorePercent < 90) return 7.0;
  return 7.5;
}

function getWordCount(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function getBearerToken(request) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

function normalizeAnswers(rawAnswers) {
  if (Array.isArray(rawAnswers)) {
    return rawAnswers;
  }

  if (rawAnswers && typeof rawAnswers === 'object') {
    return Object.entries(rawAnswers).map(([questionId, answer]) => ({
      question_id: questionId,
      answer,
    }));
  }

  return null;
}

function toSafeUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    is_verified: Boolean(row.is_verified),
    onboarding_completed: Boolean(row.onboarding_completed),
    placement_completed: Boolean(row.placement_completed),
    target_score: row.target_score,
    baseline_score: row.baseline_score,
    daily_minutes: row.daily_minutes,
    focus_skills: parseJsonField(row.focus_skills, []),
    exam_date: row.exam_date,
  };
}

async function createSession(db, userId) {
  const token = `sess_${crypto.randomUUID()}`;
  const expiresAt = addDaysIso(SESSION_TTL_DAYS);

  await db
    .prepare(
      `
      INSERT INTO auth_sessions (token, user_id, expires_at)
      VALUES (?1, ?2, ?3)
      `,
    )
    .bind(token, userId, expiresAt)
    .run();

  return token;
}

async function getAuthContext(env, request) {
  const token = getBearerToken(request);
  if (!token) {
    return {
      error: errorResponse('Unauthorized: missing bearer token', 401),
    };
  }

  const row = await env.DB
    .prepare(
      `
      SELECT
        s.token,
        s.expires_at,
        u.*
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?1
      LIMIT 1
      `,
    )
    .bind(token)
    .first();

  if (!row) {
    return {
      error: errorResponse('Unauthorized: invalid session', 401),
    };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?1').bind(token).run();
    return {
      error: errorResponse('Unauthorized: session expired', 401),
    };
  }

  return {
    token,
    user: toSafeUser(row),
  };
}

function validateEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

async function requireJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function handleRegister(request, env) {
  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const fullName = String(payload.full_name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!fullName || fullName.length < 3) {
    return errorResponse('Full name must be at least 3 characters', 422);
  }

  if (!validateEmail(email)) {
    return errorResponse('Please provide a valid email address', 422);
  }

  if (!validatePassword(password)) {
    return errorResponse('Password must be 8+ chars with uppercase, lowercase, number, and symbol', 422);
  }

  const existing = await env.DB
    .prepare('SELECT id, is_verified FROM users WHERE email = ?1 LIMIT 1')
    .bind(email)
    .first();

  if (existing && Number(existing.is_verified) === 1) {
    return errorResponse('Email already registered. Please login.', 409);
  }

  if (existing) {
    await env.DB
      .prepare(
        `
        UPDATE users
        SET full_name = ?1,
            password = ?2,
            verification_code = ?3,
            updated_at = ?4
        WHERE id = ?5
        `,
      )
      .bind(fullName, password, OTP_CODE, nowIso(), existing.id)
      .run();
  } else {
    await env.DB
      .prepare(
        `
        INSERT INTO users (id, full_name, email, password, is_verified, verification_code)
        VALUES (?1, ?2, ?3, ?4, 0, ?5)
        `,
      )
      .bind(crypto.randomUUID(), fullName, email, password, OTP_CODE)
      .run();
  }

  return jsonResponse({
    ok: true,
    message: 'Registration successful. Please verify OTP.',
    email,
    dev_otp_code: OTP_CODE,
  });
}

async function handleVerify(request, env) {
  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const email = String(payload.email || '').trim().toLowerCase();
  const code = String(payload.code || '').trim();

  if (!validateEmail(email)) return errorResponse('Invalid email', 422);
  if (!code) return errorResponse('OTP code is required', 422);

  const userRow = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?1 LIMIT 1')
    .bind(email)
    .first();

  if (!userRow) return errorResponse('Account not found', 404);

  if (String(userRow.verification_code || '') !== code) {
    return errorResponse('Invalid OTP code', 401);
  }

  await env.DB
    .prepare(
      `
      UPDATE users
      SET is_verified = 1,
          verification_code = NULL,
          updated_at = ?1
      WHERE id = ?2
      `,
    )
    .bind(nowIso(), userRow.id)
    .run();

  const token = await createSession(env.DB, userRow.id);

  const freshUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?1 LIMIT 1').bind(userRow.id).first();

  return jsonResponse({
    ok: true,
    token,
    user: toSafeUser(freshUser),
  });
}

async function handleLogin(request, env) {
  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (!validateEmail(email)) return errorResponse('Invalid email', 422);
  if (!password) return errorResponse('Password is required', 422);

  const userRow = await env.DB
    .prepare('SELECT * FROM users WHERE email = ?1 AND password = ?2 LIMIT 1')
    .bind(email, password)
    .first();

  if (!userRow) {
    return errorResponse('Invalid email or password', 401);
  }

  if (!Number(userRow.is_verified)) {
    return errorResponse('Please verify your account first', 403);
  }

  const token = await createSession(env.DB, userRow.id);
  return jsonResponse({
    ok: true,
    token,
    user: toSafeUser(userRow),
  });
}

async function handleLogout(request, env) {
  const token = getBearerToken(request);
  if (!token) return errorResponse('Missing bearer token', 401);

  await env.DB.prepare('DELETE FROM auth_sessions WHERE token = ?1').bind(token).run();
  return jsonResponse({ ok: true });
}

async function handleMe(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const user = auth.user;

  const completedToday = await env.DB
    .prepare(
      `
      SELECT COUNT(*) AS completed_count
      FROM practice_tasks
      WHERE user_id = ?1
        AND task_date = ?2
        AND status = 'completed'
      `,
    )
    .bind(user.id, dateYmd())
    .first();

  return jsonResponse({
    ok: true,
    user,
    completed_today: Number(completedToday?.completed_count || 0),
  });
}

async function handleOnboardingComplete(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const targetScore = Number(payload.target_score);
  const dailyMinutes = Number(payload.daily_minutes);
  const focusSkills = sanitizeSkills(payload.focus_skills);
  const examDate = payload.exam_date ? String(payload.exam_date).trim() : null;

  if (!Number.isFinite(targetScore) || targetScore < 4 || targetScore > 9) {
    return errorResponse('Target score must be between 4.0 and 9.0', 422);
  }

  if (!Number.isFinite(dailyMinutes) || dailyMinutes < 15 || dailyMinutes > 240) {
    return errorResponse('Daily minutes must be between 15 and 240', 422);
  }

  if (!focusSkills.length) {
    return errorResponse('Please select at least one focus skill', 422);
  }

  await env.DB
    .prepare(
      `
      UPDATE users
      SET target_score = ?1,
          daily_minutes = ?2,
          focus_skills = ?3,
          exam_date = ?4,
          onboarding_completed = 1,
          updated_at = ?5
      WHERE id = ?6
      `,
    )
    .bind(targetScore, dailyMinutes, JSON.stringify(focusSkills), examDate, nowIso(), auth.user.id)
    .run();

  const freshUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?1 LIMIT 1').bind(auth.user.id).first();

  return jsonResponse({
    ok: true,
    user: toSafeUser(freshUser),
  });
}

async function fetchPlacementQuestions(db, count = DEFAULT_PLACEMENT_COUNT) {
  const questionCount = clamp(Number(count) || DEFAULT_PLACEMENT_COUNT, 5, 30);

  const rows = await db
    .prepare(
      `
      SELECT
        question_id,
        section,
        question_type,
        passage,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        order_index
      FROM placement_questions
      WHERE is_active = 1
      ORDER BY order_index ASC
      LIMIT ?1
      `,
    )
    .bind(questionCount)
    .all();

  return (rows.results || []).map((row) => ({
    id: row.question_id,
    section: row.section,
    type: row.question_type,
    passage: row.passage,
    question: row.question_text,
    options: [
      { id: 'A', text: row.option_a },
      { id: 'B', text: row.option_b },
      { id: 'C', text: row.option_c },
      { id: 'D', text: row.option_d },
    ],
  }));
}

async function handlePlacementQuestions(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const count = Number(url.searchParams.get('count') || DEFAULT_PLACEMENT_COUNT);

  const questions = await fetchPlacementQuestions(env.DB, count);

  return jsonResponse({
    ok: true,
    test_id: 'placement-v1',
    total_questions: questions.length,
    questions,
  });
}

async function handlePlacementGrade(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const normalized = normalizeAnswers(payload.answers);
  if (!normalized) {
    return errorResponse("'answers' must be an array or key-value object", 422);
  }

  const answerMap = new Map();
  for (const item of normalized) {
    const questionId = String(item?.question_id || '').trim();
    const answer = String(item?.answer || '').trim().toUpperCase();

    if (!questionId || !['A', 'B', 'C', 'D'].includes(answer)) continue;
    answerMap.set(questionId, answer);
  }

  const rows = await env.DB
    .prepare(
      `
      SELECT question_id, correct_option, explanation
      FROM placement_questions
      WHERE is_active = 1
      ORDER BY order_index ASC
      LIMIT ?1
      `,
    )
    .bind(DEFAULT_PLACEMENT_COUNT)
    .all();

  const questions = rows.results || [];
  if (!questions.length) {
    return errorResponse('No active placement questions found', 409);
  }

  const answeredQuestions = Array.from(answerMap.values()).length;
  if (answeredQuestions < 7) {
    return errorResponse('Please answer at least 7 questions before submitting', 422, {
      answered_questions: answeredQuestions,
      minimum_required: 7,
    });
  }

  const grading = questions.map((row) => {
    const userAnswer = answerMap.get(row.question_id) || null;
    const isCorrect = userAnswer === row.correct_option;

    return {
      question_id: row.question_id,
      user_answer: userAnswer,
      correct_answer: row.correct_option,
      is_correct: isCorrect,
      explanation: row.explanation,
    };
  });

  const totalQuestions = grading.length;
  const correctAnswers = grading.filter((item) => item.is_correct).length;
  const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);
  const estimatedBand = estimateBandFromPercent(scorePercent);

  await env.DB
    .prepare(
      `
      INSERT INTO placement_attempts (
        id,
        user_id,
        total_questions,
        answered_questions,
        correct_answers,
        score_percent,
        estimated_band,
        answers_json,
        results_json
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      `,
    )
    .bind(
      crypto.randomUUID(),
      auth.user.id,
      totalQuestions,
      answeredQuestions,
      correctAnswers,
      scorePercent,
      estimatedBand,
      JSON.stringify(normalized),
      JSON.stringify(grading),
    )
    .run();

  await env.DB
    .prepare(
      `
      UPDATE users
      SET baseline_score = ?1,
          placement_completed = 1,
          updated_at = ?2
      WHERE id = ?3
      `,
    )
    .bind(estimatedBand, nowIso(), auth.user.id)
    .run();

  return jsonResponse({
    ok: true,
    total_questions: totalQuestions,
    answered_questions: answeredQuestions,
    correct_answers: correctAnswers,
    score_percent: scorePercent,
    estimated_band: estimatedBand,
    results: grading,
  });
}

function buildWeeklyPlan(user) {
  const focus = Array.isArray(user.focus_skills) && user.focus_skills.length ? user.focus_skills : ['Writing', 'Speaking'];

  return [
    {
      day: 'MON',
      tasks: ['Reading: True/False/Not Given', `${focus[0]} Practice Session`, 'Vocabulary: 20 words'],
    },
    {
      day: 'TUE',
      tasks: ['Reading: Matching Headings', `${focus[1] || 'Writing'} Timed Practice`, 'Error correction drill'],
    },
    {
      day: 'WED',
      tasks: ['Reading Full Passage', 'Speaking fluency drill', 'Academic connectors review'],
    },
    {
      day: 'THU',
      tasks: ['Reading: Speed challenge', 'Writing Task 2 response', 'Speaking cue-card response'],
    },
    {
      day: 'FRI',
      tasks: ['Reading mixed questions', 'Writing feedback revision', 'Pronunciation practice'],
    },
    {
      day: 'SAT',
      tasks: ['Mini mock test', 'Focus weakness area', 'Vocabulary recap'],
    },
    {
      day: 'SUN',
      tasks: ['Light review and reset'],
    },
  ];
}

async function ensureTodayTasks(env, user) {
  const today = dateYmd();

  const existing = await env.DB
    .prepare(
      `
      SELECT *
      FROM practice_tasks
      WHERE user_id = ?1 AND task_date = ?2
      ORDER BY task_type ASC
      `,
    )
    .bind(user.id, today)
    .all();

  if ((existing.results || []).length) {
    return existing.results;
  }

  const defaults = [
    {
      task_type: 'reading',
      title: 'Reading: True / False / Not Given',
      meta: 'Academic passage · ~20 mins',
    },
    {
      task_type: 'speaking',
      title: 'Speaking Part 3 — Discussion',
      meta: 'Environmental change topic · ~15 mins',
    },
    {
      task_type: 'writing',
      title: 'Writing Task 2 — Opinion Essay',
      meta: 'Technology & society · ~25 mins · 250+ words',
    },
  ];

  for (const task of defaults) {
    await env.DB
      .prepare(
        `
        INSERT INTO practice_tasks (id, user_id, task_date, task_type, title, meta, status)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')
        ON CONFLICT(user_id, task_date, task_type) DO NOTHING
        `,
      )
      .bind(crypto.randomUUID(), user.id, today, task.task_type, task.title, task.meta)
      .run();
  }

  const rows = await env.DB
    .prepare(
      `
      SELECT *
      FROM practice_tasks
      WHERE user_id = ?1 AND task_date = ?2
      ORDER BY task_type ASC
      `,
    )
    .bind(user.id, today)
    .all();

  return rows.results || [];
}

async function handleStudyPlanGenerate(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  if (!auth.user.onboarding_completed) {
    return errorResponse('Please complete onboarding first', 409);
  }

  if (!auth.user.placement_completed || !auth.user.baseline_score) {
    return errorResponse('Please complete placement test first', 409);
  }

  const weeklyPlan = buildWeeklyPlan(auth.user);
  const summary = `Baseline ${auth.user.baseline_score} → target ${auth.user.target_score} with ${auth.user.daily_minutes} mins/day focus on ${(auth.user.focus_skills || []).join(', ')}.`;

  const planPayload = {
    generated_at: nowIso(),
    baseline_score: auth.user.baseline_score,
    target_score: auth.user.target_score,
    daily_minutes: auth.user.daily_minutes,
    focus_skills: auth.user.focus_skills,
    week_1: weeklyPlan,
    ai_insight: `${(auth.user.focus_skills || [])[0] || 'Writing'} is your biggest opportunity area this week.`,
  };

  await env.DB
    .prepare(
      `
      INSERT INTO study_plans (id, user_id, title, summary, plan_json)
      VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT(user_id) DO UPDATE
      SET title = excluded.title,
          summary = excluded.summary,
          plan_json = excluded.plan_json,
          updated_at = ?6
      `,
    )
    .bind(
      crypto.randomUUID(),
      auth.user.id,
      'Week 1 — Foundation Sprint',
      summary,
      JSON.stringify(planPayload),
      nowIso(),
    )
    .run();

  const tasks = await ensureTodayTasks(env, auth.user);

  return jsonResponse({
    ok: true,
    plan: {
      title: 'Week 1 — Foundation Sprint',
      summary,
      ...planPayload,
    },
    today_tasks: tasks,
  });
}

async function handleStudyPlanGet(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const planRow = await env.DB
    .prepare('SELECT * FROM study_plans WHERE user_id = ?1 LIMIT 1')
    .bind(auth.user.id)
    .first();

  if (!planRow) {
    return errorResponse('Study plan not generated yet', 404);
  }

  const todayTasks = await ensureTodayTasks(env, auth.user);

  return jsonResponse({
    ok: true,
    plan: {
      id: planRow.id,
      title: planRow.title,
      summary: planRow.summary,
      ...parseJsonField(planRow.plan_json, {}),
    },
    today_tasks: todayTasks,
  });
}

async function handlePracticeToday(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const planRow = await env.DB
    .prepare('SELECT id FROM study_plans WHERE user_id = ?1 LIMIT 1')
    .bind(auth.user.id)
    .first();

  if (!planRow) {
    return errorResponse('Generate study plan first', 409);
  }

  const tasks = await ensureTodayTasks(env, auth.user);
  const completed = tasks.filter((task) => task.status === 'completed').length;

  return jsonResponse({
    ok: true,
    date: dateYmd(),
    total_tasks: tasks.length,
    completed_tasks: completed,
    tasks,
  });
}

async function handlePracticeTaskComplete(request, env, taskId) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const task = await env.DB
    .prepare('SELECT * FROM practice_tasks WHERE id = ?1 AND user_id = ?2 LIMIT 1')
    .bind(taskId, auth.user.id)
    .first();

  if (!task) {
    return errorResponse('Task not found', 404);
  }

  if (task.task_type !== 'reading') {
    return errorResponse('Use specific submit endpoint for this task type', 422);
  }

  if (task.status !== 'completed') {
    const score = 7.0;
    await env.DB
      .prepare(
        `
        UPDATE practice_tasks
        SET status = 'completed',
            score = ?1,
            completed_at = ?2
        WHERE id = ?3
        `,
      )
      .bind(score, nowIso(), task.id)
      .run();
  }

  const freshTask = await env.DB.prepare('SELECT * FROM practice_tasks WHERE id = ?1 LIMIT 1').bind(task.id).first();
  return jsonResponse({ ok: true, task: freshTask });
}

function buildWritingFeedback(wordCount, score) {
  return {
    overall_score: score,
    strengths:
      wordCount >= 250
        ? 'Great effort: your response length is appropriate for IELTS Task 2 and your position is clear.'
        : 'Your core argument is visible and relevant to the prompt.',
    improvements:
      'Improve cohesion with more varied linking devices, and develop each body paragraph with one clear supporting example.',
    grammar_notes:
      'Watch for article usage, subject-verb agreement, and sentence variety (simple + complex + conditional).',
  };
}

async function handleWritingSubmit(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const responseText = String(payload.response_text || '').trim();
  const explicitTaskId = payload.task_id ? String(payload.task_id) : null;
  const wordCount = getWordCount(responseText);

  if (wordCount < 150) {
    return errorResponse('Writing response must be at least 150 words', 422, {
      word_count: wordCount,
      minimum: 150,
    });
  }

  let task;
  if (explicitTaskId) {
    task = await env.DB
      .prepare('SELECT * FROM practice_tasks WHERE id = ?1 AND user_id = ?2 LIMIT 1')
      .bind(explicitTaskId, auth.user.id)
      .first();
  } else {
    task = await env.DB
      .prepare(
        `
        SELECT *
        FROM practice_tasks
        WHERE user_id = ?1
          AND task_date = ?2
          AND task_type = 'writing'
        LIMIT 1
        `,
      )
      .bind(auth.user.id, dateYmd())
      .first();
  }

  if (!task) {
    return errorResponse('Writing task not found', 404);
  }

  let score = 5.0 + Math.min(2.2, Math.max(0, (wordCount - 150) / 110));
  if (responseText.length > 1300) score += 0.2;
  score = roundOne(clamp(score, 4.5, 8.0));

  const feedback = buildWritingFeedback(wordCount, score);

  await env.DB
    .prepare(
      `
      INSERT INTO writing_attempts (id, user_id, task_id, response_text, word_count, score, feedback_json)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      `,
    )
    .bind(crypto.randomUUID(), auth.user.id, task.id, responseText, wordCount, score, JSON.stringify(feedback))
    .run();

  await env.DB
    .prepare(
      `
      UPDATE practice_tasks
      SET status = 'completed',
          score = ?1,
          completed_at = ?2
      WHERE id = ?3
      `,
    )
    .bind(score, nowIso(), task.id)
    .run();

  return jsonResponse({
    ok: true,
    task_id: task.id,
    word_count: wordCount,
    ...feedback,
  });
}

function buildSpeakingFeedback(durationSeconds, score) {
  return {
    overall_score: score,
    strengths:
      durationSeconds >= 90
        ? 'Good stamina and topic development. You sustained your response with enough detail.'
        : 'You delivered a focused response and stayed on topic.',
    improvements:
      'Work on smoother transitions between ideas and extend answers with specific examples.',
    pronunciation_notes:
      'Pay attention to stress in multisyllabic words and maintain consistent pace under pressure.',
  };
}

async function handleSpeakingSubmit(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const payload = await requireJson(request);
  if (!payload) return errorResponse('Invalid JSON body', 400);

  const explicitTaskId = payload.task_id ? String(payload.task_id) : null;
  const durationSeconds = Number(payload.duration_seconds || 0);
  const transcript = String(payload.transcript || '').trim();

  if (!Number.isFinite(durationSeconds) || durationSeconds < 60) {
    return errorResponse('Speaking duration must be at least 60 seconds', 422, {
      duration_seconds: durationSeconds,
      minimum: 60,
    });
  }

  let task;
  if (explicitTaskId) {
    task = await env.DB
      .prepare('SELECT * FROM practice_tasks WHERE id = ?1 AND user_id = ?2 LIMIT 1')
      .bind(explicitTaskId, auth.user.id)
      .first();
  } else {
    task = await env.DB
      .prepare(
        `
        SELECT *
        FROM practice_tasks
        WHERE user_id = ?1
          AND task_date = ?2
          AND task_type = 'speaking'
        LIMIT 1
        `,
      )
      .bind(auth.user.id, dateYmd())
      .first();
  }

  if (!task) {
    return errorResponse('Speaking task not found', 404);
  }

  let score = 5.0 + Math.min(2.0, Math.max(0, (durationSeconds - 60) / 45));
  if (transcript.length > 350) score += 0.2;
  score = roundOne(clamp(score, 4.5, 8.0));

  const feedback = buildSpeakingFeedback(durationSeconds, score);

  await env.DB
    .prepare(
      `
      INSERT INTO speaking_attempts (id, user_id, task_id, duration_seconds, transcript, score, feedback_json)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      `,
    )
    .bind(crypto.randomUUID(), auth.user.id, task.id, durationSeconds, transcript, score, JSON.stringify(feedback))
    .run();

  await env.DB
    .prepare(
      `
      UPDATE practice_tasks
      SET status = 'completed',
          score = ?1,
          completed_at = ?2
      WHERE id = ?3
      `,
    )
    .bind(score, nowIso(), task.id)
    .run();

  return jsonResponse({
    ok: true,
    task_id: task.id,
    duration_seconds: durationSeconds,
    ...feedback,
  });
}

function daysAgo(dateString, days) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return dateYmd(date);
}

async function handleProgressDashboard(request, env) {
  const auth = await getAuthContext(env, request);
  if (auth.error) return auth.error;

  const totalCompletedRow = await env.DB
    .prepare(
      `
      SELECT COUNT(*) AS total_completed
      FROM practice_tasks
      WHERE user_id = ?1 AND status = 'completed'
      `,
    )
    .bind(auth.user.id)
    .first();

  const todaySummaryRow = await env.DB
    .prepare(
      `
      SELECT
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_today,
        COUNT(*) AS total_today
      FROM practice_tasks
      WHERE user_id = ?1 AND task_date = ?2
      `,
    )
    .bind(auth.user.id, dateYmd())
    .first();

  const latestWriting = await env.DB
    .prepare('SELECT score, created_at FROM writing_attempts WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 1')
    .bind(auth.user.id)
    .first();

  const latestSpeaking = await env.DB
    .prepare('SELECT score, created_at FROM speaking_attempts WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 1')
    .bind(auth.user.id)
    .first();

  const recentScoresRows = await env.DB
    .prepare(
      `
      SELECT score, created_at
      FROM (
        SELECT score, created_at FROM writing_attempts WHERE user_id = ?1
        UNION ALL
        SELECT score, created_at FROM speaking_attempts WHERE user_id = ?1
      )
      ORDER BY created_at DESC
      LIMIT 2
      `,
    )
    .bind(auth.user.id)
    .all();

  const recentScores = recentScoresRows.results || [];
  const latestScore = Number(recentScores[0]?.score || 0);
  const previousScore = Number(recentScores[1]?.score || 0);
  const trendDelta = latestScore - previousScore;
  const trend = trendDelta > 0.2 ? 'up' : trendDelta < -0.2 ? 'down' : 'stable';

  const completedDateRows = await env.DB
    .prepare(
      `
      SELECT DISTINCT task_date
      FROM practice_tasks
      WHERE user_id = ?1 AND status = 'completed'
      ORDER BY task_date DESC
      `,
    )
    .bind(auth.user.id)
    .all();

  const completedDates = new Set((completedDateRows.results || []).map((row) => row.task_date));
  let streak = 0;
  let cursor = dateYmd();
  while (completedDates.has(cursor)) {
    streak += 1;
    cursor = daysAgo(cursor, 1);
  }

  const weekStart = daysAgo(dateYmd(), 6);
  const weekRows = await env.DB
    .prepare(
      `
      SELECT task_date, COUNT(*) AS completed_count
      FROM practice_tasks
      WHERE user_id = ?1
        AND status = 'completed'
        AND task_date >= ?2
      GROUP BY task_date
      ORDER BY task_date ASC
      `,
    )
    .bind(auth.user.id, weekStart)
    .all();

  const weeklyMap = new Map((weekRows.results || []).map((row) => [row.task_date, Number(row.completed_count)]));
  const weeklyActivity = [];
  for (let i = 6; i >= 0; i -= 1) {
    const date = daysAgo(dateYmd(), i);
    weeklyActivity.push({
      date,
      completed: weeklyMap.get(date) || 0,
    });
  }

  const feedbackRows = await env.DB
    .prepare(
      `
      SELECT
        'writing' AS type,
        score,
        created_at,
        feedback_json
      FROM writing_attempts
      WHERE user_id = ?1
      UNION ALL
      SELECT
        'speaking' AS type,
        score,
        created_at,
        feedback_json
      FROM speaking_attempts
      WHERE user_id = ?1
      ORDER BY created_at DESC
      LIMIT 3
      `,
    )
    .bind(auth.user.id)
    .all();

  const recentFeedback = (feedbackRows.results || []).map((row) => {
    const parsed = parseJsonField(row.feedback_json, {});
    return {
      type: row.type,
      score: row.score,
      created_at: row.created_at,
      summary: parsed.strengths || 'Feedback available',
    };
  });

  const baseline = Number(auth.user.baseline_score || 5.0);
  const latestScores = [latestWriting?.score, latestSpeaking?.score]
    .map((item) => Number(item || 0))
    .filter((item) => item > 0);

  const recentAverage = latestScores.length
    ? latestScores.reduce((acc, score) => acc + score, 0) / latestScores.length
    : baseline;

  const currentBand = roundOne((baseline * 0.65) + (recentAverage * 0.35));

  return jsonResponse({
    ok: true,
    metrics: {
      current_band: currentBand,
      target_band: auth.user.target_score,
      tasks_completed: Number(totalCompletedRow?.total_completed || 0),
      study_streak: streak,
      completion_today: Number(todaySummaryRow?.completed_today || 0),
      total_today: Number(todaySummaryRow?.total_today || 0),
      latest_writing_score: latestWriting?.score || null,
      latest_speaking_score: latestSpeaking?.score || null,
      trend,
      trend_delta: roundOne(trendDelta),
    },
    weekly_activity: weeklyActivity,
    recent_feedback: recentFeedback,
    user: auth.user,
  });
}

export default {
  async fetch(request, env) {
    if (!env.DB) {
      return errorResponse("D1 binding 'DB' is not configured", 500);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    try {
      if (request.method === 'GET' && url.pathname === '/api/v1/health') {
        return jsonResponse({
          ok: true,
          service: 'ielts-core',
          timestamp: nowIso(),
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/auth/register') {
        return await handleRegister(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/auth/verify') {
        return await handleVerify(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/auth/login') {
        return await handleLogin(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
        return await handleLogout(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/me') {
        return await handleMe(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/onboarding/complete') {
        return await handleOnboardingComplete(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/placement/questions') {
        return await handlePlacementQuestions(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/placement/grade') {
        return await handlePlacementGrade(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/study-plan/generate') {
        return await handleStudyPlanGenerate(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/study-plan') {
        return await handleStudyPlanGet(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/practice/today') {
        return await handlePracticeToday(request, env);
      }

      if (request.method === 'POST' && /^\/api\/v1\/practice\/tasks\/[^/]+\/complete$/.test(url.pathname)) {
        const taskId = url.pathname.split('/')[5];
        return await handlePracticeTaskComplete(request, env, taskId);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/writing/submit') {
        return await handleWritingSubmit(request, env);
      }

      if (request.method === 'POST' && url.pathname === '/api/v1/speaking/submit') {
        return await handleSpeakingSubmit(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/api/v1/progress/dashboard') {
        return await handleProgressDashboard(request, env);
      }

      return errorResponse('Route not found', 404, {
        path: url.pathname,
        method: request.method,
      });
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
};
