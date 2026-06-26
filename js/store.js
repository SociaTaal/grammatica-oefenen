// store.js — persists only what we genuinely keep across sessions:
// user settings, and the spaced-repetition data behind "Herhalen".
// No XP, levels, streaks, or long-term stats. Defines window.Store.
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
      level: null,          // current course level (1–6); null = not chosen yet
      levelCumulative: false, // also include content from lower levels
    },
    srs: {},                // id -> { wrong, correct, lastWrong, mastered }
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

  // Deep-merge `over` onto a deep COPY of `base` (never shares nested refs).
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
    state = deepMerge(DEFAULTS, raw ? JSON.parse(raw) : {});
  } catch (e) {
    state = deepMerge(DEFAULTS, {});
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  const Store = {
    get state() { return state; },
    get settings() { return state.settings; },

    setSetting(key, val) { state.settings[key] = val; save(); },

    // Record an answered question into the spaced-repetition data.
    record(id, correct) {
      if (!id) return;
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
      save();
    },

    // Ids that still need review: wrong-leaning, not mastered, most recent first.
    reviewIds() {
      return Object.keys(state.srs)
        .filter((id) => { const e = state.srs[id]; return !e.mastered && e.wrong > 0; })
        .sort((a, b) => state.srs[b].lastWrong - state.srs[a].lastWrong);
    },

    reset() { state = deepMerge(DEFAULTS, {}); save(); },
  };

  window.Store = Store;
})();
