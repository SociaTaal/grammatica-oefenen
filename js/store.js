// store.js — persistent state: settings, XP/levels, streaks, stats, spaced repetition.
// Defines window.Store. No dependencies.
(function () {
  "use strict";

  const KEY = "grammatica.v1";

  const DEFAULTS = {
    settings: {
      theme: "auto",        // 'auto' | 'light' | 'dark'
      sound: true,
      tts: true,
      translation: true,
      confetti: false,
      count: 20,            // questions per round
    },
    xp: 0,
    streak: { count: 0, lastDay: null },
    stats: { answered: 0, correct: 0, rounds: 0, bestBlitz: 0 },
    srs: {},                // id -> { wrong, correct, lastWrong, mastered }
    achievements: [],       // unlocked achievement ids
    lastSeen: null,
  };

  function clone(v) {
    if (Array.isArray(v)) return v.map(clone);
    if (v && typeof v === "object") {
      const o = {};
      for (const k in v) o[k] = clone(v[k]);
      return o;
    }
    return v;
  }

  // Deep-merge `over` onto a deep COPY of `base` (never shares nested refs with base).
  function deepMerge(base, over) {
    const out = clone(base);
    for (const k in over) {
      if (over[k] && typeof over[k] === "object" && !Array.isArray(over[k]) &&
          out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) {
        out[k] = deepMerge(out[k], over[k]);
      } else {
        out[k] = clone(over[k]);
      }
    }
    return out;
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? deepMerge(DEFAULTS, JSON.parse(raw)) : deepMerge(DEFAULTS, {});
  } catch (e) {
    state = deepMerge(DEFAULTS, {});
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  // ---- XP / Levels ----
  // Level n requires more XP each step (gentle curve).
  function levelFromXp(xp) {
    let lvl = 1, need = 100, acc = 0;
    while (xp >= acc + need) { acc += need; lvl++; need = Math.round(need * 1.25); }
    return { level: lvl, into: xp - acc, need, total: xp };
  }

  const Store = {
    get state() { return state; },
    get settings() { return state.settings; },

    setSetting(key, val) {
      state.settings[key] = val;
      save();
    },

    level() { return levelFromXp(state.xp); },

    // Award XP and return level-up info if any.
    addXp(amount) {
      const before = levelFromXp(state.xp).level;
      state.xp += amount;
      const after = levelFromXp(state.xp).level;
      save();
      return { leveledUp: after > before, level: after };
    },

    // Record an answered question. Updates stats + SRS.
    record(id, correct) {
      state.stats.answered++;
      if (correct) state.stats.correct++;
      if (id) {
        const e = state.srs[id] || { wrong: 0, correct: 0, lastWrong: 0, mastered: false };
        if (correct) {
          e.correct++;
          if (e.correct >= 2 && e.correct > e.wrong) e.mastered = true;
        } else {
          e.wrong++;
          e.mastered = false;
          e.lastWrong = Date.now();
        }
        state.srs[id] = e;
      }
      save();
    },

    // Items that need review: wrong-leaning and not mastered. Most-recent-wrong first.
    reviewIds() {
      return Object.keys(state.srs)
        .filter((id) => { const e = state.srs[id]; return !e.mastered && e.wrong > 0; })
        .sort((a, b) => state.srs[b].lastWrong - state.srs[a].lastWrong);
    },

    masteredCount() {
      return Object.values(state.srs).filter((e) => e.mastered).length;
    },

    finishRound(blitzScore) {
      state.stats.rounds++;
      if (typeof blitzScore === "number" && blitzScore > state.stats.bestBlitz) {
        state.stats.bestBlitz = blitzScore;
      }
      // Streak: bump if first round today, reset if a day was missed.
      const t = todayKey();
      if (state.streak.lastDay !== t) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
        state.streak.count = state.streak.lastDay === yKey ? state.streak.count + 1 : 1;
        state.streak.lastDay = t;
      }
      save();
      return state.streak.count;
    },

    unlock(id) {
      if (!state.achievements.includes(id)) {
        state.achievements.push(id);
        save();
        return true;
      }
      return false;
    },
    has(id) { return state.achievements.includes(id); },

    reset() {
      state = deepMerge(DEFAULTS, {});
      save();
    },
  };

  window.Store = Store;
})();
