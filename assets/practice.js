// Interactive practice engine: mode picker, session runner, scoring, word diff.
const main = document.getElementById("main");

let list = null;
let progress = {};
let session = null; // { mode, queue: [{word, requeues}], index, total, correctFirstTry, order }

function esc(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function init() {
  list = Store.getList();
  progress = Store.getProgress();
  renderModePicker();

  const remote = await GitHub.loadLatest();
  if (remote && (!list || new Date(remote.updatedAt) > new Date(list.updatedAt || 0))) {
    list = remote;
    Store.setList(list);
    renderModePicker();
  }
}

function renderModePicker() {
  const words = list?.words || [];
  if (!words.length) {
    main.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <div class="icon">✏️</div>
          <p>No words to practice yet.</p>
          <p class="help-text">Use the <code>/add-words</code> skill in Claude Code to add this week's list.</p>
        </div>
      </div>`;
    return;
  }

  const masteredCount = words.filter((w) => progress[w.id]?.mastered).length;

  main.innerHTML = `
    <div class="card">
      <h1>Practice: ${esc(list.label || "This week's words")}</h1>
      <p class="sub">${words.length} words &middot; ${masteredCount} mastered so far</p>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(masteredCount / words.length) * 100}%"></div></div>
    </div>
    <div class="card">
      <h2>Choose how to practice</h2>
      <div class="mode-grid">
        <div class="mode-card" data-mode="learn">
          <div class="icon">👀</div>
          <div class="title">Look, Say, Cover, Write</div>
          <div class="desc">See the word, hear it, then cover it and write it from memory.</div>
        </div>
        <div class="mode-card" data-mode="listen">
          <div class="icon">🎧</div>
          <div class="title">Listen &amp; Spell</div>
          <div class="desc">Just hear the word (no peeking!) and type what you hear.</div>
        </div>
        <div class="mode-card" data-mode="quiz">
          <div class="icon">⭐</div>
          <div class="title">Quick Quiz</div>
          <div class="desc">A mixed, timed-feel round of all your words &mdash; tricky ones repeat.</div>
        </div>
      </div>
    </div>`;

  main.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => startSession(card.dataset.mode));
  });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSession(mode, wordsOverride) {
  const pool = wordsOverride || list.words;
  session = {
    mode,
    queue: shuffle(pool).map((w) => ({ word: w, requeues: 0 })),
    total: pool.length,
    correctFirstTry: 0,
    seenIds: new Set(),
  };
  nextRound();
}

function roundTypeForQuiz() {
  return Math.random() < 0.5 ? "learn" : "listen";
}

function nextRound() {
  if (!session.queue.length) {
    renderSummary();
    return;
  }
  const item = session.queue.shift();
  const roundType = session.mode === "quiz" ? roundTypeForQuiz() : session.mode;
  session.current = item;
  session.currentRoundType = roundType;
  session.currentAttempted = false;

  if (roundType === "learn") {
    renderLearnStudy(item.word);
  } else {
    renderListenWrite(item.word);
  }
}

function progressPill(wordId) {
  const p = progress[wordId];
  if (p?.mastered) return `<span class="pill">Mastered</span>`;
  if (p?.streak) return `<span class="pill">Streak ${p.streak}</span>`;
  return "";
}

function renderLearnStudy(word) {
  main.innerHTML = `
    <div class="card">
      <p class="sub">Word ${session.seenIds.size + 1} of ${session.total} ${progressPill(word.id)}</p>
      <button class="speak-btn" id="speak" title="Hear the word">🔊</button>
      <div class="big-word">${esc(word.word)}</div>
      ${word.hint ? `<p class="sub" style="text-align:center">💡 ${esc(word.hint)}</p>` : ""}
      ${word.sentence ? `<p class="sub" style="text-align:center">&ldquo;${esc(word.sentence)}&rdquo;</p>` : ""}
      <p class="sub" style="text-align:center">Look at the word and say it in your head. When you're ready, cover it up!</p>
      <div class="btn-row" style="justify-content:center">
        <button class="btn" id="cover-btn">Cover &amp; write it</button>
      </div>
    </div>`;

  document.getElementById("speak").addEventListener("click", () => Speech.speak(word.word));
  document.getElementById("cover-btn").addEventListener("click", () => renderWrite(word, "learn"));
  Speech.speak(word.word);
}

function renderListenWrite(word) {
  renderWrite(word, "listen");
}

function renderWrite(word, roundType) {
  main.innerHTML = `
    <div class="card">
      <p class="sub">Word ${session.seenIds.size + 1} of ${session.total} ${progressPill(word.id)}</p>
      <button class="speak-btn" id="speak" title="Hear the word">🔊</button>
      <p class="sub" style="text-align:center">${roundType === "listen" ? "Listen carefully and type what you hear." : "No peeking &mdash; write the word from memory!"}</p>
      <form id="write-form">
        <div class="field">
          <input type="text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the word here" style="text-align:center; font-size:1.3rem;" />
        </div>
        <div class="btn-row" style="justify-content:center">
          <button type="submit" class="btn">Check</button>
        </div>
      </form>
    </div>`;

  const speakIt = () => Speech.speak(roundType === "listen" && word.sentence ? word.sentence : word.word);
  document.getElementById("speak").addEventListener("click", speakIt);
  const input = document.getElementById("answer");
  input.focus();
  document.getElementById("write-form").addEventListener("submit", (e) => {
    e.preventDefault();
    checkAnswer(word, input.value, roundType);
  });

  if (roundType === "listen") speakIt();
}

// Edit-distance alignment so the diff view lines up even with extra/missing letters.
function diffWords(correct, typed) {
  const a = correct.split("");
  const b = typed.split("");
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const ops = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
      ops.unshift({ type: "ok", ch: a[i - 1] });
      i--; j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.unshift({ type: "wrong", ch: a[i - 1] });
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.unshift({ type: "missing", ch: a[i - 1] });
      i--;
    } else {
      ops.unshift({ type: "extra", ch: b[j - 1] });
      j--;
    }
  }
  return ops;
}

function renderDiff(ops) {
  return ops
    .filter((op) => op.type !== "extra")
    .map((op) => {
      const cls = op.type === "ok" ? "ok" : op.type === "wrong" ? "wrong" : "missing";
      return `<span class="diff-letter ${cls}">${esc(op.ch)}</span>`;
    })
    .join("");
}

function checkAnswer(word, typed, roundType) {
  const clean = typed.trim();
  const isCorrect = clean.toLowerCase() === word.word.toLowerCase() && clean.length > 0;
  const ops = diffWords(word.word, clean);

  if (!progress[word.id]) progress[word.id] = { streak: 0, attempts: 0, mastered: false };
  const p = progress[word.id];
  p.attempts += 1;

  if (isCorrect) {
    p.streak = (p.streak || 0) + 1;
    if (p.streak >= 2) p.mastered = true;
    if (!session.seenIds.has(word.id)) session.correctFirstTry += 1;
  } else {
    p.streak = 0;
    p.mastered = false;
    if (session.current.requeues < 2) {
      session.queue.splice(Math.min(2, session.queue.length), 0, { word, requeues: session.current.requeues + 1 });
    }
  }
  session.seenIds.add(word.id);
  Store.setProgress(progress);

  main.innerHTML = `
    <div class="card">
      <div class="feedback-banner ${isCorrect ? "good" : "bad"}">${isCorrect ? "🎉 Correct!" : "Not quite &mdash; let's look closely"}</div>
      <p class="sub" style="text-align:center">The word was:</p>
      <div class="big-word">${renderDiff(ops)}</div>
      ${!isCorrect ? `<p class="sub" style="text-align:center">You wrote: <strong>${esc(clean) || "(nothing)"}</strong></p>` : ""}
      <div class="btn-row" style="justify-content:center">
        <button class="speak-btn" id="speak-again" title="Hear it again" style="width:46px;height:46px;font-size:1.2rem;">🔊</button>
      </div>
      <div class="btn-row" style="justify-content:center; margin-top:10px;">
        <button class="btn" id="next-word">Next word</button>
      </div>
    </div>`;

  document.getElementById("speak-again").addEventListener("click", () => Speech.speak(word.word));
  const nextBtn = document.getElementById("next-word");
  nextBtn.addEventListener("click", nextRound);
  nextBtn.focus();
}

function renderSummary() {
  const words = list.words;
  const masteredCount = words.filter((w) => progress[w.id]?.mastered).length;
  const stillLearning = words.filter((w) => !progress[w.id]?.mastered);

  main.innerHTML = `
    <div class="card">
      <h1>Nice work! 🎉</h1>
      <p class="sub">You got ${session.correctFirstTry} of ${session.total} right on the first try this round.</p>
      <div class="stat-grid">
        <div class="stat"><div class="value">${masteredCount}</div><div class="label">Mastered</div></div>
        <div class="stat"><div class="value">${stillLearning.length}</div><div class="label">Still learning</div></div>
      </div>
      <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${(masteredCount / words.length) * 100}%"></div></div>
    </div>
    <div class="card">
      <h2>What next?</h2>
      <div class="btn-row">
        ${stillLearning.length ? `<button class="btn" id="practice-tricky">Practice the ${stillLearning.length} tricky word${stillLearning.length === 1 ? "" : "s"}</button>` : ""}
        <button class="btn secondary" id="practice-all">Practice all words again</button>
        <a class="btn ghost" href="index.html">Back home</a>
      </div>
    </div>`;

  document.getElementById("practice-all").addEventListener("click", () => startSession(session.mode));
  const trickyBtn = document.getElementById("practice-tricky");
  if (trickyBtn) {
    trickyBtn.addEventListener("click", () => startSession(session.mode, stillLearning));
  }
}

document.addEventListener("DOMContentLoaded", init);
