# Grammatica Oefenen 🇳🇱

A fast, friendly web app for practising Dutch grammar and vocabulary. Pure
HTML/CSS/JavaScript — **no build step, no dependencies** — so it runs anywhere,
including GitHub Pages.

This is a rebuilt, expanded version of the original single-file app: same core
idea, but with more question types, a nicer interface, and progress that sticks.

## ✨ What's new

**More ways to practise**
- 🧩 **Werkwoorden** — conjugate verbs in 4 tenses (present, perfectum, imperfectum, plusquamperfectum)
- ⚖️ **De / Het** — train the dreaded Dutch articles
- 🔤 **Woordenschat** — multiple-choice vocabulary, Dutch ⇄ English
- 🎧 **Luisteren** — dictation: type the word or sentence you hear (text-to-speech)
- 🔀 **Zinsbouw** — tap the words into the correct sentence order
- 🧠 **Memory** — match Dutch words to their translations against the clock
- 📈 **Per niveau** — all the original grammar topics, organised by course level 1–5
- 🎲 **Verrassing** — everything shuffled together
- ⚡ **Blitz** — 60 seconds, as many as you can

**Gimmicks & quality-of-life**
- 🆙 **XP & levels** with a progress bar in the header
- 🔥 **Daily streak** that rewards coming back
- ♻️ **Spaced repetition** — your mistakes are tracked and resurface in the *Herhalen* mode
- 🏆 **Achievements** you unlock as you go
- 📊 **Stats dashboard** — accuracy, words mastered, blitz record, and more
- 🌗 **Light / dark / auto theme**
- 🔊 **Dutch pronunciation** on every question (Web Speech API)
- 🎉 Generated **sound effects** and **confetti** (both toggleable)
- 💾 Everything saved locally in your browser — no account, no server

## 🚀 Deploy to GitHub Pages

1. Create a repository and push these files to the default branch (e.g. `main`).
   ```bash
   git add -A
   git commit -m "Grammatica Oefenen"
   git remote add origin git@github.com:<you>/<repo>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment**.
   - **Source:** *Deploy from a branch*
   - **Branch:** `main` / `(root)` → **Save**
3. Wait ~30 seconds; your app is live at
   `https://<you>.github.io/<repo>/`.

That's it — there's nothing to build.

## 🧑‍💻 Run locally

Because the app loads JS files, open it through a tiny web server (not `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## 🗂️ Project structure

```
index.html          # markup shell + persistent header
css/styles.css      # all styling, light & dark themes
js/store.js         # localStorage: settings, XP, streak, stats, spaced repetition
js/fx.js            # sound effects, text-to-speech, confetti
js/engine.js        # turns the data into questions of every type; answer checking
js/app.js           # the SPA: navigation, quiz loop, games, results, settings
data/topics.js      # grammar sentences (verbs, plurals, adjectives, word order, …)
data/dehet.js       # ~700 nouns with article + English translation
```

## 📝 Editing content

- **Add grammar questions:** edit `data/topics.js`. Each item is
  `{ infinitive, sentence, translation, answer, tense }`. Use `...` to mark the
  blank, and separate multiple accepted answers with ` / `.
- **Add nouns for De/Het, vocab & memory:** edit `data/dehet.js`
  (`{ word, article, translation }`).

Answers are checked case-insensitively and ignore accents and trailing
punctuation, so learners aren't penalised for small typing differences.
