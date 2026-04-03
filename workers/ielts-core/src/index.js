const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
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

function normalizeAnswers(rawAnswers) {
  if (Array.isArray(rawAnswers)) {
    return rawAnswers;
  }

  if (rawAnswers && typeof rawAnswers === "object") {
    return Object.entries(rawAnswers).map(([questionId, answer]) => ({
      question_id: questionId,
      answer,
    }));
  }

  return null;
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

async function getPlacementQuestions(db) {
  const query = `
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
  `;

  const rows = await db.prepare(query).all();
  const results = rows.results || [];

  return results.map((row) => ({
    id: row.question_id,
    section: row.section,
    type: row.question_type,
    passage: row.passage,
    question: row.question_text,
    options: [
      { id: "A", text: row.option_a },
      { id: "B", text: row.option_b },
      { id: "C", text: row.option_c },
      { id: "D", text: row.option_d },
    ],
  }));
}

async function handleGetQuestions(env) {
  if (!env.DB) {
    return errorResponse("D1 binding 'DB' is not configured", 500);
  }

  const questions = await getPlacementQuestions(env.DB);

  return jsonResponse({
    ok: true,
    test_id: "placement-v1",
    total_questions: questions.length,
    questions,
  });
}

async function handleSubmit(request, env) {
  if (!env.DB) {
    return errorResponse("D1 binding 'DB' is not configured", 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const normalized = normalizeAnswers(payload?.answers);
  if (!normalized) {
    return errorResponse("'answers' must be an array or key-value object", 400);
  }

  const answerMap = new Map();
  for (const item of normalized) {
    const questionId = String(item?.question_id || "").trim();
    const answer = String(item?.answer || "").trim().toUpperCase();

    if (!questionId || !["A", "B", "C", "D"].includes(answer)) {
      continue;
    }

    answerMap.set(questionId, answer);
  }

  const query = `
    SELECT
      question_id,
      correct_option,
      explanation
    FROM placement_questions
    WHERE is_active = 1
    ORDER BY order_index ASC
  `;

  const rows = await env.DB.prepare(query).all();
  const results = rows.results || [];

  if (!results.length) {
    return errorResponse("No active placement questions found", 409);
  }

  const grading = results.map((row) => {
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
  const answeredQuestions = grading.filter((item) => item.user_answer !== null).length;
  const scorePercent = Math.round((correctAnswers / totalQuestions) * 100);

  return jsonResponse({
    ok: true,
    total_questions: totalQuestions,
    answered_questions: answeredQuestions,
    correct_answers: correctAnswers,
    score_percent: scorePercent,
    estimated_band: estimateBandFromPercent(scorePercent),
    results: grading,
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/api/v1/health") {
        return jsonResponse({
          ok: true,
          service: "ielts-core",
          timestamp: new Date().toISOString(),
        });
      }

      if (request.method === "GET" && url.pathname === "/api/v1/placement/questions") {
        return await handleGetQuestions(env);
      }

      if (request.method === "POST" && url.pathname === "/api/v1/placement/grade") {
        return await handleSubmit(request, env);
      }

      return errorResponse("Route not found", 404, { path: url.pathname, method: request.method });
    } catch (error) {
      console.error("Unhandled error:", error);
      return errorResponse("Internal server error", 500);
    }
  },
};
