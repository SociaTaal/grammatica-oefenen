// engine.js — turns the raw data into normalized questions across all types,
// builds a master pool (used by review/random/blitz), and checks answers.
// Defines window.Engine. Depends on window.topicSentences, TOPIC_LABELS, DEHET_WORDS.
(function () {
  "use strict";

  const TOPICS = window.topicSentences || {};
  const LABELS = window.TOPIC_LABELS || {};
  const DEHET = Array.isArray(window.DEHET_WORDS) ? window.DEHET_WORDS : [];

  const VERB_TOPICS = [1, 2, 3, 13];
  const VERB_TENSE_LABELS = {
    present: "Tegenwoordige tijd",
    perfectum: "Perfectum",
    imperfectum: "Imperfectum",
    plusquamperfectum: "Plusquamperfectum",
  };
  const TOPIC_TO_TENSE = { 1: "present", 2: "perfectum", 3: "imperfectum", 13: "plusquamperfectum" };

  const LEVELS = {
    1: [14, 15, 16, 17, 18, 19, 4, 25],
    2: [5, 6, 20],
    3: [7, 8, 21],
    4: [9, 10, 22, 24],
    5: [11, 12, 23],
    6: [],
  };
  // Which course level each verb tense belongs to.
  const VERB_LEVEL = { 1: 1, 2: 2, 3: 3, 13: 5 };
  // Reverse map: grammar topic id -> course level.
  const TOPIC_LEVEL = {};
  Object.keys(LEVELS).forEach((lv) =>
    LEVELS[lv].forEach((id) => { TOPIC_LEVEL[id] = Number(lv); }));

  // Does a tagged item belong to the chosen level scope?
  function matches(lv, level, cumulative) {
    if (lv == null) return false;
    return cumulative ? lv <= level : lv === level;
  }
  // Scope a list to a level. If the level has tagged items, show exactly those.
  // If it has none yet (not authored), fall back to the untagged legacy pool so
  // that level still works until its content is tagged.
  function filt(items, level, cumulative) {
    if (level == null) return items;
    const tagged = items.filter((q) => matches(q.level, level, cumulative));
    if (tagged.length) return tagged;
    return items.filter((q) => q.level == null);
  }

  // ---- text utilities ----
  function sanitize(text) {
    if (!text) return "";
    let s = String(text).normalize("NFD").replace(/\p{Diacritic}/gu, "");
    s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");
    return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?;:,]+$/g, "");
  }
  function variants(answerRaw) {
    return String(answerRaw == null ? "" : answerRaw).split("/").map(sanitize).filter(Boolean);
  }
  function checkText(user, answerRaw) {
    return variants(answerRaw).includes(sanitize(user));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, n); }

  // The "infinitive"/pill text for verb sentences; complete the sentence for TTS.
  function completeSentence(s, answerRaw) {
    const first = String(answerRaw).split("/")[0].trim();
    if (s.indexOf("...") >= 0) return s.replace("...", first);
    // separable-verb topics use a double space gap instead of "..."
    return s.replace(/\s{2,}/, " " + first + " ").trim();
  }

  // ---- build the master pool of linear questions ----
  const pool = [];

  // Verb / grammar fill questions (and word-order for topic 25)
  Object.keys(TOPICS).forEach((tk) => {
    const topic = Number(tk);
    const arr = TOPICS[tk] || [];
    const topicLevel = VERB_TOPICS.includes(topic)
      ? VERB_LEVEL[topic]
      : (TOPIC_LEVEL[topic] != null ? TOPIC_LEVEL[topic] : null);
    arr.forEach((q, i) => {
      if (!q || !q.answer) return;
      const tense = q.tense || TOPIC_TO_TENSE[topic] || null;
      if (topic === 25) {
        const tokens = String(q.sentence).split("/").map((t) => t.trim()).filter(Boolean);
        if (tokens.length < 2) return;
        pool.push({
          id: `order:${topic}:${i}`, type: "order", topic, level: topicLevel,
          tokens, answer: q.answer, translation: q.translation || "",
          infinitive: "zinsbouw", tense: null,
          speak: variants(q.answer)[0] ? String(q.answer).split("/")[0].trim() : "",
        });
      } else {
        pool.push({
          id: `fill:${topic}:${i}`, type: "fill", topic, level: topicLevel,
          prompt: q.sentence || "", answer: q.answer,
          translation: q.translation || "",
          infinitive: q.infinitive || (LABELS[topic] || ""),
          tense: VERB_TOPICS.includes(topic) ? tense : null,
          tenseLabel: tense && VERB_TENSE_LABELS[tense] ? VERB_TENSE_LABELS[tense] : null,
          speak: completeSentence(q.sentence || "", q.answer),
        });
        // Dictation variant for verb sentences (listening mode).
        if (VERB_TOPICS.includes(topic)) {
          const full = completeSentence(q.sentence || "", q.answer);
          pool.push({
            id: `listen:${topic}:${i}`, type: "listen", topic, level: topicLevel,
            prompt: "Typ de zin die je hoort.", answer: full,
            translation: q.translation || "", infinitive: "luisteren",
            tense: null, speak: full, isSentence: true,
          });
        }
      }
    });
  });

  // De/Het article questions + vocabulary choice + word listening
  DEHET.forEach((w, i) => {
    if (!w || !w.word || !w.article) return;
    pool.push({
      id: `article:0:${i}`, type: "article", topic: "dehet", level: w.level == null ? null : Number(w.level),
      word: w.word, article: w.article, translation: w.translation || "",
      infinitive: "de / het", tense: null, speak: `${w.article} ${w.word}`,
    });
  });

  function buildVocab() {
    const out = [];
    DEHET.forEach((w, i) => {
      if (!w || !w.word || !w.translation) return;
      const lv = w.level == null ? null : Number(w.level);
      // Typed vocab: show the English meaning, type the Dutch word.
      // Accept the word on its own or with its article (e.g. "boom" or "de boom").
      const answer = `${w.word} / ${w.article} ${w.word}`;
      out.push({
        id: `vocab:${i}`, type: "vocab", topic: "vocab", level: lv,
        prompt: `Schrijf het Nederlandse woord voor “${w.translation}”.`,
        answer, infinitive: "woordenschat", tense: null,
        translation: "", speak: w.word,
      });
      // listening: speak word, type it
      out.push({
        id: `listen:vocab:${i}`, type: "listen", topic: "vocab", level: lv,
        prompt: "Typ het woord dat je hoort.", answer: w.word,
        translation: w.translation || "", infinitive: "luisteren",
        tense: null, speak: w.word, isSentence: false,
      });
    });
    return out;
  }
  // Vocab/listen questions are generated fresh (choices re-shuffled) but with stable ids.
  const vocabPool = buildVocab();
  vocabPool.forEach((q) => pool.push(q));

  const byId = {};
  pool.forEach((q) => { byId[q.id] = q; });

  // ---- public selectors ----
  function verbQuestions(tenseTopics) {
    const set = new Set(tenseTopics.map(Number));
    return pool.filter((q) => q.type === "fill" && set.has(Number(q.topic)));
  }
  function topicQuestions(topic) {
    const t = Number(topic);
    if (t === 25) return pool.filter((q) => q.type === "order");
    return pool.filter((q) => q.type === "fill" && Number(q.topic) === t);
  }
  function articleQuestions(level, cum) { return filt(pool.filter((q) => q.type === "article"), level, cum); }
  function vocabQuestions(level, cum) { return filt(pool.filter((q) => q.type === "vocab"), level, cum); }
  function listenQuestions(level, cum) { return filt(pool.filter((q) => q.type === "listen"), level, cum); }
  function orderQuestions(level, cum) { return filt(pool.filter((q) => q.type === "order"), level, cum); }
  function allQuestions(level, cum) { return filt(pool.slice(), level, cum); }

  function reviewQuestions(ids) {
    return ids.map((id) => byId[id]).filter(Boolean);
  }

  // Grammar topics that belong to a course level (for the "Per niveau" list).
  function topicsForLevel(level) { return (LEVELS[level] || []).slice(); }

  // Verb tenses available at a level (ids into topicSentences). Falls back to all.
  function verbTensesForLevel(level, cum) {
    if (level == null) return VERB_TOPICS.slice();
    const ids = VERB_TOPICS.filter((id) => matches(VERB_LEVEL[id], level, cum));
    return ids.length ? ids : VERB_TOPICS.slice();
  }

  // Build a matching board: n pairs of NL <-> EN, scoped to the level.
  function matchBoard(n, level, cum) {
    let words = DEHET.filter((w) => w.word && w.translation);
    if (level != null) {
      const lvOf = (w) => (w.level == null ? null : Number(w.level));
      const tagged = words.filter((w) => matches(lvOf(w), level, cum));
      words = tagged.length ? tagged : words.filter((w) => w.level == null);
    }
    return sample(words, n).map((w, i) => ({ key: i, nl: w.word, en: w.translation, article: w.article }));
  }

  const Engine = {
    LABELS, LEVELS, VERB_TOPICS, VERB_LEVEL, VERB_TENSE_LABELS, TOPIC_TO_TENSE,
    sanitize, checkText, variants, shuffle, sample,
    verbQuestions, topicQuestions, articleQuestions, vocabQuestions,
    listenQuestions, orderQuestions, allQuestions, reviewQuestions, matchBoard,
    topicsForLevel, verbTensesForLevel,
    questionById: (id) => byId[id],
    stats: { total: pool.length },
  };

  window.Engine = Engine;
})();
