# 🎓 Aks Me AI

An AI study assistant for students: chat, programming tutor, notes, interactive quizzes, flashcards, exam-style answers, study planner, coding challenges, interview prep and resume guidance. Built with HTML/CSS/JavaScript, Node.js + Express and the Google Gemini API.

## Folder structure

```
askme-ai/
├── index.html    # page structure (sidebar, chat, pop-ups)
├── style.css     # dark + light themes, phone layout
├── script.js     # frontend logic (chat, history, quiz, voice, PDF, progress)
├── server.js     # Express backend that safely calls Gemini
├── .env          # secret API key (never share!)
├── .gitignore    # keeps .env and node_modules out of Git
├── package.json  # project info + dependencies
└── README.md
```

## Setup

1. Install **Node.js 18 or newer** from https://nodejs.org (check with `node -v`).
2. Get a free Gemini API key at https://aistudio.google.com/apikey
3. In the project folder run:

```bash
npm install
```

4. Create a file named `.env` with:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3000
```

5. Start the app:

```bash
npm start
```

6. Open http://localhost:3000 (do **not** open `index.html` by double-clicking it).

| Command | What it does |
|---|---|
| `npm install` | Downloads the libraries listed in package.json |
| `npm start` | Runs the server |
| `npm run dev` | Runs the server and restarts when you edit code |

## Features

| Feature | How to use it |
|---|---|
| **Streaming answers** | Text appears word by word. Press **■** to stop. |
| **Saved chats** | Every chat is saved in your browser (sidebar → Recent chats). |
| **Copy / Regenerate / Simpler / Deeper** | Buttons under the latest answer. |
| **Study settings (⚙️)** | Set university/course, semester, subject and answer language (English, Hindi, Telugu). |
| **Light / dark theme** | ☀️ / 🌙 button in the top bar. |
| **Interactive quiz** | ❓ Quiz → type a topic → tap answers, get a score. |
| **Flashcards** | 🃏 Flashcards → tap a card to flip it. |
| **Exam mode** | 📚 Exam mode → choose 2 / 5 / 10 marks → type a topic. These are exam-*style* practice questions, not real past papers. |
| **Progress (📊)** | Day streak, quizzes taken, average score, topics studied. |
| **PDF / image input (📎)** | Attach a PDF, PNG, JPG or WEBP (max 5 MB) and ask about it. Press ✕ on the file chip when you are done. |
| **Voice input (🎤)** | Speak your question. Works in Chrome, Edge and Safari (needs https or localhost). Follows your answer language. |

## How it works

```
Browser (script.js) → POST /api/chat-stream → server.js → Gemini API
Browser ← words as they arrive ←──────────── server.js ← Gemini API
```

- Quiz and flashcards use `/api/chat` (they need the complete JSON before they can be drawn).
- Your API key stays in `server.js`; the browser never sees it.

## Privacy

- Chats, settings and progress are stored **only in your own browser** (localStorage). Clearing site data deletes them.
- Attached files are sent to Gemini to answer your question. They are not stored by this app.

## Security notes

- `.env` is listed in `.gitignore`. Never upload it to GitHub.
- The server serves only `index.html`, `style.css` and `script.js`, so `.env` cannot be downloaded.
- Input is validated, attachments are type- and size-checked, and each IP is rate-limited (30 requests/min).
- AI answers are HTML-escaped before display (prevents XSS).
- If your key ever leaks, delete it in Google AI Studio and create a new one.

## Deploying on Render

1. Put all files except `.env` and `node_modules` on GitHub.
2. Render → New → Web Service → connect the repo.
3. Build command `npm install`, start command `npm start`.
4. Environment variables: `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.5-flash-lite`.
5. To update later, edit the files on GitHub; Render redeploys automatically.

The free plan sleeps when idle, so the first request after a pause can take 30-60 seconds.

## Troubleshooting

- **"AI model not found"**: change `GEMINI_MODEL` (try `gemini-3.5-flash-lite` or `gemini-flash-latest`). Older 2.5 models are restricted for new users.
- **"API key was rejected"**: create a new key in Google AI Studio (normal keys start with `AIza`).
- **"Usage limit reached"**: the free tier has limits; wait a minute.
- **Microphone does nothing**: allow the microphone in your browser, and use Chrome, Edge or Safari. Firefox has no speech recognition.
- **PDF too big**: the limit is 5 MB. Split the file or attach fewer pages.
- **Port in use**: change `PORT` in `.env`.
