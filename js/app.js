// app.js — SPA controller: navigation, the linear quiz loop (fill / article /
// choice / order / listen), the matching game, results, stats, settings.
// Depends on Store, FX, Engine.
(function () {
  "use strict";

  const screen = document.getElementById("screen");
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- toast ----------
  function toast(msg, emoji) {
    const t = el("div", "toast", `<span>${emoji || "✨"}</span> ${esc(msg)}`);
    $("toasts").appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 2600);
  }

  // ---------- speech ----------
  let warnedNoVoice = false;
  function sayDutch(text) {
    const res = FX.speak(text);
    if (!res || warnedNoVoice) return;
    if (res.reason === "unsupported") {
      warnedNoVoice = true;
      toast("Je browser ondersteunt geen spraak.", "🔇");
    } else if (res.ok && res.dutch === false && FX.voicesLoaded()) {
      warnedNoVoice = true;
      toast("Geen Nederlandse stem op dit apparaat — ik gebruik de standaardstem.", "🗣️");
    }
  }

  // ---------- theme ----------
  function applyTheme() {
    const mode = Store.settings.theme;
    const dark = mode === "dark" ||
      (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }

  // ======================================================================
  // SCREENS
  // ======================================================================
  function clear() { screen.innerHTML = ""; }

  const MODES = [
    { key: "verbs", emoji: "🧩", title: "Werkwoorden", sub: "Vervoeg in 4 tijden" },
    { key: "dehet", emoji: "⚖️", title: "De / Het", sub: "Lidwoorden trainen" },
    { key: "vocab", emoji: "🔤", title: "Woordenschat", sub: "Typ het Nederlandse woord" },
    { key: "listen", emoji: "🎧", title: "Luisteren", sub: "Typ wat je hoort" },
    { key: "order", emoji: "🔀", title: "Zinsbouw", sub: "Zet de zin op volgorde" },
    { key: "match", emoji: "🧠", title: "Memory", sub: "Koppel woordparen" },
    { key: "levels", emoji: "📈", title: "Per niveau", sub: "Cursus level 1–5" },
    { key: "review", emoji: "♻️", title: "Herhalen", sub: "Jouw fouten opnieuw" },
    { key: "random", emoji: "🎲", title: "Verrassing", sub: "Alles door elkaar" },
    { key: "blitz", emoji: "⚡", title: "Blitz", sub: "60 sec, zo veel mogelijk" },
  ];

  const render = {};

  render.menu = function () {
    clear();
    const hero = el("section", "hero");
    const due = Store.reviewIds().length;
    hero.innerHTML = `
      <h1>Oefening baart kunst 👌🏼</h1>
      <p class="muted">${due
        ? `Je hebt <b>${due}</b> ${due === 1 ? "woord" : "woorden"} om te herhalen.`
        : "Kies een oefening om te beginnen."}</p>`;
    screen.appendChild(hero);

    const grid = el("section", "grid");
    MODES.forEach((m) => {
      const card = el("button", "card", `
        <span class="card-emoji">${m.emoji}</span>
        <span class="card-title">${m.title}</span>
        <span class="card-sub">${m.sub}</span>`);
      if (m.key === "review") {
        const n = Store.reviewIds().length;
        const badge = el("span", "card-badge", String(n));
        if (n === 0) { card.classList.add("disabled"); }
        card.appendChild(badge);
      }
      card.addEventListener("click", () => onMode(m.key));
      grid.appendChild(card);
    });
    screen.appendChild(grid);
  };

  function onMode(key) {
    const count = Store.settings.count;
    switch (key) {
      case "verbs": return render.tense();
      case "levels": return render.levels();
      case "match": return render.match();
      case "dehet":
        return startRound(Engine.sample(Engine.articleQuestions(), count), { title: "De / Het" });
      case "vocab":
        return startRound(Engine.sample(Engine.vocabQuestions(), count), { title: "Woordenschat" });
      case "listen":
        return startRound(Engine.sample(Engine.listenQuestions(), count), { title: "Luisteren" });
      case "order":
        return startRound(Engine.sample(Engine.orderQuestions(), count), { title: "Zinsbouw" });
      case "random":
        return startRound(Engine.sample(Engine.allQuestions(), count), { title: "Verrassingsronde" });
      case "review": {
        const qs = Engine.reviewQuestions(Store.reviewIds()).slice(0, count);
        if (!qs.length) return toast("Geen fouten om te herhalen — goed bezig!", "🌟");
        return startRound(qs, { title: "Herhalen", hearts: 5 });
      }
      case "blitz":
        return startRound(Engine.sample(Engine.allQuestions(), 200),
          { title: "Blitz", blitz: true, seconds: 60 });
    }
  }

  render.tense = function () {
    clear();
    screen.appendChild(backBar("Werkwoorden"));
    const opts = [
      { id: 1, label: "Tegenwoordige tijd", lvl: "Level 1" },
      { id: 2, label: "Perfectum", lvl: "Level 2" },
      { id: 3, label: "Imperfectum", lvl: "Level 3" },
      { id: 13, label: "Plusquamperfectum", lvl: "Level 5" },
    ];
    const box = el("section", "panel");
    box.innerHTML = `<h2>Kies de tijden</h2>`;
    const list = el("div", "checklist");
    opts.forEach((o, i) => {
      const row = el("label", "check-row", `
        <input type="checkbox" value="${o.id}" ${i === 0 ? "checked" : ""}>
        <span>${o.label}</span><em>${o.lvl}</em>`);
      list.appendChild(row);
    });
    box.appendChild(list);
    const start = el("button", "btn primary", "Begin met oefenen");
    start.addEventListener("click", () => {
      const ids = [...list.querySelectorAll("input:checked")].map((c) => Number(c.value));
      if (!ids.length) return toast("Kies minstens één tijd", "👆");
      const qs = Engine.sample(Engine.verbQuestions(ids), Store.settings.count);
      startRound(qs, { title: "Werkwoorden" });
    });
    box.appendChild(start);
    screen.appendChild(box);
  };

  render.levels = function () {
    clear();
    screen.appendChild(backBar("Per niveau"));
    const grid = el("section", "grid small");
    Object.keys(Engine.LEVELS).forEach((lv) => {
      const c = el("button", "card", `
        <span class="card-emoji">📘</span>
        <span class="card-title">Level ${lv}</span>
        <span class="card-sub">${Engine.LEVELS[lv].length} onderdelen</span>`);
      c.addEventListener("click", () => render.topics(lv));
      grid.appendChild(c);
    });
    screen.appendChild(grid);
  };

  render.topics = function (lv) {
    clear();
    screen.appendChild(backBar(`Level ${lv}`, render.levels));
    const grid = el("section", "grid small");
    (Engine.LEVELS[lv] || []).forEach((id) => {
      const c = el("button", "card", `
        <span class="card-title">${esc(Engine.LABELS[id] || "Onderdeel " + id)}</span>`);
      c.addEventListener("click", () => {
        const qs = Engine.sample(Engine.topicQuestions(id), Store.settings.count);
        if (!qs.length) return toast("Nog geen vragen hier", "🤷");
        startRound(qs, { title: Engine.LABELS[id] || "Oefening" });
      });
      grid.appendChild(c);
    });
    screen.appendChild(grid);
  };

  function backBar(title, target) {
    const bar = el("div", "backbar");
    const b = el("button", "icon-btn", "←");
    b.addEventListener("click", () => (target ? target() : render.menu()));
    bar.appendChild(b);
    bar.appendChild(el("h2", null, esc(title)));
    return bar;
  }

  // ======================================================================
  // LINEAR QUIZ
  // ======================================================================
  let round = null;

  function startRound(questions, opts) {
    opts = opts || {};
    round = {
      questions, idx: 0,
      hearts: opts.blitz ? Infinity : (opts.hearts || 3),
      maxHearts: opts.blitz ? 0 : (opts.hearts || 3),
      mistakes: [], mistakeQs: [], correct: 0, answered: 0,
      combo: 0, bestCombo: 0,
      title: opts.title || "Oefenen",
      blitz: !!opts.blitz, seconds: opts.seconds || 0,
      hintUsed: false, lifeLost: false,
      timeLeft: opts.seconds || 0, timer: null, startTime: Date.now(),
    };
    if (!questions.length) { toast("Geen vragen gevonden", "🤷"); return render.menu(); }
    renderQuizShell();
    if (round.blitz) startBlitzTimer();
    renderQuestion();
  }

  function renderQuizShell() {
    clear();
    const wrap = el("section", "quiz");
    wrap.innerHTML = `
      <div class="quiz-top">
        <button class="icon-btn" id="quiz-back" title="Stoppen">←</button>
        <div class="progress"><span id="prog-fill"></span></div>
        <div class="hearts" id="hearts"></div>
      </div>
      <div class="quiz-live" id="quiz-live"></div>
      <div class="qcard" id="qcard"></div>`;
    screen.appendChild(wrap);
    $("quiz-back").addEventListener("click", () => {
      if (round && round.timer) clearInterval(round.timer);
      round = null; render.menu();
    });
    updateHearts();
    updateLive();
  }

  // Live in-round stats: score so far + current combo (consecutive correct).
  function updateLive() {
    const n = $("quiz-live");
    if (!n) return;
    const combo = round.combo >= 2
      ? `<span class="live-combo">🔥 ${round.combo} op rij</span>` : "";
    n.innerHTML = `<span class="live-score">✓ ${round.correct} / ${round.answered}</span>${combo}`;
  }

  function updateHearts() {
    const h = $("hearts");
    if (!h) return;
    if (round.blitz) { h.innerHTML = `<span class="timer" id="timer">${round.timeLeft}s</span>`; return; }
    h.innerHTML = "❤️".repeat(Math.max(0, round.hearts)) +
      `<span class="heart-empty">${"🤍".repeat(Math.max(0, round.maxHearts - round.hearts))}</span>`;
  }

  function updateProgress() {
    const f = $("prog-fill");
    if (!f) return;
    if (round.blitz) { f.style.width = round.answered ? Math.min(100, round.answered * 4) + "%" : "4%"; return; }
    f.style.width = (round.idx / round.questions.length) * 100 + "%";
  }

  function startBlitzTimer() {
    round.timeLeft = round.seconds;
    round.timer = setInterval(() => {
      round.timeLeft--;
      updateHearts();
      if (round.timeLeft <= 5 && round.timeLeft > 0) FX.tick();
      if (round.timeLeft <= 0) { clearInterval(round.timer); endRound(); }
    }, 1000);
  }

  function currentQ() { return round.questions[round.idx]; }

  function renderQuestion() {
    if (!round) return;
    if (!round.blitz && round.idx >= round.questions.length) return endRound();
    if (round.blitz && round.idx >= round.questions.length) {
      round.questions = round.questions.concat(Engine.sample(Engine.allQuestions(), 100));
    }
    round.hintUsed = false; round.lifeLost = false;
    round.finalized = false; round.dirty = false;
    updateProgress();
    const q = currentQ();
    const card = $("qcard");
    card.className = "qcard";
    const renderer = QTYPE[q.type] || QTYPE.fill;
    renderer(q, card);
  }

  // pill + speak header shared by several types
  function headerBits(q) {
    const pills = [];
    if (q.infinitive) pills.push(`<span class="pill">${esc(q.infinitive)}</span>`);
    if (q.tenseLabel) pills.push(`<span class="pill tense">${esc(q.tenseLabel)}</span>`);
    const speak = q.speak && FX.canSpeak()
      ? `<button class="icon-btn speak" id="speak-btn" title="Uitspraak">🔊</button>` : "";
    return `<div class="qhead"><div class="pills">${pills.join("")}</div>${speak}</div>`;
  }
  function wireSpeak(q) {
    const b = $("speak-btn");
    if (b) b.addEventListener("click", () => sayDutch(q.speak));
  }
  function transRow(q) {
    if (!Store.settings.translation || !q.translation) return "";
    return `<div class="trans"><span>🇬🇧</span> ${esc(q.translation)}</div>`;
  }

  const QTYPE = {};

  // ---- FILL ----
  QTYPE.fill = function (q, card) {
    card.innerHTML = `
      ${headerBits(q)}
      <div class="sentence">${esc(q.prompt)}</div>
      ${transRow(q)}
      <input type="text" id="answer" autocomplete="off" autocapitalize="off"
        spellcheck="false" placeholder="Typ je antwoord…">
      <div class="feedback hidden" id="feedback"></div>
      <div class="qactions">
        <button class="btn primary" id="check-btn">Controleren</button>
        <button class="btn ghost" id="hint-btn" disabled>?</button>
      </div>`;
    wireSpeak(q);
    const input = $("answer");
    input.focus();
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") $("check-btn").click(); });
    $("check-btn").addEventListener("click", () => textCheck(q, input.value));
    $("hint-btn").addEventListener("click", () => hintFlow(q));
  };
  QTYPE.listen = function (q, card) {
    card.innerHTML = `
      ${headerBits(q)}
      <div class="listen-cta">
        <button class="big-speak" id="big-speak">🔊</button>
        <p class="muted">${esc(q.prompt)}</p>
      </div>
      ${transRow(q)}
      <input type="text" id="answer" autocomplete="off" autocapitalize="off"
        spellcheck="false" placeholder="Typ wat je hoort…">
      <div class="feedback hidden" id="feedback"></div>
      <div class="qactions">
        <button class="btn primary" id="check-btn">Controleren</button>
        <button class="btn ghost" id="hint-btn" disabled>?</button>
      </div>`;
    $("big-speak").addEventListener("click", () => sayDutch(q.speak));
    setTimeout(() => sayDutch(q.speak), 350);
    const input = $("answer");
    input.focus();
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") $("check-btn").click(); });
    $("check-btn").addEventListener("click", () => textCheck(q, input.value));
    $("hint-btn").addEventListener("click", () => hintFlow(q));
  };

  function textCheck(q, value) {
    if (round.finalized || !Engine.sanitize(value)) return;
    if (Engine.checkText(value, q.answer)) {
      finalize(q, true, !round.dirty);
      const fb = $("feedback");
      if (fb) { fb.className = "feedback good"; fb.textContent = "Goed zo! 🎉"; }
      document.querySelector(".qcard")?.classList.add("pop");
      setTimeout(advance, 650);
    } else {
      const fb = $("feedback");
      fb.className = "feedback bad";
      fb.textContent = "Nog niet juist — probeer opnieuw of vraag een hint.";
      document.querySelector(".qcard").classList.add("shake");
      setTimeout(() => document.querySelector(".qcard")?.classList.remove("shake"), 400);
      hitWrong(q);
      const hb = $("hint-btn"); if (hb) hb.disabled = false;
      FX.wrong();
    }
  }

  function hintFlow(q) {
    const fb = $("feedback");
    fb.className = "feedback reveal";
    fb.innerHTML = `Juiste antwoord: <b>${esc(String(q.answer).split("/")[0].trim())}</b>`;
    round.hintUsed = true; round.dirty = true;
    hitWrong(q);                 // costs a heart if not already lost
    finalize(q, false);
    const actions = document.querySelector(".qactions");
    if (actions) actions.innerHTML = `<button class="btn next" id="next-btn">Volgende →</button>`;
    const nb = $("next-btn");
    if (nb) nb.addEventListener("click", advance);
  }

  // ---- ARTICLE (de/het) ----
  QTYPE.article = function (q, card) {
    card.innerHTML = `
      ${headerBits(q)}
      <div class="big-word">${esc(q.word)}</div>
      ${transRow(q)}
      <div class="choice-row two">
        <button class="choice big" data-v="de">de</button>
        <button class="choice big" data-v="het">het</button>
      </div>
      <div class="feedback hidden" id="feedback"></div>`;
    wireSpeak(q);
    card.querySelectorAll(".choice").forEach((b) =>
      b.addEventListener("click", () => choiceCheck(q, b.dataset.v, q.article, card)));
  };

  // ---- CHOICE (vocab MC) ----
  QTYPE.choice = function (q, card) {
    card.innerHTML = `
      ${headerBits(q)}
      <div class="question">${esc(q.question)}</div>
      ${transRow(q)}
      <div class="choice-grid" id="choices"></div>
      <div class="feedback hidden" id="feedback"></div>`;
    wireSpeak(q);
    const grid = $("choices");
    q.choices.forEach((c) => {
      const b = el("button", "choice", esc(c));
      b.addEventListener("click", () => choiceCheck(q, c, q.correct, card));
      grid.appendChild(b);
    });
  };

  function choiceCheck(q, chosen, correct, card) {
    if (round.finalized) return;
    card.querySelectorAll(".choice").forEach((b) => {
      b.disabled = true;
      if (b.dataset.v ? b.dataset.v === correct : b.textContent === correct) b.classList.add("ok");
      else if ((b.dataset.v ? b.dataset.v === chosen : b.textContent === chosen)) b.classList.add("no");
    });
    if (chosen === correct) {
      finalize(q, true, true);
      document.querySelector(".qcard")?.classList.add("pop");
      setTimeout(advance, 750);
    } else {
      hitWrong(q);              // single attempt → also finalizes
      finalize(q, false);
      FX.wrong();
      if (round.hearts <= 0 && !round.blitz) return setTimeout(endRound, 850);
      setTimeout(advance, 950);
    }
  }

  // Unified per-question completion. Records SRS + session combo exactly once.
  function finalize(q, correct, clean) {
    if (round.finalized) return;
    round.finalized = true;
    round.answered++;
    if (correct) {
      round.correct++;
      round.combo++;
      if (round.combo > round.bestCombo) round.bestCombo = round.combo;
      Store.record(q.id, !!clean);
      FX.correct(); FX.confetti();
    } else {
      round.combo = 0;
      Store.record(q.id, false);
      pushMistake(q);
    }
    updateLive();
  }

  // A wrong attempt: break the combo and deduct one heart (retries don't stack).
  function hitWrong(q) {
    round.dirty = true;
    round.combo = 0;
    pushMistake(q);
    updateLive();
    if (!round.lifeLost) {
      round.lifeLost = true;
      if (!round.blitz) { round.hearts = Math.max(0, round.hearts - 1); updateHearts(); }
    }
  }

  function pushMistake(q) {
    if (round._mistakeIds && round._mistakeIds.has(q.id)) return;
    round._mistakeIds = round._mistakeIds || new Set();
    round._mistakeIds.add(q.id);
    round.mistakeQs.push(q);
    round.mistakes.push({
      q: q.prompt || q.word || q.question || (q.tokens ? q.tokens.join(" ") : "") || "",
      answer: q.answer || q.correct || q.article || "",
    });
  }

  function advance() {
    if (!round) return;
    if (round.hearts <= 0 && !round.blitz) return endRound();
    round.idx++;
    renderQuestion();
  }

  // ---- ORDER (sentence builder) ----
  QTYPE.order = function (q, card) {
    const tokens = Engine.shuffle(q.tokens);
    const built = [];
    card.innerHTML = `
      ${headerBits(q)}
      <p class="muted small">Zet de woorden in de juiste volgorde:</p>
      ${transRow(q)}
      <div class="builder" id="built"></div>
      <div class="bank" id="bank"></div>
      <div class="feedback hidden" id="feedback"></div>
      <div class="qactions">
        <button class="btn ghost" id="undo-btn">↶ Wis</button>
        <button class="btn primary" id="check-btn">Controleren</button>
      </div>`;
    wireSpeak(q);
    const bankEl = $("bank"), builtEl = $("built");
    function draw() {
      bankEl.innerHTML = ""; builtEl.innerHTML = "";
      tokens.forEach((tok, i) => {
        if (built.includes(i)) return;
        const b = el("button", "token", esc(tok));
        b.addEventListener("click", () => { built.push(i); draw(); });
        bankEl.appendChild(b);
      });
      built.forEach((idx, pos) => {
        const b = el("button", "token placed", esc(tokens[idx]));
        b.addEventListener("click", () => { built.splice(pos, 1); draw(); });
        builtEl.appendChild(b);
      });
    }
    draw();
    $("undo-btn").addEventListener("click", () => { built.length = 0; draw(); });
    $("check-btn").addEventListener("click", () => {
      if (!built.length || round.finalized) return;
      const sentence = built.map((i) => tokens[i]).join(" ");
      if (Engine.checkText(sentence, q.answer)) {
        finalize(q, true, !round.dirty);
        card.classList.add("pop");
        setTimeout(advance, 700);
      } else {
        const fb = $("feedback");
        fb.className = "feedback bad";
        fb.textContent = "Niet helemaal — probeer een andere volgorde.";
        card.classList.add("shake");
        setTimeout(() => card.classList.remove("shake"), 400);
        hitWrong(q);
        FX.wrong();
        // offer reveal after a miss
        const actions = document.querySelector(".qactions");
        if (!document.getElementById("hint2")) {
          const h = el("button", "btn ghost", "Toon antwoord");
          h.id = "hint2";
          h.addEventListener("click", () => hintFlow(q));
          actions.appendChild(h);
        }
      }
    });
  };

  // ======================================================================
  // RESULT
  // ======================================================================
  function endRound() {
    if (!round) return;
    if (round.timer) clearInterval(round.timer);
    const r = round;
    const perfect = r.mistakes.length === 0 && r.answered > 0;
    const acc = r.answered ? Math.round((r.correct / r.answered) * 100) : 0;
    const secs = Math.max(1, Math.round((Date.now() - r.startTime) / 1000));
    const avg = r.answered ? (secs / r.answered).toFixed(1) : "0";
    const missedQs = r.mistakeQs.slice();

    clear();
    const sec = el("section", "result");
    sec.innerHTML = `
      <div class="result-emoji">${perfect ? "💎" : acc >= 70 ? "🎉" : "💪"}</div>
      <h1>${r.blitz ? "Tijd voorbij!" : perfect ? "Foutloos!" : "Goed gedaan!"}</h1>
      <div class="result-stats">
        <div><b>${r.correct}/${r.answered}</b><span>goed</span></div>
        <div><b>${acc}%</b><span>accuraat</span></div>
        <div><b>${r.bestCombo}🔥</b><span>beste reeks</span></div>
        <div><b>${formatTime(secs)}</b><span>${avg}s per vraag</span></div>
      </div>`;
    if (r.mistakes.length) {
      const m = el("div", "mistakes");
      m.innerHTML = `<h3>Even nakijken</h3>`;
      r.mistakes.forEach((mi) => {
        m.appendChild(el("div", "mistake", `
          <span class="mq">${esc(mi.q)}</span>
          <span class="ma">✓ ${esc(String(mi.answer).split("/")[0].trim())}</span>`));
      });
      sec.appendChild(m);
    }
    const actions = el("div", "result-actions");
    if (missedQs.length) {
      const replay = el("button", "btn primary", `Herhaal je fouten (${missedQs.length})`);
      replay.addEventListener("click", () =>
        startRound(Engine.shuffle(missedQs), { title: "Herhalen", hearts: 5 }));
      actions.appendChild(replay);
    } else {
      const again = el("button", "btn primary", "Nog een ronde");
      again.addEventListener("click", () => render.menu());
      actions.appendChild(again);
    }
    const home = el("button", "btn ghost", "Menu");
    home.addEventListener("click", () => render.menu());
    actions.appendChild(home);
    sec.appendChild(actions);
    screen.appendChild(sec);
    round = null;
  }

  function formatTime(s) {
    if (s < 60) return s + "s";
    return Math.floor(s / 60) + "m " + (s % 60) + "s";
  }

  // ======================================================================
  // MATCH (memory)
  // ======================================================================
  render.match = function () {
    clear();
    const board = Engine.matchBoard(6);
    const nlCol = Engine.shuffle(board);
    const enCol = Engine.shuffle(board);
    let selNl = null, selEn = null, solved = 0, mistakes = 0, start = Date.now();

    const wrap = el("section", "quiz");
    wrap.innerHTML = `
      <div class="quiz-top">
        <button class="icon-btn" id="quiz-back">←</button>
        <h2 style="margin:0">Memory</h2>
        <span class="muted small" id="match-info">0 / ${board.length}</span>
      </div>
      <p class="muted small center">Tik een Nederlands woord en de juiste vertaling.</p>
      <div class="match">
        <div class="match-col" id="col-nl"></div>
        <div class="match-col" id="col-en"></div>
      </div>`;
    screen.appendChild(wrap);
    $("quiz-back").addEventListener("click", () => render.menu());

    function tile(text, side, key) {
      const b = el("button", "match-tile", esc(text));
      b.dataset.key = key; b.dataset.side = side;
      b.addEventListener("click", () => pick(b, side, key));
      return b;
    }
    nlCol.forEach((p) => $("col-nl").appendChild(tile(p.nl, "nl", p.key)));
    enCol.forEach((p) => $("col-en").appendChild(tile(p.en, "en", p.key)));

    function pick(b, side, key) {
      if (b.classList.contains("done")) return;
      if (side === "nl") { clearSel("nl"); selNl = b.classList.contains("sel") ? null : key; }
      else { clearSel("en"); selEn = b.classList.contains("sel") ? null : key; }
      b.classList.toggle("sel");
      if (selNl != null && selEn != null) resolve();
    }
    function clearSel(side) {
      document.querySelectorAll(`.match-tile[data-side="${side}"].sel`).forEach((x) => x.classList.remove("sel"));
    }
    function resolve() {
      const nl = document.querySelector(`.match-tile[data-side="nl"][data-key="${selNl}"]`);
      const en = document.querySelector(`.match-tile[data-side="en"][data-key="${selEn}"]`);
      if (selNl === selEn) {
        [nl, en].forEach((x) => { x.classList.add("done"); x.classList.remove("sel"); });
        solved++; FX.correct(); FX.confetti();
        $("match-info").textContent = `${solved} / ${board.length}`;
        if (solved === board.length) finishMatch();
      } else {
        mistakes++;
        [nl, en].forEach((x) => x.classList.add("wrong"));
        FX.wrong();
        setTimeout(() => [nl, en].forEach((x) => x && x.classList.remove("wrong", "sel")), 500);
      }
      selNl = selEn = null;
    }
    function finishMatch() {
      const secs = Math.round((Date.now() - start) / 1000);
      setTimeout(() => {
        clear();
        const sec = el("section", "result");
        sec.innerHTML = `
          <div class="result-emoji">${mistakes === 0 ? "💎" : "🧠"}</div>
          <h1>Alle paren gevonden!</h1>
          <div class="result-stats">
            <div><b>${board.length}</b><span>paren</span></div>
            <div><b>${formatTime(secs)}</b><span>tijd</span></div>
            <div><b>${mistakes}</b><span>fouten</span></div>
          </div>`;
        const a = el("div", "result-actions");
        const again = el("button", "btn primary", "Nog een keer");
        again.addEventListener("click", render.match);
        const home = el("button", "btn ghost", "Menu");
        home.addEventListener("click", render.menu);
        a.appendChild(again); a.appendChild(home);
        sec.appendChild(a); screen.appendChild(sec);
      }, 650);
    }
  };

  // ======================================================================
  // SETTINGS DRAWER
  // ======================================================================
  function buildSettings() {
    const s = Store.settings;
    const body = $("settings-body");
    const toggle = (key, label) => `
      <label class="toggle-row">
        <span>${label}</span>
        <span class="switch"><input type="checkbox" data-set="${key}" ${s[key] ? "checked" : ""}>
        <span class="slider"></span></span>
      </label>`;
    body.innerHTML = `
      <div class="seg" id="theme-seg">
        <span>Thema</span>
        <div class="seg-btns">
          ${["auto", "light", "dark"].map((t) =>
            `<button data-theme="${t}" class="${s.theme === t ? "on" : ""}">${
              { auto: "Auto", light: "Licht", dark: "Donker" }[t]}</button>`).join("")}
        </div>
      </div>
      ${toggle("sound", "Geluidseffecten")}
      ${toggle("tts", "Uitspraak (stem)")}
      ${toggle("translation", "Vertaling tonen")}
      ${toggle("confetti", "Confetti")}
      <div class="range-row">
        <span>Vragen per ronde</span>
        <input type="range" min="5" max="50" step="5" value="${s.count}" data-set="count">
        <b id="count-val">${s.count}</b>
      </div>`;
    body.querySelectorAll("input[type=checkbox][data-set]").forEach((c) =>
      c.addEventListener("change", () => Store.setSetting(c.dataset.set, c.checked)));
    const range = body.querySelector("input[type=range]");
    range.addEventListener("input", () => {
      $("count-val").textContent = range.value;
      Store.setSetting("count", Number(range.value));
    });
    body.querySelectorAll("[data-theme]").forEach((b) =>
      b.addEventListener("click", () => {
        Store.setSetting("theme", b.dataset.theme);
        applyTheme(); buildSettings();
      }));
  }
  function openDrawer() {
    buildSettings();
    $("drawer").classList.remove("hidden");
    $("drawer-backdrop").classList.remove("hidden");
  }
  function closeDrawer() {
    $("drawer").classList.add("hidden");
    $("drawer-backdrop").classList.add("hidden");
  }

  // ======================================================================
  // INIT
  // ======================================================================
  function init() {
    applyTheme();
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

    $("brand").addEventListener("click", () => { if (round && round.timer) clearInterval(round.timer); round = null; render.menu(); });
    $("settings-btn").addEventListener("click", openDrawer);
    $("drawer-close").addEventListener("click", closeDrawer);
    $("drawer-backdrop").addEventListener("click", closeDrawer);
    $("theme-btn").addEventListener("click", () => {
      const order = ["auto", "light", "dark"];
      const next = order[(order.indexOf(Store.settings.theme) + 1) % 3];
      Store.setSetting("theme", next); applyTheme();
      toast("Thema: " + { auto: "automatisch", light: "licht", dark: "donker" }[next], "🌗");
    });
    $("reset-btn").addEventListener("click", () => {
      if (confirm("Weet je het zeker? Alle voortgang wordt gewist.")) {
        Store.reset(); closeDrawer(); render.menu();
        toast("Voortgang gewist", "🧹");
      }
    });

    render.menu();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
