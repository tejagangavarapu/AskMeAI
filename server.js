// =====================================================================
// server.js  -  The BACKEND of Aks Me AI
// ---------------------------------------------------------------------
// Why do we need a backend?
// If the browser (script.js) called Gemini directly, your secret API key
// would be visible to everyone using "Inspect Element". So the browser
// talks to THIS server, and only this server knows the key.
//
//   Browser  -->  /api/chat (our server)  -->  Google Gemini API
//   Browser  <--  answer                  <--  Gemini answer
// =====================================================================

// 1. Load the secrets from the .env file into process.env
require('dotenv').config();

// 2. Import the libraries we installed with npm
const express = require('express');          // web server framework
const helmet = require('helmet');            // adds safe HTTP security headers
const rateLimit = require('express-rate-limit'); // stops spamming/abuse
const path = require('path');                // helps build file paths

// 3. Read settings from .env (with safe defaults)
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Stop immediately with a clear message if the key is missing
if (!API_KEY || API_KEY.includes('PASTE_YOUR')) {
  console.error('\n❌ GEMINI_API_KEY is missing. Open the .env file and paste your key.\n');
  process.exit(1);
}

const app = express();

// ---------------------------------------------------------------------
// Security middleware
// ---------------------------------------------------------------------
app.use(helmet());                         // safe headers
app.use(express.json({ limit: '50kb' }));  // read JSON bodies, reject huge ones

// Each visitor (IP) may send max 30 chat requests per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a minute and try again.' },
});

// ---------------------------------------------------------------------
// Serve ONLY the 3 frontend files.
// (We do NOT serve the whole folder, otherwise people could download
//  your .env file and steal your API key!)
// ---------------------------------------------------------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// ---------------------------------------------------------------------
// The "personality" of the AI. This is sent to Gemini as a system prompt.
// ---------------------------------------------------------------------
const BASE_PROMPT = `You are "Aks Me AI", a friendly and patient AI tutor for students
(especially B.Tech / engineering students). You help with programming, AI,
Machine Learning, mathematics, engineering subjects, aptitude, interview
preparation and semester subjects.
Rules:
- Explain step by step in simple language, like teaching a beginner.
- Use small real-life examples and analogies.
- Put ALL code inside markdown code blocks with the language name, and add comments in the code.
- Use short headings and bullet points for clarity.
- If the question is not educational, politely steer back to learning.
- If you are not sure about something, say so instead of guessing.`;

// Extra instructions for each "mode" (the buttons in the sidebar)
const MODE_PROMPTS = {
  chat: 'Answer the student\'s question clearly. End with one short follow-up question to check understanding.',
  notes: 'Create well-organised STUDY NOTES on the topic: definition, key points, formulas/syntax, a small example, and a 5-line quick revision summary.',
  quiz: 'Create a QUIZ on the topic: 5 multiple-choice questions (A-D). Do NOT show answers right after each question. Put all answers with short explanations in an "Answer Key" section at the end.',
  planner: 'Create a day-by-day STUDY PLANNER. If the student did not say how many days or hours per day, assume 7 days and 2 hours/day. Use a markdown table: Day | Topic | Tasks | Time.',
  flashcards: 'Create 8 FLASHCARDS on the topic. Respond with ONLY a JSON array, no other text, in this exact form: [{"front":"question or term","back":"short answer"}]',
  challenge: 'Give ONE CODING CHALLENGE on the topic: title, difficulty, problem statement, example input/output, and 2 hints. Do NOT give the full solution; offer it only if the student asks.',
  interview: 'Give 8 INTERVIEW QUESTIONS on the topic (mix of easy, medium, hard), each with a short model answer. Add 2 tips on how to answer well.',
  resume: 'Act as a RESUME and career coach for a fresher engineering student. Give specific, practical advice: structure, project descriptions with action verbs, skills section, common mistakes. If they paste resume text, review it and suggest improvements.',
  tutor: 'Act as a PROGRAMMING TUTOR. Teach the requested topic from scratch: concept, syntax, a commented example, common mistakes, and 2 practice exercises.',
};

const ALLOWED_LANGUAGES = ['Python', 'C', 'C++', 'Java', 'HTML', 'CSS', 'JavaScript'];

// ---------------------------------------------------------------------
// POST /api/chat  -  the main endpoint the browser calls
// Body: { message: "text", history: [{role, text}], mode: "chat", language: "Python" }
// ---------------------------------------------------------------------
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { message, history = [], mode = 'chat', language } = req.body || {};

    // ----- 1. Validate input (never trust data from the browser) -----
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Please type a message.' });
    }
    if (message.length > 4000) {
      return res.status(400).json({ error: 'Message is too long (max 4000 characters).' });
    }
    if (!MODE_PROMPTS[mode]) {
      return res.status(400).json({ error: 'Unknown mode.' });
    }

    // ----- 2. Build the system prompt for this request -----
    let systemText = BASE_PROMPT + '\n\nCurrent task: ' + MODE_PROMPTS[mode];
    if (mode === 'tutor' && ALLOWED_LANGUAGES.includes(language)) {
      systemText += `\nThe programming language is ${language}. Use only ${language} for examples.`;
    }

    // ----- 3. Convert chat history into Gemini's format -----
    // Gemini uses roles "user" and "model". Keep only the last 10 messages
    // so requests stay small and cheap.
    const contents = Array.isArray(history)
      ? history
          .slice(-10)
          .filter((m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
          .map((m) => ({ role: m.role, parts: [{ text: m.text.slice(0, 4000) }] }))
      : [];
    contents.push({ role: 'user', parts: [{ text: message }] });

    // ----- 4. Build the request for Gemini -----
    const generationConfig = { temperature: 0.7, maxOutputTokens: 2048 };
    // For flashcards we ask Gemini to return clean JSON
    if (mode === 'flashcards') generationConfig.responseMimeType = 'application/json';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    // Node 18+ has fetch built in, so no extra library is needed
    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY, // key stays on the server, never sent to browser
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig,
      }),
    });

    const data = await geminiRes.json();

    // ----- 5. Handle errors from Gemini -----
    if (!geminiRes.ok) {
      console.error('Gemini error:', data?.error?.message || data);
      const status = geminiRes.status;
      let friendly = 'The AI service had a problem. Please try again.';
      if (status === 429) friendly = 'AI usage limit reached. Please wait a bit and try again.';
      if (status === 400 || status === 403) friendly = 'AI request was rejected. Check your API key and model name in .env.';
      return res.status(502).json({ error: friendly });
    }

    // ----- 6. Extract the answer text -----
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
    if (!reply) {
      return res.status(502).json({ error: 'The AI did not return an answer (it may have been blocked). Try rephrasing.' });
    }

    res.json({ reply });
  } catch (err) {
    // Any unexpected crash ends up here. Log details for you, show a safe message to the user.
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

// Catch-all for unknown URLs
app.use((req, res) => res.status(404).send('Not found'));

// ---------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Aks Me AI is running at http://localhost:${PORT}`);
});
