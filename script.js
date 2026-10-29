// =====================================================================
// script.js : the BRAIN of the frontend (runs in the browser)
// It handles: sending messages, showing answers, switching tools.
// =====================================================================

// ---------- 1. Grab HTML elements we need to control ----------
const chatBox = document.getElementById('chat');
const welcome = document.getElementById('welcome');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const modeName = document.getElementById('modeName');
const modeHint = document.getElementById('modeHint');
const langSelect = document.getElementById('langSelect');

// ---------- 2. Settings for each tool button ----------
// name = title shown on top, hint = small text, placeholder = text inside the input box
const MODES = {
  chat:       { name: 'Ask anything',        hint: 'Ask any study question',            placeholder: 'Ask any question...' },
  tutor:      { name: 'Programming tutor',   hint: 'Pick a language, then type a topic', placeholder: 'Topic, e.g. "arrays" or "functions"' },
  notes:      { name: 'Study notes',         hint: 'Get quick revision notes',          placeholder: 'Topic, e.g. "Linear regression"' },
  quiz:       { name: 'Quiz',                hint: 'Test yourself with MCQs',           placeholder: 'Topic, e.g. "Python lists"' },
  flashcards: { name: 'Flashcards',          hint: 'Click a card to flip it',           placeholder: 'Topic, e.g. "Operating System basics"' },
  planner:    { name: 'Study planner',       hint: 'Tell me the subject, days and hours', placeholder: 'e.g. "DBMS exam in 5 days, 3 hours/day"' },
  challenge:  { name: 'Coding challenge',    hint: 'Practice problems',                 placeholder: 'Topic, e.g. "strings" or "recursion"' },
  interview:  { name: 'Interview questions', hint: 'Prepare for interviews',            placeholder: 'Topic, e.g. "Machine Learning" or "Java OOP"' },
  resume:     { name: 'Resume guidance',     hint: 'Paste your resume or ask for tips', placeholder: 'Ask for tips or paste your resume text...' },
};

// ---------- 3. App state (data that changes) ----------
let currentMode = 'chat';
let history = [];      // previous messages, so the AI remembers the conversation
let isLoading = false; // prevents sending twice while waiting

// ---------- 4. Helper: make text safe ----------
// Prevents HTML injection (a security issue called XSS). "<b>" becomes plain text.
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- 5. Mini Markdown -> HTML converter ----------
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
    if (/^\|.*\|$/.test(t)) {                      // table row
      closeList();
      if (!/^\|[\s:|-]+\|$/.test(t)) tableRows.push(t); // skip the |---|---| line
      continue;
    }
    flushTable();
    if (/^[-*] /.test(t)) {                         // bullet list item
      if (listType !== 'ul') { closeList(); out += '<ul>'; listType = 'ul'; }
      out += `<li>${t.slice(2)}</li>`;
    } else if (/^\d+[.)] /.test(t)) {               // numbered list item
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

// ---------- 6. Show a message in the chat ----------
// who = 'user' | 'ai'. Returns the bubble so we can fill it later.
function addMessage(who, content, extraClass = '') {
  if (welcome) welcome.style.display = 'none'; // hide welcome screen after first message

  const row = document.createElement('div');
  row.className = `msg ${who} ${extraClass}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';

  if (who === 'user') bubble.textContent = content;     // textContent is always safe
  else if (content) bubble.innerHTML = renderMarkdown(content);

  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();
  return bubble;
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight; // auto-scroll to newest message
}

// ---------- 7. Flashcards: AI sends JSON, we show flip cards ----------
function renderFlashcards(bubble, jsonText) {
  const cards = JSON.parse(jsonText); // throws an error if not valid JSON
  if (!Array.isArray(cards) || !cards.length) throw new Error('No cards');

  bubble.innerHTML = '<div class="card-hint">Click a card to flip it 👇</div>';
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

// ---------- 8. Send a message to our server ----------
async function sendMessage(text) {
  text = text.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  input.value = '';
  input.style.height = 'auto';

  addMessage('user', text);

  // Show the "typing..." dots while we wait
  const bubble = addMessage('ai', '');
  bubble.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';

  try {
    // fetch() sends data to our backend (server.js)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: history,
        mode: currentMode,
        language: langSelect.value,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Something went wrong.');

    // Show the answer
    if (currentMode === 'flashcards') {
      try {
        renderFlashcards(bubble, data.reply);
      } catch {
        bubble.innerHTML = renderMarkdown(data.reply); // fallback: show as plain text
      }
    } else {
      bubble.innerHTML = renderMarkdown(data.reply);
    }

    // Remember this exchange for the next question
    history.push({ role: 'user', text });
    history.push({ role: 'model', text: data.reply });
    if (history.length > 20) history = history.slice(-20);
  } catch (err) {
    // Error handling: show a red message instead of crashing
    bubble.parentElement.classList.add('error');
    bubble.textContent = '⚠️ ' + (err.message || 'Could not reach the server.');
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
    scrollToBottom();
  }
}

// ---------- 9. Switch between tools ----------
function setMode(mode) {
  currentMode = mode;
  modeName.textContent = MODES[mode].name;
  modeHint.textContent = MODES[mode].hint;
  input.placeholder = MODES[mode].placeholder;
  langSelect.classList.toggle('hidden', mode !== 'tutor'); // language picker only for tutor

  document.querySelectorAll('.tool').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  sidebar.classList.remove('open'); // close the menu on phones
  input.focus();
}

// ---------- 10. Event listeners (react to clicks and keys) ----------
sendBtn.addEventListener('click', () => sendMessage(input.value));

// Enter = send, Shift+Enter = new line
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(input.value);
  }
});

// Make the textarea grow as the user types
input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 160) + 'px';
});

// Sidebar tool buttons
document.querySelectorAll('.tool').forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// Example question chips on the welcome screen
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => sendMessage(chip.dataset.text));
});

// Copy buttons inside code blocks (event delegation: one listener for all)
chatBox.addEventListener('click', (e) => {
  if (e.target.classList.contains('copy')) {
    const code = e.target.closest('.codebox').querySelector('code').textContent;
    navigator.clipboard.writeText(code);
    e.target.textContent = 'Copied!';
    setTimeout(() => (e.target.textContent = 'Copy'), 1500);
  }
});

// New chat: clear everything
newChatBtn.addEventListener('click', () => {
  history = [];
  chatBox.querySelectorAll('.msg').forEach((m) => m.remove());
  welcome.style.display = '';
  setMode('chat');
});

// Hamburger menu (phones)
menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

setMode('chat'); // start in normal chat mode
