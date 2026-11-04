// =====================================================================
// server.js  -  The BACKEND of Aks Me AI  (version 3)
// ---------------------------------------------------------------------
// The browser never talks to Google directly (your API key would leak).
// Instead:   Browser  -->  this server  -->  Gemini API
//
// New in this version:
//   * Quiz now returns structured JSON (so the page can make a clickable quiz)
//   * Exam mode (2 / 5 / 10 mark answers)
//   * Syllabus context (semester + subject + university)
//   * Answers in English / Hindi / Telugu
//   * A student can attach a PDF or image
// =====================================================================

// 1. Load the secrets from the .env file into process.env
require('dotenv').config();

// 2. Import the libraries we installed with npm
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// 3. Read settings from .env (with safe defaults)
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
// gemini-3.5-flash-lite = fast and free-tier friendly.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
// Base address of the Gemini API (only change this for testing)
const GEMINI_BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 60 * 1000; // give up after 60 seconds

if (!API_KEY || API_KEY.includes('PASTE_YOUR')) {
  console.error('\n❌ GEMINI_API_KEY is missing. Open the .env file and paste your key.\n');
  process.exit(1);
}

const app = express();

// Render (and most hosts) put a proxy in front of the app. This lets the
// rate limiter see each visitor's real IP address.
app.set('trust proxy', 1);

// ---------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------
app.use(helmet());
// A PDF/image travels inside the JSON (as text), so a chat request may be up to 8 MB.
// We attach this reader to each route AFTER the rate limiter, so anyone sending
// too many requests is turned away before we read their (big) data.
const readJson = express.json({ limit: '8mb' });

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
});

// Serve ONLY the 3 frontend files (never the .env file!)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// ---------------------------------------------------------------------
// The "personality" of the AI
// ---------------------------------------------------------------------
const BASE_PROMPT = `You are "Aks Me AI", a friendly and patient AI tutor for B.Tech / engineering students.
You help with programming, AI, Machine Learning, mathematics, engineering subjects, aptitude,
interview preparation and semester subjects.
Rules:
- Explain step by step in simple language, like teaching a beginner. Be concise.
- Use small real-life examples.
- Put ALL code inside markdown code blocks with the language name, with comments in the code.
- Use short headings and bullet points.
- If the question is not educational, politely steer back to learning.
- If you are not sure, say so instead of guessing.`;

// Extra instructions for each "mode" (the tools in the sidebar)
const MODE_PROMPTS = {
  chat: 'Answer clearly. End with one short follow-up question to check understanding.',
  notes: 'Create well-organised STUDY NOTES: definition, key points, formulas/syntax, a small example, and a 5-line quick revision summary.',
  // The quiz is JSON so the website can turn it into a clickable quiz
  quiz: 'Create a QUIZ of 5 multiple-choice questions. Respond with ONLY a JSON array, no other text, in this exact form: [{"question":"...","options":["option 1","option 2","option 3","option 4"],"answer":0,"explanation":"one or two lines why"}]. "answer" is the index (0-3) of the correct option. Do not put letters like A) in front of the options.',
  planner: 'Create a day-by-day STUDY PLANNER. If days or hours per day are not given, assume 7 days and 2 hours/day. Use a markdown table: Day | Topic | Tasks | Time.',
  flashcards: 'Create 8 FLASHCARDS. Respond with ONLY a JSON array, no other text, in this exact form: [{"front":"question or term","back":"short answer"}]',
  challenge: 'Give ONE CODING CHALLENGE: title, difficulty, problem statement, example input/output, and 2 hints. Do NOT give the full solution unless asked.',
  interview: 'Give 8 INTERVIEW QUESTIONS (easy, medium, hard), each with a short model answer. Add 2 tips on answering well.',
  resume: 'Act as a RESUME and career coach for a fresher engineering student. Give specific, practical advice. If they paste resume text, review it and suggest improvements.',
  tutor: 'Act as a PROGRAMMING TUTOR. Teach the topic from scratch: concept, syntax, a commented example, common mistakes, and 2 practice exercises.',
  exam: 'EXAM MODE: act as a university exam coach. For the topic, write likely exam questions with model answers sized for the marks requested. Label every question with its marks and use exam-style wording.',
};

// Modes whose answer must come back as clean JSON
const JSON_MODES = ['quiz', 'flashcards'];

// How long each answer should be in exam mode
const MARKS_GUIDE = {
  2: 'Marks: write 5 likely 2-mark questions. Each answer is 2-3 lines (a definition plus one key point).',
  5: 'Marks: write 3 likely 5-mark questions. Each answer is about 120-150 words with a short heading, 4-5 clear points and one example.',
  10: 'Marks: write 1 likely 10-mark question with a full model answer of about 350 words: introduction, main points under sub-headings, a small example or diagram described in words, and a conclusion.',
};

// Answer language notes
const LANGUAGE_NOTES = {
  English: '',
  Hindi: 'Write your explanations in Hindi (Devanagari script). Keep code, commands and technical terms in English.',
  Telugu: 'Write your explanations in Telugu script. Keep code, commands and technical terms in English.',
};

const ALLOWED_LANGUAGES = ['Python', 'C', 'C++', 'Java', 'HTML', 'CSS', 'JavaScript'];

// Files a student may attach
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_CHARS = 7000000; // length of the base64 text (about a 5 MB file)

// ---------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------

// Clean a short text from the browser: one line, limited length
function cleanText(value, max = 80) {
  return typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '';
}

// Turn the syllabus settings into one sentence for the AI
function describeContext(ctx) {
  if (!ctx || typeof ctx !== 'object') return '';
  const parts = [];
  const sem = ['1', '2', '3', '4', '5', '6', '7', '8'].includes(String(ctx.semester)) ? String(ctx.semester) : '';
  const subject = cleanText(ctx.subject);
  const university = cleanText(ctx.university);
  if (sem) parts.push(`Semester ${sem}`);
  if (subject) parts.push(`subject "${subject}"`);
  if (university) parts.push(`university/course "${university}"`);
  return parts.join(', ');
}

// ---------------------------------------------------------------------
// Helper 1: check the browser's data and build the Gemini request body.
// Returns { error, status } if something is wrong, otherwise { body, mode }.
// ---------------------------------------------------------------------
function prepareRequest(reqBody) {
  const {
    message, history = [], mode = 'chat', language, marks, answerLanguage, context, attachment,
  } = reqBody || {};

  // Never trust data from the browser - validate everything
  if (typeof message !== 'string' || !message.trim()) {
    return { error: 'Please type a message.', status: 400 };
  }
  if (message.length > 4000) {
    return { error: 'Message is too long (max 4000 characters).', status: 400 };
  }
  if (!MODE_PROMPTS[mode]) {
    return { error: 'Unknown mode.', status: 400 };
  }

  // ----- Build the system prompt for this request -----
  let systemText = BASE_PROMPT + '\n\nCurrent task: ' + MODE_PROMPTS[mode];

  if (mode === 'tutor' && ALLOWED_LANGUAGES.includes(language)) {
    systemText += `\nThe programming language is ${language}. Use only ${language} for examples.`;
  }
  if (mode === 'exam') {
    const m = MARKS_GUIDE[Number(marks)] ? Number(marks) : 5;
    systemText += '\n' + MARKS_GUIDE[m];
  }

  const ctxText = describeContext(context);
  if (ctxText) {
    systemText += `\n\nStudent's syllabus: ${ctxText}. Keep answers at the level and scope of this semester and subject.`;
  }
  if (LANGUAGE_NOTES[answerLanguage]) {
    systemText += '\n\n' + LANGUAGE_NOTES[answerLanguage];
  }

  // ----- The student's message (plus an optional attached file) -----
  const lastParts = [{ text: message }];
  if (attachment) {
    const okType = attachment && ALLOWED_FILE_TYPES.includes(attachment.mimeType);
    const okData =
      typeof attachment.data === 'string' &&
      attachment.data.length > 0 &&
      attachment.data.length <= MAX_FILE_CHARS &&
      /^[A-Za-z0-9+/=]+$/.test(attachment.data); // base64 characters only
    if (!okType || !okData) {
      return { error: 'That file is not supported or is too large (PDF/PNG/JPG/WEBP, max 5 MB).', status: 400 };
    }
    // Gemini reads PDFs and images directly when we send them as "inlineData"
    lastParts.unshift({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
    systemText += '\n\nThe student attached a file. Use it to answer their question.';
  }

  // ----- Previous messages (only the last 6 -> fewer words = faster) -----
  const contents = Array.isArray(history)
    ? history
        .slice(-6)
        .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
        .map((m) => ({ role: m.role, parts: [{ text: m.text.slice(0, 3000) }] }))
    : [];
  contents.push({ role: 'user', parts: lastParts });

  // 4096 so long answers (and Hindi/Telugu quizzes, which use more tokens) are not cut off
  const generationConfig = { temperature: 0.7, maxOutputTokens: 4096 };
  // Quiz and flashcards must come back as clean JSON
  if (JSON_MODES.includes(mode)) generationConfig.responseMimeType = 'application/json';
  // Turn OFF "thinking" for the older Gemini 2.5 Flash models (faster answers)
  if (/^gemini-2\.5-flash/.test(MODEL)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  return {
    mode,
    body: {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig,
    },
  };
}

// Helper 2: turn a Gemini error code into a friendly message
function friendlyError(status) {
  if (status === 429) return 'AI usage limit reached. Please wait a minute and try again.';
  if (status === 401 || status === 403) return 'The API key was rejected. Check GEMINI_API_KEY.';
  if (status === 400) return 'AI request was rejected. Check your API key in the server settings.';
  if (status === 404) return 'AI model not found. Check GEMINI_MODEL in the server settings.';
  if (status === 500 || status === 503) return 'The AI service is busy right now. Please try again in a moment.';
  return 'The AI service had a problem. Please try again.';
}

// Helper 3: pull the text out of one Gemini response piece
function extractText(data) {
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
}

const geminiHeaders = {
  'Content-Type': 'application/json',
  'x-goog-api-key': API_KEY, // key stays on the server, never sent to the browser
};

// ---------------------------------------------------------------------
// POST /api/chat-stream  -  FAST: sends the answer word by word
// ---------------------------------------------------------------------
app.post('/api/chat-stream', chatLimiter, readJson, async (req, res) => {
  const prepared = prepareRequest(req.body);
  if (prepared.error) return res.status(prepared.status).json({ error: prepared.error });

  // AbortController lets us cancel the Gemini request (timeout, or the
  // student pressed Stop / left the page)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  res.on('close', () => controller.abort());

  try {
    const url = `${GEMINI_BASE}/models/${MODEL}:streamGenerateContent?alt=sse`;
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: geminiHeaders,
      body: JSON.stringify(prepared.body),
      signal: controller.signal,
    });

    if (!geminiRes.ok) {
      const data = await geminiRes.json().catch(() => ({}));
      console.error('Gemini error:', geminiRes.status, data?.error?.message || data);
      return res.status(502).json({ error: friendlyError(geminiRes.status) });
    }

    // Gemini sends "Server-Sent Events": lines that look like  data: {json}
    // We read them as they arrive and pass the text on immediately.
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of geminiRes.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // the last piece may be incomplete, keep it for next round

      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        try {
          const text = extractText(JSON.parse(json));
          if (text) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.setHeader('Cache-Control', 'no-cache');
              res.setHeader('X-Accel-Buffering', 'no'); // tells proxies: don't hold the data back
            }
            res.write(text);
          }
        } catch {
          // ignore a piece we can't read
        }
      }
    }

    if (!res.headersSent) {
      return res.status(502).json({ error: 'The AI did not return an answer (it may have been blocked). Try rephrasing.' });
    }
    res.end();
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    if (!timedOut) console.error('Server error:', err);
    if (res.headersSent) {
      // We already started sending text, so add a note at the end
      if (!res.writableEnded) {
        res.write('\n\n⚠️ The answer was cut off. Please try again.');
        res.end();
      }
    } else if (!res.writableEnded) {
      res.status(timedOut ? 504 : 500).json({
        error: timedOut ? 'The AI took too long to answer. Please try again.' : 'Something went wrong on the server.',
      });
    }
  } finally {
    clearTimeout(timer);
  }
});

// ---------------------------------------------------------------------
// POST /api/chat  -  normal (non-streaming). Used for QUIZ and FLASHCARDS
// because we need the complete JSON before we can show them.
// ---------------------------------------------------------------------
app.post('/api/chat', chatLimiter, readJson, async (req, res) => {
  const prepared = prepareRequest(req.body);
  if (prepared.error) return res.status(prepared.status).json({ error: prepared.error });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  res.on('close', () => controller.abort());

  try {
    const geminiRes = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: geminiHeaders,
      body: JSON.stringify(prepared.body),
      signal: controller.signal,
    });
    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', geminiRes.status, data?.error?.message || data);
      return res.status(502).json({ error: friendlyError(geminiRes.status) });
    }

    const reply = extractText(data);
    if (!reply) {
      return res.status(502).json({ error: 'The AI did not return an answer (it may have been blocked). Try rephrasing.' });
    }
    res.json({ reply });
  } catch (err) {
    const timedOut = err.name === 'AbortError';
    if (!timedOut) console.error('Server error:', err);
    if (!res.writableEnded && !res.headersSent) {
      res.status(timedOut ? 504 : 500).json({
        error: timedOut ? 'The AI took too long to answer. Please try again.' : 'Something went wrong on the server.',
      });
    }
  } finally {
    clearTimeout(timer);
  }
});

// Catch-all for unknown URLs
app.use((req, res) => res.status(404).send('Not found'));

// Error handler: for example, a file that is too big for the 8 MB limit
// (Express recognises an error handler by its 4 parameters.)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const tooBig = err && err.type === 'entity.too.large';
  res.status(tooBig ? 413 : 400).json({
    error: tooBig ? 'That file is too large (max 5 MB).' : 'Bad request.',
  });
});

app.listen(PORT, () => {
  console.log(`✅ Aks Me AI is running at http://localhost:${PORT}  (model: ${MODEL})`);
});
