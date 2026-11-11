# 🎓 Ask Me AI

An AI study assistant for students: chat, programming tutor, notes, interactive quizzes, flashcards, exam-style answers, study planner, coding challenges, interview prep and resume guidance, plus course tools for **Agriculture 🌾, Business management 💼 and Pharmacy 💊** students. Built with HTML/CSS/JavaScript, Node.js + Express and the Google Gemini API.

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

   **Several keys (optional):** use `GEMINI_API_KEYS=key1,key2,key3,key4` (separated by commas, no spaces needed) instead of `GEMINI_API_KEY`. Requests are spread over the keys, and if one runs out of quota or is rejected, the server quietly retries with the next. Gemini limits are counted **per Google Cloud project**, so keys that live in the same project share one quota; create each key in a different project for separate quotas, and check Google's Gemini API terms first.

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
| **Saved chats (one set per tool)** | Every tool has its own chats: Quiz chats stay in Quiz, Notes chats in Notes. Click a tool to see its latest chat; **+ New chat** starts an empty chat in the tool you are using. Chats are saved in your browser (sidebar → Recent chats). |
| **A different look for every tool** | Each tool has its own animated background, colours and welcome card. |
| **Copy / Regenerate / Simpler / Deeper** | Buttons under the latest answer. |
| **Study settings (⚙️)** | Set university/course, semester, subject and answer language (English, Hindi, Telugu). |
| **Light / dark theme** | ☀️ / 🌙 button in the top bar. |
| **Interactive quiz** | ❓ Quiz → type a topic → tap answers, get a score. |
| **Flashcards** | 🃏 Flashcards → tap a card to flip it. |
| **Exam mode** | 📚 Exam mode → choose 2 / 5 / 10 marks → type a topic. These are exam-*style* practice questions, not real past papers. |
| **Progress (📊)** | Day streak, quizzes taken, average score, topics studied. |
| **PDF / image input (📎)** | Attach a PDF, PNG, JPG or WEBP (max 14 MB) and ask about it. Press ✕ on the file chip when you are done. |
| **Animated background** | A night study-desk scene (moon, stars, lamp, books, clock) sits behind the chat. It follows light/dark mode and switches off if your device is set to reduce motion. |
| **Voice input (🎤)** | Speak your question. Works in Chrome, Edge and Safari (needs https or localhost). Follows your answer language. |

## How it works

```
Browser (script.js) → POST /api/chat-stream → server.js → Gemini API
Browser ← words as they arrive ←──────────── server.js ← Gemini API
```

- Quiz and flashcards use `/api/chat` (they need the complete JSON before they can be drawn).
- Your API keys stay on the server; the browser never sees them. Never paste keys in chat or commit them to GitHub.

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
4. Environment variables: `GEMINI_API_KEYS` (all keys, comma-separated; or `GEMINI_API_KEY` for one) and `GEMINI_MODEL=gemini-3.5-flash-lite`.
5. To update later, edit the files on GitHub; Render redeploys automatically.

The free plan sleeps when idle, so the first request after a pause can take 30-60 seconds.

## Troubleshooting

- **"AI model not found"**: change `GEMINI_MODEL` (try `gemini-3.5-flash-lite` or `gemini-flash-latest`). Older 2.5 models are restricted for new users.
- **"API key was rejected"**: create a new key in Google AI Studio (normal keys start with `AIza`).
- **"Usage limit reached"**: the free tier has limits; wait a minute.
- **Microphone does nothing**: allow the microphone in your browser, and use Chrome, Edge or Safari. Firefox has no speech recognition.
- **PDF too big**: the limit is 14 MB. Split the file or attach fewer pages.
- **Port in use**: change `PORT` in `.env`.

## 🎧 Voice conversation (like ChatGPT voice)

Tap the **🎧** button next to the message box.

- Speak your question, the AI answers **out loud** sentence by sentence while it is still writing, then listens again (hands-free).
- Tap the glowing orb: while listening = send what you said, while speaking = interrupt and talk, while thinking = stop.
- **Interrupt anytime:** while the AI is talking, just start speaking. It stops and listens to you. (Headphones work best; on loud speakers the mic can hear the AI. Turn the **Interrupt** chip off if that happens, you can still tap the orb.)
- Chips on the screen: **Hands-free** on/off, **Interrupt** on/off, **speed** (0.85x to 1.3x), and **language**.
- Every answer also has a **🔊 Listen** button to read it aloud.
- Spoken answers are short and plain (no tables or emojis); code is shown on screen only.
- Works in Chrome, Edge and Safari, needs internet and microphone permission. Hindi/Telugu voices depend on voices installed on your device.
- Not available inside Quiz and Flashcards.

## 🌾 💼 💊 Other courses

The sidebar has an **Other courses** section with one tool each for Agriculture, Business management and Pharmacy students. Each tool has its own animated background, colours, welcome card, AI teaching style (set in `MODE_PROMPTS` in `server.js`) and separate chat history. Pharmacy answers are for study only, not personal medical advice.

## 🧮 Maths, Physics & Chemistry notes (B.Tech)

Open **Maths · Physics · Chemistry** in the sidebar. Choose the **Subject**, **Note type**, type the **Chapter** and **Topic** (or tap a chapter chip) and press **Make notes**.

- Note types: Detailed notes, Quick revision, Formulas and constants, Solved problems, Derivations and proofs, Exam questions with answers.
- Notes follow a teacher's layout: introduction, definitions, laws/theorems, formula table, derivation, solved examples, common mistakes, exam questions and quick revision.
- Formulas are drawn properly (fractions, integrals, matrices, chemical equations) with KaTeX. KaTeX is loaded from cdnjs.cloudflare.com, so the formulas need internet (without it you see the raw formula text).
- Attach a PDF or photo of your sir's notes with 📎 and press Make notes: the notes are built from that file (PDF or photo up to 14 MB).
- Press **📄 PDF** under any answer, then choose "Save as PDF" as the printer to download the notes.
- You can also type any normal doubt in this tool.

## Update: four separate science tools

Under **B.Tech Maths & Science** there are now four tools: 📐 Maths, ⚛️ Physics, 🧪 Chemistry and ⚡ Basic Electrical Engg. Each has its own background, colours, chapter list and chats. Files you attach (PDF, PNG, JPG, WEBP) can now be up to **14 MB**.
