// =====================================================================
// script.js : the BRAIN of the frontend (runs in the browser)  - version 3
//
// Big ideas in this file:
//   1. DATA   - chats, settings and progress are saved in localStorage
//               (a small storage space inside the browser).
//   2. SHOW   - functions that draw messages, quizzes, flashcards.
//   3. ACTION - send a question, stop, regenerate, speak, attach a file.
// =====================================================================

// ---------- 1. Grab the HTML elements we need ----------
const $ = (id) => document.getElementById(id); // short helper
const chatBox = $('chat');
const welcome = $('welcome');
const input = $('input');
const sendBtn = $('sendBtn');
const newChatBtn = $('newChatBtn');
const sidebar = $('sidebar');
const backdrop = $('backdrop');
const menuBtn = $('menuBtn');
const modeName = $('modeName');
const modeHint = $('modeHint');
const langSelect = $('langSelect');
const marksSelect = $('marksSelect');
const themeBtn = $('themeBtn');
const settingsBtn = $('settingsBtn');
const progressBtn = $('progressBtn');
const chatList = $('chatList');
const attachBtn = $('attachBtn');
const fileInput = $('fileInput');
const attachChip = $('attachChip');
const attachName = $('attachName');
const attachRemove = $('attachRemove');
const micBtn = $('micBtn');
const toastEl = $('toast');
const settingsDialog = $('settingsDialog');
const progressDialog = $('progressDialog');
const progressBody = $('progressBody');

// ---------- 2. Settings for each tool button ----------
// name = title on top, hint = small text, placeholder = text inside the input box
const MODES = {
  chat:       { name: 'Ask anything',        hint: 'Ask any study question',               placeholder: 'Ask any question...' },
  tutor:      { name: 'Programming tutor',   hint: 'Pick a language, then type a topic',   placeholder: 'Topic, e.g. "arrays" or "functions"' },
  notes:      { name: 'Study notes',         hint: 'Get quick revision notes',             placeholder: 'Topic, e.g. "Linear regression"' },
  quiz:       { name: 'Quiz',                hint: 'Tap the answers to test yourself',     placeholder: 'Topic, e.g. "Python lists"' },
  flashcards: { name: 'Flashcards',          hint: 'Tap a card to flip it',                placeholder: 'Topic, e.g. "Operating System basics"' },
  exam:       { name: 'Exam mode',           hint: 'Pick the marks, then type a topic',    placeholder: 'Topic, e.g. "Normalization in DBMS"' },
  planner:    { name: 'Study planner',       hint: 'Tell me the subject, days and hours',  placeholder: 'e.g. "DBMS exam in 5 days, 3 hours/day"' },
  challenge:  { name: 'Coding challenge',    hint: 'Practice problems',                    placeholder: 'Topic, e.g. "strings" or "recursion"' },
  interview:  { name: 'Interview questions', hint: 'Prepare for interviews',               placeholder: 'Topic, e.g. "Machine Learning" or "Java OOP"' },
  resume:     { name: 'Resume guidance',     hint: 'Paste your resume or ask for tips',    placeholder: 'Ask for tips or paste your resume text...' },
};

// What the welcome screen shows for each tool: icon, title, text, example chips (label, question) and a tip
const WELCOME = {
  chat: { icon: '💬', title: "Hi! I'm Aks Me AI 👋", text: 'Your study buddy for programming, AI/ML, maths and engineering subjects.',
    chips: [['Explain neural networks', 'Explain what a neural network is, step by step'], ['Python loops', 'Teach me loops in Python with examples'], ['Supervised vs Unsupervised', 'Difference between supervised and unsupervised learning'], ['Pointers in C', 'Explain pointers in C for a beginner']],
    tip: '💡 Tip: tap ⚙️ to set your semester and subject, 📎 to attach a PDF, 🎤 to speak.' },
  tutor: { icon: '👨‍💻', title: "Let's learn to code! 👨‍💻", text: 'Pick a language at the top, then type a topic. I will teach it from zero with commented examples.',
    chips: [['Variables and data types', 'Variables and data types'], ['Loops', 'Loops'], ['Functions', 'Functions'], ['Arrays / lists', 'Arrays or lists']],
    tip: '💡 Tip: the language picker is at the top: Python, C, C++, Java, HTML, CSS or JavaScript.' },
  notes: { icon: '📝', title: 'Quick study notes 📝', text: 'Type a topic and get neat revision notes: key points, an example and a 5-line summary.',
    chips: [['Linear regression', 'Linear regression'], ['Operating system basics', 'Operating system basics'], ['Normalization in DBMS', 'Normalization in DBMS'], ['Binary search tree', 'Binary search tree']],
    tip: '💡 Tip: attach your PDF with 📎 and ask for notes from it.' },
  quiz: { icon: '❓', title: 'Quiz time! ❓', text: 'Type a topic, tap the answers and see your score at the end.',
    chips: [['Python lists', 'Python lists'], ['Machine Learning basics', 'Machine Learning basics'], ['Pointers in C', 'Pointers in C'], ['HTML and CSS', 'HTML and CSS']],
    tip: '💡 Tip: your scores are saved in 📊 My progress.' },
  flashcards: { icon: '🃏', title: 'Flashcards 🃏', text: 'Type a topic, then tap each card to flip it and memorise the answer.',
    chips: [['Operating System basics', 'Operating System basics'], ['Python keywords', 'Python keywords'], ['Neural network terms', 'Neural network terms'], ['Computer networks', 'Computer networks']],
    tip: '💡 Tip: tap a card to flip it.' },
  exam: { icon: '📚', title: 'Exam mode 📚', text: 'Pick 2, 5 or 10 marks at the top, then type a topic to practise exam-style answers.',
    chips: [['Normalization in DBMS', 'Normalization in DBMS'], ['Process scheduling in OS', 'Process scheduling in OS'], ['Types of machine learning', 'Types of machine learning'], ['OOP concepts in Java', 'OOP concepts in Java']],
    tip: '💡 Tip: these are exam-style practice questions, not real past papers.' },
  planner: { icon: '📅', title: 'Study planner 📅', text: 'Tell me the subject, the number of days and the hours per day. I will make a plan.',
    chips: [['DBMS exam in 5 days', 'DBMS exam in 5 days, 3 hours per day'], ['Python in 7 days', 'Learn Python basics in 7 days, 2 hours per day'], ['Maths revision', 'Maths revision for 10 days, 2 hours per day'], ['Placement prep', 'Placement preparation for 30 days, 3 hours per day']],
    tip: '💡 Tip: if you do not say the days or hours, I assume 7 days and 2 hours per day.' },
  challenge: { icon: '🧩', title: 'Coding challenges 🧩', text: 'Get a problem, try it yourself, and ask for hints when you are stuck.',
    chips: [['Strings', 'Strings'], ['Recursion', 'Recursion'], ['Arrays', 'Arrays'], ['Sorting', 'Sorting']],
    tip: '💡 Tip: I will not give the full solution unless you ask for it.' },
  interview: { icon: '🎯', title: 'Interview practice 🎯', text: 'Pick a topic and practise questions with short model answers.',
    chips: [['Machine Learning', 'Machine Learning'], ['Java OOP', 'Java OOP'], ['Python', 'Python'], ['HR questions for freshers', 'HR questions for freshers']],
    tip: '💡 Tip: say your answer out loud first, then compare it with the model answer.' },
  resume: { icon: '📄', title: 'Resume guidance 📄', text: 'Ask for tips, or paste your resume text and I will review it.',
    chips: [['Fresher resume tips', 'How do I write a good resume as a fresher engineering student?'], ['Projects for AI/ML', 'Which projects should I add to my resume for AI and ML?'], ['Write my summary', 'Help me write a resume summary'], ['Skills section tips', 'How should I write the skills section of my resume?']],
    tip: '💡 Tip: remove your phone number and address before pasting your resume.' },
};
const JSON_MODES = ['quiz', 'flashcards'];  // these answers are JSON, shown as cards/quiz
const LEARNING_MODES = ['tutor', 'notes', 'quiz', 'flashcards', 'exam', 'planner', 'challenge', 'interview'];

// ---------- 3. Saving and loading (localStorage) ----------
// try/catch because some browsers (private mode) block storage.
const STORE = { chats: 'askme_chats_v1', settings: 'askme_settings_v1', progress: 'askme_progress_v1' };

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the app still works, it just won't remember */
  }
}

// ---------- 4. App state (data that changes) ----------
let settings = Object.assign(
  { theme: 'dark', university: '', semester: '', subject: '', language: 'English', marks: '5', progLang: 'Python' },
  load(STORE.settings, {})
);
let chats = load(STORE.chats, []);
if (!Array.isArray(chats)) chats = [];
chats = chats.filter((c) => c && Array.isArray(c.messages)); // drop damaged data

let progress = Object.assign({ days: [], activity: [], quizzes: [], questions: 0 }, load(STORE.progress, {}));

let currentId = null;     // id of the chat on screen (null = a new, empty chat)
let currentMode = 'chat'; // which tool is selected
let isLoading = false;    // true while waiting for an answer
let abortController = null; // lets us cancel a request (Stop button)
let attachment = null;    // the file waiting in the message box: { name, mimeType, data }
// The file that went with each sent message (kept only while the page is open, never saved to localStorage)
const sentFiles = new WeakMap();
let recognition = null;   // the voice recogniser
let listening = false;

const saveSettings = () => save(STORE.settings, settings);
const saveChats = () => save(STORE.chats, chats);
const saveProgress = () => save(STORE.progress, progress);

// ---------- 5. Small helpers ----------
let toastTimer;
function toast(text) { // small message at the bottom of the screen
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

// Make text safe. Prevents HTML injection (XSS): "<b>" becomes plain text.
function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Every tool has its OWN chats. A chat belongs to the tool it was started in.
function toolOf(chat) {
  if (chat.tool && MODES[chat.tool]) return chat.tool;
  const first = chat.messages.find((m) => m.role === 'user' && MODES[m.mode]);
  return first ? first.mode : 'chat';
}

function currentChat() {
  return chats.find((c) => c.id === currentId) || null;
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}
function isNearBottom() { // so we don't yank you down if you scrolled up to read
  return chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight < 160;
}

function autoGrow() { // make the textarea grow as you type
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
}

// ---------- 6. Mini Markdown -> HTML converter ----------
// The AI replies in markdown (**bold**, ```code```, lists...). We turn it into HTML.
function renderMarkdown(raw) {
  // Step A: pull code blocks out first so they are not formatted like normal text
  const codeBlocks = [];
  let text = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const html =
      `<div class="codebox"><div class="codebar"><span>${escapeHtml(lang || 'code')}</span>` +
      `<button class="copy">Copy</button></div><pre><code>${escapeHtml(code.trim())}</code></pre></div>`;
    codeBlocks.push(html);
    return `@@CODE${codeBlocks.length - 1}@@`; // placeholder
  });

  // Step B: escape the remaining text, then apply simple formatting
  text = escapeHtml(text);
  text = text
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Step C: go line by line to build lists, tables and paragraphs
  const lines = text.split('\n');
  let out = '';
  let listType = null; // 'ul' or 'ol' while inside a list
  let tableRows = [];

  const closeList = () => { if (listType) { out += `</${listType}>`; listType = null; } };
  const flushTable = () => {
    if (!tableRows.length) return;
    out += '<table>';
    tableRows.forEach((row, i) => {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      const tag = i === 0 ? 'th' : 'td';
      out += '<tr>' + cells.map((c) => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    out += '</table>';
    tableRows = [];
  };

  for (const line of lines) {
    const t = line.trim();
    if (/^\|.*\|$/.test(t)) {                           // table row
      closeList();
      if (!/^\|[\s:|-]+\|$/.test(t)) tableRows.push(t); // skip the |---|---| line
      continue;
    }
    flushTable();
    if (/^[-*] /.test(t)) {                             // bullet list item
      if (listType !== 'ul') { closeList(); out += '<ul>'; listType = 'ul'; }
      out += `<li>${t.slice(2)}</li>`;
    } else if (/^\d+[.)] /.test(t)) {                   // numbered list item
      if (listType !== 'ol') { closeList(); out += '<ol>'; listType = 'ol'; }
      out += `<li>${t.replace(/^\d+[.)] /, '')}</li>`;
    } else {
      closeList();
      if (/^<h\d>/.test(t) || /^@@CODE\d+@@$/.test(t)) out += t;
      else if (t) out += `<p>${t}</p>`;
    }
  }
  closeList();
  flushTable();

  // Step D: put the code blocks back in place of the placeholders
  return out.replace(/@@CODE(\d+)@@/g, (m, i) => codeBlocks[i]);
}

// ---------- 7. Theme (dark / light) ----------
function applyTheme() {
  document.documentElement.dataset.theme = settings.theme;
  // The button shows what you will switch TO
  themeBtn.textContent = settings.theme === 'dark' ? '☀️' : '🌙';
  themeBtn.title = settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
}
themeBtn.addEventListener('click', () => {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings();
  applyTheme();
});

// ---------- 8. Progress tracking (streak, quiz scores, topics) ----------
const fmtDay = (d) => d.toLocaleDateString('en-CA'); // gives YYYY-MM-DD in your local time

function recordActivity(mode, text) {
  progress.questions += 1;
  const day = fmtDay(new Date());
  if (!progress.days.includes(day)) progress.days.push(day);
  progress.days = progress.days.slice(-120);
  if (LEARNING_MODES.includes(mode)) {
    progress.activity.push({ d: day, mode, topic: text.slice(0, 50) });
    progress.activity = progress.activity.slice(-200);
  }
  saveProgress();
}

function recordQuiz(topic, score, total) {
  progress.quizzes.push({ d: fmtDay(new Date()), topic: topic || 'Quiz', score, total });
  progress.quizzes = progress.quizzes.slice(-100);
  saveProgress();
}

// Count how many days in a row you studied (today counts, or yesterday if you haven't yet today)
function calcStreak() {
  const days = new Set(progress.days);
  const d = new Date();
  if (!days.has(fmtDay(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(fmtDay(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function openProgress() {
  const quizzes = progress.quizzes;
  const avg = quizzes.length
    ? Math.round((100 * quizzes.reduce((sum, q) => sum + q.score / q.total, 0)) / quizzes.length)
    : null;

  // Most recent distinct topics
  const topics = [...new Set(progress.activity.slice().reverse().map((a) => a.topic))].slice(0, 8);
  const recentQuizzes = quizzes.slice(-5).reverse();

  // How many times each tool was used
  const counts = {};
  progress.activity.forEach((a) => { counts[a.mode] = (counts[a.mode] || 0) + 1; });

  let html = '<div class="stats">';
  html += `<div class="stat"><b>🔥 ${calcStreak()}</b><span>day streak</span></div>`;
  html += `<div class="stat"><b>💬 ${progress.questions}</b><span>questions asked</span></div>`;
  html += `<div class="stat"><b>🧪 ${quizzes.length}</b><span>quizzes taken</span></div>`;
  html += `<div class="stat"><b>🎯 ${avg === null ? '–' : avg + '%'}</b><span>average quiz score</span></div>`;
  html += '</div>';

  html += '<h3>Recent quiz scores</h3>';
  html += recentQuizzes.length
    ? '<ul class="plist">' + recentQuizzes.map((q) => `<li><span>${escapeHtml(q.topic)}</span><span>${q.score}/${q.total}</span></li>`).join('') + '</ul>'
    : '<p class="muted">No quizzes yet. Try the ❓ Quiz tool!</p>';

  html += '<h3>Topics you studied</h3>';
  html += topics.length
    ? '<ul class="plist">' + topics.map((t) => `<li><span>${escapeHtml(t)}</span></li>`).join('') + '</ul>'
    : '<p class="muted">Nothing yet. Ask for notes, a quiz or a study plan.</p>';

  const modeLines = Object.keys(counts).map((m) => `<li><span>${escapeHtml(MODES[m] ? MODES[m].name : m)}</span><span>${counts[m]}</span></li>`);
  if (modeLines.length) html += '<h3>Tools used</h3><ul class="plist">' + modeLines.join('') + '</ul>';

  progressBody.innerHTML = html;
  progressDialog.showModal();
}
progressBtn.addEventListener('click', openProgress);
$('progressClose').addEventListener('click', () => progressDialog.close());
$('progressReset').addEventListener('click', () => {
  if (!confirm('Reset your streak, quiz scores and topics?')) return;
  progress = { days: [], activity: [], quizzes: [], questions: 0 };
  saveProgress();
  openProgress(); // redraw with zeros
});

// ---------- 9. Study settings (semester, subject, language) ----------
function updateContextBadge() { // small text under the title
  const bits = [];
  if (settings.semester) bits.push('Sem ' + settings.semester);
  if (settings.subject) bits.push(settings.subject);
  if (settings.language !== 'English') bits.push(settings.language);
  modeHint.textContent = MODES[currentMode].hint + (bits.length ? '  ·  ' + bits.join(' • ') : '');
}

settingsBtn.addEventListener('click', () => {
  $('universityInput').value = settings.university;
  $('semesterSelect').value = settings.semester;
  $('subjectInput').value = settings.subject;
  $('languageSelect').value = settings.language;
  settingsDialog.showModal();
});
$('settingsClose').addEventListener('click', () => settingsDialog.close());
$('settingsSave').addEventListener('click', () => {
  settings.university = $('universityInput').value.trim().slice(0, 80);
  settings.semester = $('semesterSelect').value;
  settings.subject = $('subjectInput').value.trim().slice(0, 80);
  settings.language = $('languageSelect').value;
  saveSettings();
  updateContextBadge();
  settingsDialog.close();
  toast('Settings saved ✅');
});

// The two small pickers in the top bar
langSelect.addEventListener('change', () => { settings.progLang = langSelect.value; saveSettings(); });
marksSelect.addEventListener('change', () => { settings.marks = marksSelect.value; saveSettings(); });

// ---------- 10. Flashcards and Quiz (the answer is JSON) ----------
// The AI is told to send JSON, but we clean it just in case it adds ```json fences.
function parseJson(text) {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}

function renderFlashcards(bubble, jsonText) {
  const cards = parseJson(jsonText); // throws an error if not valid JSON
  if (!Array.isArray(cards) || !cards.length) throw new Error('No cards');

  bubble.innerHTML = '<div class="card-hint">Tap a card to flip it 👇</div>';
  const grid = document.createElement('div');
  grid.className = 'cards';

  cards.forEach((c) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = c.front;              // starts showing the question
    let showingFront = true;
    card.addEventListener('click', () => {   // click = flip
      showingFront = !showingFront;
      card.textContent = showingFront ? c.front : c.back;
      card.classList.toggle('flipped', !showingFront);
    });
    grid.appendChild(card);
  });
  bubble.appendChild(grid);
}

// Check the quiz JSON and tidy it up. Throws an error if something is wrong.
function parseQuiz(text) {
  const arr = parseJson(text);
  if (!Array.isArray(arr) || !arr.length) throw new Error('empty quiz');
  return arr.map((q) => {
    const options = Array.isArray(q.options) ? q.options.map(String) : [];
    let answer = q.answer;
    if (typeof answer === 'string') { // accept "2" or "C" as well as 2
      const n = Number(answer);
      answer = Number.isInteger(n) ? n : 'ABCD'.indexOf(answer.trim().toUpperCase().charAt(0));
    }
    if (!q.question || options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      throw new Error('bad question');
    }
    return { question: String(q.question), options, answer, explanation: String(q.explanation || '') };
  });
}

// Draw a clickable quiz. "msg" is the saved message, so your picks are remembered.
function renderQuiz(bubble, msg) {
  let quiz;
  try {
    quiz = parseQuiz(msg.text);
  } catch {
    bubble.innerHTML = renderMarkdown(msg.text); // fallback: show as plain text
    return;
  }
  if (!Array.isArray(msg.picks) || msg.picks.length !== quiz.length) msg.picks = quiz.map(() => null);

  bubble.innerHTML = '<div class="card-hint">Tap an answer for each question 👇</div>';
  const optionButtons = []; // optionButtons[q][o]
  const explainBoxes = [];

  quiz.forEach((q, qi) => {
    const box = document.createElement('div');
    box.className = 'quiz-q';
    const title = document.createElement('h4');
    title.textContent = `Q${qi + 1}. ${q.question}`;
    box.appendChild(title);

    optionButtons[qi] = q.options.map((optText, oi) => {
      const b = document.createElement('button');
      b.className = 'opt';
      b.textContent = `${'ABCD'.charAt(oi) || oi + 1}. ${optText}`;
      b.addEventListener('click', () => pick(qi, oi));
      box.appendChild(b);
      return b;
    });

    const ex = document.createElement('div');
    ex.className = 'explain hidden';
    box.appendChild(ex);
    explainBoxes[qi] = ex;
    bubble.appendChild(box);
  });

  const scoreBox = document.createElement('div');
  scoreBox.className = 'quiz-score hidden';
  bubble.appendChild(scoreBox);

  // Colour the answers according to what has been picked so far
  function paint() {
    let answered = 0;
    let correct = 0;
    quiz.forEach((q, qi) => {
      const picked = msg.picks[qi];
      if (picked === null) return;
      answered += 1;
      if (picked === q.answer) correct += 1;
      optionButtons[qi].forEach((b, oi) => {
        b.disabled = true;
        if (oi === q.answer) b.classList.add('correct');
        else if (oi === picked) b.classList.add('wrong');
      });
      explainBoxes[qi].textContent = (picked === q.answer ? '✅ Correct! ' : '❌ Not quite. ') + q.explanation;
      explainBoxes[qi].classList.remove('hidden');
    });
    if (answered === quiz.length) {
      const pct = Math.round((100 * correct) / quiz.length);
      scoreBox.textContent = `🎯 Score: ${correct} / ${quiz.length} (${pct}%)` + (pct === 100 ? ' — perfect!' : pct >= 60 ? ' — nice work!' : ' — keep practising!');
      scoreBox.classList.remove('hidden');
      if (!msg.scoreSaved) { // save to your progress only once
        msg.scoreSaved = true;
        recordQuiz(msg.topic, correct, quiz.length);
        saveChats();
      }
    }
  }

  function pick(qi, oi) {
    if (msg.picks[qi] !== null) return; // already answered
    msg.picks[qi] = oi;
    saveChats();
    paint();
  }

  paint(); // restores picks when you open an old chat
}

// ---------- 11. Drawing messages ----------
// A saved message looks like:
//   { role: 'user' | 'model', text, kind: 'text' | 'quiz' | 'flashcards', mode, ... }

function fillAiBubble(bubble, msg) {
  if (msg.kind === 'flashcards') {
    try { renderFlashcards(bubble, msg.text); } catch { bubble.innerHTML = renderMarkdown(msg.text); }
  } else if (msg.kind === 'quiz') {
    renderQuiz(bubble, msg);
  } else {
    const body = msg.text ? renderMarkdown(msg.text) : '';
    const note = msg.text ? '⏹ Stopped' : '⏹ Stopped before an answer arrived. Press Regenerate to try again.';
    bubble.innerHTML = body + (msg.stopped ? `<p class="stopped">${note}</p>` : '');
  }
}

// Buttons under each AI answer.
// "Copy" is on every answer. Regenerate / Simpler / Deeper only make sense for the
// LATEST answer (isLast), because they act on the end of the conversation.
function buildActions(msg, isLast) {
  const bar = document.createElement('div');
  bar.className = 'actions';
  const add = (label, action) => {
    const b = document.createElement('button');
    b.className = 'act';
    b.dataset.action = action;
    b.textContent = label;
    bar.appendChild(b);
  };
  if (msg.kind === 'text') {
    if (msg.text) add('📋 Copy', 'copy');
    if (isLast) {
      add('🔄 Regenerate', 'regen');
      if (msg.text) {
        add('🧒 Simpler', 'simpler');
        add('🔬 Deeper', 'deeper');
      }
    }
  } else if (isLast) {
    add('🔄 New set', 'regen');
  }
  return bar;
}

function buildRow(msg, index, isLast) {
  const row = document.createElement('div');
  row.className = 'msg ' + (msg.role === 'user' ? 'user' : 'ai');
  row.dataset.index = index;

  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (msg.role === 'user') {
    bubble.textContent = (msg.attachName ? '📎 ' + msg.attachName + '\n' : '') + msg.text; // textContent is always safe
    wrap.appendChild(bubble);
  } else {
    fillAiBubble(bubble, msg);
    wrap.appendChild(bubble);
    wrap.appendChild(buildActions(msg, isLast));
  }
  row.appendChild(wrap);
  return row;
}

// Redraw the whole conversation from the saved data
function renderChat() {
  chatBox.querySelectorAll('.msg').forEach((m) => m.remove());
  const chat = currentChat();
  if (!chat || !chat.messages.length) {
    welcome.style.display = '';
    return;
  }
  welcome.style.display = 'none';
  chat.messages.forEach((msg, i) => chatBox.appendChild(buildRow(msg, i, i === chat.messages.length - 1)));
  scrollToBottom();
}

// A temporary AI row with "typing..." dots. It becomes a saved message when done.
function appendTempAiRow() {
  welcome.style.display = 'none';
  const row = document.createElement('div');
  row.className = 'msg ai';
  const wrap = document.createElement('div');
  wrap.className = 'bubble-wrap';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
  wrap.appendChild(bubble);
  row.appendChild(wrap);
  chatBox.appendChild(row);
  scrollToBottom();
  return { row, bubble };
}

function showError(row, bubble, message) {
  row.classList.add('error');
  bubble.textContent = '⚠️ ' + message + ' ';
  const retry = document.createElement('button');
  retry.className = 'act';
  retry.dataset.action = 'retry';
  retry.textContent = '🔄 Retry';
  bubble.appendChild(retry);
}

// ---------- 12. Saved chats list (sidebar) ----------
function persistChats() {
  chats.sort((a, b) => b.updated - a.updated);
  chats = chats.slice(0, 60); // keep the 60 newest
  saveChats();
  renderChatList();
}

function renderChatList() {
  chatList.innerHTML = '';
  const mine = chats.filter((c) => toolOf(c) === currentMode); // only this tool's chats
  const title = $('chatListTitle');
  if (title) title.textContent = 'Recent chats · ' + MODES[currentMode].name;
  if (!mine.length) {
    chatList.innerHTML = '<p class="empty">No chats in this tool yet</p>';
    return;
  }
  mine.forEach((c) => {
    const item = document.createElement('div');
    item.className = 'chat-item' + (c.id === currentId ? ' active' : '');
    const open = document.createElement('button');
    open.className = 'chat-open';
    open.dataset.id = c.id;
    open.textContent = c.title || 'New chat';
    const del = document.createElement('button');
    del.className = 'chat-del';
    del.dataset.del = c.id;
    del.title = 'Delete chat';
    del.setAttribute('aria-label', 'Delete chat');
    del.textContent = '✕';
    item.append(open, del);
    chatList.appendChild(item);
  });
}

chatList.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del]');
  if (del) return deleteChat(del.dataset.del);
  const open = e.target.closest('[data-id]');
  if (open) openChat(open.dataset.id);
});

function stopIfLoading() { if (isLoading && abortController) abortController.abort(); }

function openChat(id) {
  stopIfLoading();
  const chat = chats.find((c) => c.id === id);
  if (!chat) return;
  currentId = id;
  clearAttachment();
  // open the chat in the tool it belongs to
  setMode(toolOf(chat));
  renderChat();
  renderChatList();
  toggleSidebar(false);
}

function deleteChat(id) {
  if (!confirm('Delete this chat?')) return;
  chats = chats.filter((c) => c.id !== id);
  saveChats();
  if (id === currentId) newChatView(); else renderChatList();
}

function newChatView() {
  stopIfLoading();
  currentId = null;
  clearAttachment();
  // a new chat starts empty, in the tool you are using now
  setMode(currentMode);
  renderChat();
  renderChatList();
  toggleSidebar(false);
}
newChatBtn.addEventListener('click', newChatView);

// Click a tool: show THAT tool's latest chat (or an empty one if it has none yet)
function switchTool(mode) {
  stopIfLoading();
  const last = chats.find((c) => toolOf(c) === mode); // chats are sorted newest first
  currentId = last ? last.id : null;
  setMode(mode); // (an attached file stays attached)
  renderChat();
  renderChatList();
  toggleSidebar(false);
}

// ---------- 13. Talking to the server ----------
// Messages that are saved as pairs (question + answer) become the AI's memory.
function buildHistory(messages, upTo) {
  const out = [];
  for (let i = 0; i < upTo; i++) {
    const m = messages[i];
    const n = messages[i + 1];
    // only keep complete pairs (with a real answer), so a failed or stopped
    // question doesn't confuse the AI
    if (m.role === 'user' && n && n.role === 'model' && n.text && n.text.trim() && i + 1 < upTo) {
      out.push({ role: 'user', text: m.text });
      out.push({ role: 'model', text: modelTextForHistory(n) });
      i += 1;
    }
  }
  return out;
}
function modelTextForHistory(m) {
  if (m.kind === 'quiz') return '(I made a quiz for the student.)';
  if (m.kind === 'flashcards') return '(I made flashcards for the student.)';
  return m.text;
}

function buildPayload(userMsg, messages, index) {
  return JSON.stringify({
    message: userMsg.text,
    history: buildHistory(messages, index),
    mode: userMsg.mode,
    language: settings.progLang,          // programming language (tutor mode)
    marks: Number(settings.marks),        // exam mode
    answerLanguage: settings.language,    // English / Hindi / Telugu
    context: { university: settings.university, semester: settings.semester, subject: settings.subject },
    attachment: sentFiles.has(userMsg) ? (({ name, mimeType, data }) => ({ name, mimeType, data }))(sentFiles.get(userMsg)) : undefined,
  });
}

// Normal request: wait for the complete answer (quiz and flashcards)
async function fetchFullAnswer(payload, signal) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data.reply;
}

// STREAMING request: the server sends the answer in small pieces and we
// redraw the bubble each time, so text appears almost instantly.
// "partial.text" always holds what has arrived so far (kept if you press Stop).
async function streamAnswer(payload, bubble, signal, partial) {
  const response = await fetch('/api/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Something went wrong.');
  }

  const reader = response.body.getReader(); // reads the answer piece by piece
  const decoder = new TextDecoder();        // turns bytes into text
  let drawScheduled = false;

  const draw = () => {
    drawScheduled = false;
    const stick = isNearBottom();
    // If a code block is still open (odd number of ```), close it temporarily
    const open = (partial.text.match(/```/g) || []).length % 2 === 1;
    bubble.innerHTML = renderMarkdown(open ? partial.text + '\n```' : partial.text);
    if (stick) scrollToBottom();
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    partial.text += decoder.decode(value, { stream: true });
    if (!drawScheduled) {
      drawScheduled = true;
      requestAnimationFrame(draw);
    }
  }
  partial.text += decoder.decode(); // flush leftover bytes
  draw();
  return partial.text;
}

function setLoading(on) {
  isLoading = on;
  sendBtn.classList.toggle('stop', on);
  sendBtn.textContent = on ? '■' : '➤';
  sendBtn.setAttribute('aria-label', on ? 'Stop generating' : 'Send');
  sendBtn.title = on ? 'Stop generating' : 'Send';
}

// Ask the AI to answer the LAST message of the current chat (which must be the student's).
async function generate() {
  const chat = currentChat();
  if (!chat || !chat.messages.length) return;
  const index = chat.messages.length - 1;
  const userMsg = chat.messages[index];
  if (userMsg.role !== 'user') return;

  setLoading(true);
  abortController = new AbortController();
  const { row, bubble } = appendTempAiRow();
  const payload = buildPayload(userMsg, chat.messages, index);
  const partial = { text: '' };

  try {
    let reply;
    let kind = 'text';

    if (JSON_MODES.includes(userMsg.mode)) {
      reply = await fetchFullAnswer(payload, abortController.signal);
      // check it really is valid; if not, show it as normal text
      try {
        if (userMsg.mode === 'quiz') parseQuiz(reply); else parseJson(reply);
        kind = userMsg.mode;
      } catch {
        kind = 'text';
      }
    } else {
      reply = await streamAnswer(payload, bubble, abortController.signal, partial);
    }

    chat.messages.push({ role: 'model', text: reply, kind, mode: userMsg.mode, topic: userMsg.text.slice(0, 50) });
    chat.updated = Date.now();
    persistChats();
  } catch (err) {
    if (err.name === 'AbortError') {
      // You pressed Stop: keep whatever text had arrived
      chat.messages.push({
        role: 'model',
        kind: 'text',
        mode: userMsg.mode,
        stopped: true,
        text: partial.text, // may be empty if you stopped before anything arrived
      });
      chat.updated = Date.now();
      persistChats();
    } else {
      showError(row, bubble, err.message || 'Could not reach the server.');
      setLoading(false);
      input.focus();
      return; // keep the error row on screen with its Retry button
    }
  }

  setLoading(false);
  if (currentId === chat.id) renderChat(); // show the final answer with its buttons
  input.focus();
}

// ---------- 14. Sending, stopping, regenerating ----------
// opts.mode     = use another tool just for this message
// opts.followUp = true for "Simpler"/"Deeper" (not counted as new progress)
async function send(rawText, opts = {}) {
  if (isLoading) return;
  let text = rawText.trim();
  if (!text && attachment) text = 'Summarize this file and list the key points.';
  if (!text) return;
  const mode = opts.mode || currentMode;

  // Make a new saved chat the first time you send something
  let chat = currentChat();
  if (!chat) {
    chat = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: text.slice(0, 40), tool: currentMode, messages: [], updated: Date.now() };
    chats.unshift(chat);
    currentId = chat.id;
  }

  const userMsg = { role: 'user', text, mode, attachName: attachment ? attachment.name : undefined };
  if (attachment) sentFiles.set(userMsg, attachment); // the file travels with THIS message
  chat.messages.push(userMsg);
  clearAttachment();                                   // and leaves the message box right away
  chat.updated = Date.now();
  persistChats();
  if (!opts.followUp) recordActivity(mode, text);

  input.value = '';
  autoGrow();
  renderChat();
  await generate();
}

function stopGenerating() {
  if (abortController) abortController.abort();
}

// Throw away answer #index (and everything after it) and ask again
function regenerate(index) {
  const chat = currentChat();
  if (!chat || !chat.messages[index] || index < 1) return;
  chat.messages.length = index; // now the last message is the student's question
  const q = chat.messages[index - 1];
  if (q && q.attachName && !sentFiles.has(q)) toast('The file is not in memory any more (the page was reloaded). Attach it again to include it.');
  saveChats();
  renderChat();
  generate();
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = '✅ Copied';
    setTimeout(() => (btn.textContent = old), 1500);
  } catch {
    toast('Could not copy. Select the text and copy it by hand.');
  }
}

// One click listener for everything inside the chat (event delegation)
chatBox.addEventListener('click', async (e) => {
  // "Copy" on a code block
  const codeCopy = e.target.closest('.copy');
  if (codeCopy) {
    copyText(codeCopy.closest('.codebox').querySelector('code').textContent, codeCopy);
    return;
  }

  // Buttons under an answer
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const row = btn.closest('.msg');

  if (action === 'retry') {
    if (isLoading) return;
    row.remove();
    generate();
    return;
  }

  const chat = currentChat();
  const msg = chat && chat.messages[Number(row.dataset.index)];
  if (!msg) return;

  if (action === 'copy') return copyText(msg.text, btn);
  if (isLoading) return toast('Please wait, or press ■ to stop first.');

  if (action === 'regen') regenerate(Number(row.dataset.index));
  else if (action === 'simpler') send('Explain that again in simpler words, with an easy real-life example.', { mode: 'chat', followUp: true });
  else if (action === 'deeper') send('Go deeper on that: add more detail, edge cases and a harder example.', { mode: 'chat', followUp: true });
});

// ---------- 15. Attach a PDF / image ----------
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = ''; // so you can pick the same file again later
  if (!file) return;
  if (!FILE_TYPES.includes(file.type)) return toast('Please choose a PDF, PNG, JPG or WEBP file.');
  if (file.size > MAX_FILE_BYTES) return toast('That file is too big. The limit is 5 MB.');

  const reader = new FileReader();
  reader.onload = () => {
    // reader.result looks like "data:application/pdf;base64,AAAA..." - we keep the part after the comma
    attachment = { name: file.name, mimeType: file.type, data: String(reader.result).split(',')[1] };
    showAttachment();
    toast('Attached ✅ Now type your question and press Send. The file goes with that message.');
  };
  reader.onerror = () => toast('Could not read that file.');
  reader.readAsDataURL(file);
});

function showAttachment() {
  attachChip.classList.toggle('hidden', !attachment);
  attachName.textContent = attachment ? attachment.name : '';
}
function clearAttachment() {
  attachment = null;
  showAttachment();
}
attachRemove.addEventListener('click', clearAttachment);

// ---------- 16. Voice input (speech to text) ----------
// Uses the browser's built-in speech recogniser (works in Chrome, Edge, Safari).
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOICE_LANGS = { English: 'en-IN', Hindi: 'hi-IN', Telugu: 'te-IN' };

if (!SpeechRec) {
  micBtn.classList.add('hidden'); // this browser can't do it, so hide the button
} else {
  micBtn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }

    recognition = new SpeechRec();
    recognition.lang = VOICE_LANGS[settings.language] || 'en-IN'; // follows your answer language
    recognition.interimResults = true;  // show words while you speak
    recognition.continuous = false;     // stop after you pause
    const base = input.value ? input.value.trimEnd() + ' ' : ''; // keep what you already typed

    recognition.onstart = () => {
      listening = true;
      micBtn.classList.add('listening');
      toast('🎤 Listening... speak now');
    };
    recognition.onresult = (e) => {
      let spoken = '';
      for (let i = 0; i < e.results.length; i++) spoken += e.results[i][0].transcript;
      input.value = base + spoken;
      autoGrow();
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast('Microphone is blocked. Allow it in your browser settings.');
      else if (e.error === 'no-speech') toast("I didn't hear anything. Try again.");
      // "network" = the browser could not reach its online speech service
      else if (e.error === 'network') toast('Voice needs a working internet connection. Turn off any VPN, use Chrome, or just type your question.');
      else if (e.error === 'audio-capture') toast('No microphone found. Plug one in or check your system sound settings.');
      else if (e.error === 'language-not-supported') toast('Your browser cannot recognise this language. Set the answer language to English in ⚙️.');
      else if (e.error === 'aborted') { /* you pressed the mic again - nothing to report */ }
      else toast('Voice input error: ' + e.error);
    };
    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove('listening');
      input.focus();
    };
    try { recognition.start(); } catch { /* already running */ }
  });
}

// ---------- 17. Switching tools, menu, keyboard ----------
// Fill the welcome screen with the text and example chips of the chosen tool
function renderWelcome(mode) {
  const w = WELCOME[mode] || WELCOME.chat;
  welcome.innerHTML =
    '<h1>' + escapeHtml(w.title) + '</h1>' +
    '<p>' + escapeHtml(w.text) + '</p>' +
    '<div class="chips">' +
    w.chips.map((c) => '<button class="chip" data-text="' + escapeHtml(c[1]) + '">' + escapeHtml(c[0]) + '</button>').join('') +
    '</div>' +
    '<p class="tip">' + escapeHtml(w.tip) + '</p>';
}

function setMode(mode) {
  currentMode = mode;
  // Each tool has its own look: colours (CSS reads data-mode) and its own animated background
  document.documentElement.dataset.mode = mode;
  document.querySelectorAll('.scene[data-for]').forEach((sc) => sc.classList.toggle('on', sc.dataset.for === mode));
  renderWelcome(mode);
  modeName.textContent = (WELCOME[mode] ? WELCOME[mode].icon + ' ' : '') + MODES[mode].name;
  input.placeholder = MODES[mode].placeholder;
  langSelect.classList.toggle('hidden', mode !== 'tutor'); // language picker only for tutor
  marksSelect.classList.toggle('hidden', mode !== 'exam'); // marks picker only for exam mode
  updateContextBadge();
  document.querySelectorAll('.tool').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

function toggleSidebar(open) { // phones: slide the menu in/out
  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('show', open);
}

document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchTool(btn.dataset.mode);
    input.focus();
  });
});

// The send button turns into a Stop button while the AI is answering
sendBtn.addEventListener('click', () => (isLoading ? stopGenerating() : send(input.value)));

// Enter = send, Shift+Enter = new line
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    send(input.value);
  }
});
input.addEventListener('input', autoGrow);

// Example question chips on the welcome screen
welcome.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip) send(chip.dataset.text);
});

menuBtn.addEventListener('click', () => toggleSidebar(!sidebar.classList.contains('open')));
backdrop.addEventListener('click', () => toggleSidebar(false));

// ---------- 18. Start the app ----------
applyTheme();
langSelect.value = settings.progLang;
marksSelect.value = settings.marks;
setMode('chat');
renderChatList();
renderChat(); // shows the welcome screen (a fresh chat)
