// fx.js — generated sound effects (Web Audio), Dutch text-to-speech, and confetti.
// Defines window.FX. Depends on window.Store for the sound/tts toggles.
(function () {
  "use strict";

  let actx = null;
  function ctx() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { actx = null; }
    }
    return actx;
  }

  function tone(freq, start, dur, type, gain) {
    const ac = ctx(); if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    const t = ac.currentTime + start;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function enabled() { return window.Store ? Store.settings.sound : true; }

  const FX = {
    correct() {
      if (!enabled()) return;
      tone(660, 0, 0.12, "sine", 0.15);
      tone(990, 0.09, 0.16, "sine", 0.15);
    },
    wrong() {
      if (!enabled()) return;
      tone(180, 0, 0.22, "sawtooth", 0.12);
      tone(120, 0.06, 0.26, "sawtooth", 0.12);
    },
    levelUp() {
      if (!enabled()) return;
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.16));
    },
    tick() {
      if (!enabled()) return;
      tone(440, 0, 0.05, "square", 0.06);
    },

    // ---- Dutch text-to-speech ----
    _voices: [],
    _loaded: false,
    _refresh() {
      if (!("speechSynthesis" in window)) return;
      const v = speechSynthesis.getVoices() || [];
      if (v.length) { this._voices = v; this._loaded = true; }
    },
    canSpeak() { return "speechSynthesis" in window; },
    voicesLoaded() { return this._loaded; },
    dutchVoices() { this._refresh(); return this._voices.filter((v) => /^nl/i.test(v.lang)); },
    hasDutchVoice() { return this.dutchVoices().length > 0; },
    // Returns { ok, reason?, dutch? } so the UI can warn when no Dutch voice exists.
    speak(text) {
      if (!("speechSynthesis" in window)) return { ok: false, reason: "unsupported" };
      if (window.Store && !Store.settings.tts) return { ok: false, reason: "disabled" };
      if (!text) return { ok: false, reason: "empty" };
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "nl-NL";
        u.rate = 0.95;
        const nl = this.dutchVoices();
        const v = nl.find((x) => /nl[-_]NL/i.test(x.lang)) || nl[0] || null;
        if (v) u.voice = v;
        speechSynthesis.speak(u);
        return { ok: true, dutch: !!v };
      } catch (e) { return { ok: false, reason: "error" }; }
    },

    // ---- Confetti (canvas) ----
    confetti() {
      if (window.Store && !Store.settings.confetti) return;
      const canvas = document.createElement("canvas");
      canvas.style.cssText =
        "position:fixed;inset:0;pointer-events:none;z-index:9999;";
      canvas.width = innerWidth; canvas.height = innerHeight;
      document.body.appendChild(canvas);
      const g = canvas.getContext("2d");
      const colors = ["#ff7a00", "#ff5c8a", "#6c8cff", "#28c76f", "#ffd23f", "#a06cff"];
      const parts = [];
      const N = 120;
      for (let i = 0; i < N; i++) {
        parts.push({
          x: innerWidth / 2 + (Math.random() - 0.5) * 120,
          y: innerHeight / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: Math.random() * -14 - 4,
          r: Math.random() * 6 + 3,
          c: colors[(Math.random() * colors.length) | 0],
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.4,
        });
      }
      let frame = 0;
      (function loop() {
        frame++;
        g.clearRect(0, 0, canvas.width, canvas.height);
        parts.forEach((p) => {
          p.vy += 0.4; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
          g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
          g.fillStyle = p.c;
          g.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
          g.restore();
        });
        if (frame < 110) requestAnimationFrame(loop);
        else canvas.remove();
      })();
    },
  };

  if ("speechSynthesis" in window) {
    FX._refresh();
    speechSynthesis.onvoiceschanged = () => FX._refresh();
    setTimeout(() => FX._refresh(), 200);
  }

  window.FX = FX;
})();
