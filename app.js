// app.js  (no modules; works from file://)
// Requires topics.js and dehet.js to be loaded BEFORE this file.

(function initWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

function initApp() {
  // ---- Data guards ----
  if (!window.TOPIC_LABELS || !window.topicSentences || !window.DEHET_WORDS) {
    alert('Kon data niet vinden. Zorg dat topics.js en dehet.js vóór app.js geladen worden.');
    return;
  }
  const TOPIC_LABELS = window.TOPIC_LABELS;
  const topicSentences = window.topicSentences;
  const DEHET_WORDS = window.DEHET_WORDS;

  // ===== DOM =====
  const appTitle = document.getElementById('app-title');

  const welcomeScreen = document.getElementById('welcome-screen');
  const topicScreen = document.getElementById('topic-screen');
  const levelSubmenu = document.getElementById('level-submenu');
  const levelTitle = document.getElementById('level-title');
  const levelTopicButtons = document.getElementById('level-topic-buttons');

  const verbsSubmenu = document.getElementById('verbs-submenu');
  const dehetScreen = document.getElementById('dehet-screen');
  const practiceScreen = document.getElementById('practice-screen');
  const finalScreen = document.getElementById('final-screen');

  const welcomeStartButton = document.getElementById('welcome-start-button');
  const randomPracticeButton = document.getElementById('random-practice-button');
  const startVerbsButton = document.getElementById('start-verbs-button');

  const backToTopicsButton = document.getElementById('back-to-topics');
  const backToMenuButton = document.getElementById('back-to-menu');
  const backToWelcome = document.getElementById('back-to-welcome');
  const backToWelcomeSmall = document.getElementById('back-to-welcome-small');

  const backToLevelsBtn = document.getElementById('back-to-levels');
  const levelBackToWelcome = document.getElementById('level-back-to-welcome');

  const levelButtonsContainer = document.getElementById('level-buttons');
  const topCategories = document.getElementById('top-categories');

  const checkButton = document.getElementById('check-btn');
  const hintButton = document.getElementById('hint-btn');
  const tryAgainButton = document.getElementById('again-btn');

  const userInput = document.getElementById('user-input');
  const progressBar = document.getElementById('progress-bar');
  const livesDisplay = document.getElementById('lives');
  const infinitiveVerb = document.getElementById('infinitive-verb');
  const verbTenseEl = document.getElementById('verb-tense');
  const sentenceDisplay = document.getElementById('sentence-display');
  const translation = document.getElementById('translation');
  const translationRow = document.getElementById('translation-row');
  const correctAnswerDisplay = document.getElementById('correct-answer');
  const finalScore = document.getElementById('final-score');
  const mistakeList = document.getElementById('mistake-list');
  const body = document.getElementById('body');

  // Question count slider (welcome screen)
  const questionSlider = document.getElementById('question-slider');
  const questionCountLabel = document.getElementById('question-count');
  let questionCount = questionSlider ? Number(questionSlider.value) || 30 : 30;
  if (questionCountLabel) questionCountLabel.textContent = String(questionCount);
  questionSlider?.addEventListener('input', () => {
    questionCount = Number(questionSlider.value) || 30;
    if (questionCountLabel) questionCountLabel.textContent = String(questionCount);
  });

  // De/Het game DOM
  const dehetStartPane = document.getElementById('dehet-start-pane');
  const dehetGamePane = document.getElementById('dehet-game-pane');
  const dehetStartBtn = document.getElementById('dehet-start-btn');

  const dehetWord = document.getElementById('dehet-word');
  const dehetTranslationCol = document.getElementById('dehet-translation-col');
  const dehetTranslation = document.getElementById('dehet-translation');

  const dehetDeBtn = document.getElementById('dehet-de-btn');
  const dehetHetBtn = document.getElementById('dehet-het-btn');
  const dehetTryBtn = document.getElementById('dehet-try-btn');

  const dehetLives = document.getElementById('dehet-lives');
  const dehetScore = document.getElementById('dehet-score');
  const dehetMessage = document.getElementById('dehet-message');
  const dehetWrongList = document.getElementById('dehet-wrong-list');

  // Toggles
  const confettiSwitch = document.getElementById('confetti-switch');
  let confettiEnabled = confettiSwitch?.checked || false; // default OFF (unchecked in HTML)
  confettiSwitch?.addEventListener('change', () => { confettiEnabled = confettiSwitch.checked; });

  const translationSwitch = document.getElementById('translation-switch');
  let translationEnabled = translationSwitch?.checked !== false; // default ON (checked in HTML)
  translationSwitch?.addEventListener('change', () => {
    translationEnabled = translationSwitch.checked;
    updateTranslationVisibility();
    updateDeHetTranslationVisibility();
  });

  // ===== STATE =====
  let mode = 'topic';               // 'topic' | 'verbs-mix' | 'random'
  let selectedTopic = null;
  let lives = 3, currentSentenceIndex = 0;
  let practiceSentences = [], mistakes = [], hasUsedHint = false, lifeDeducted = false;

  // De/Het game state
  const dehet = { pool: [], run: [], idx: 0, score: 0, lives: 3, total: 30, wrong: [] };
  let dehetGameOver = false;
  let dehetLocked = false;

  // ===== Titles =====
  function setTitle(text) { if (appTitle) appTitle.textContent = text; }
  function titleForTopic(id) {
    if ([1, 2, 3, 13].includes(Number(id))) return 'Werkwoorden';
    return TOPIC_LABELS[id] || 'Grammatica Oefenen';
  }

  // Verb tense labels
  const VERB_TENSE_LABELS = {
    present: "Tegenwoordige tijd",
    perfectum: "Perfectum",
    imperfectum: "Imperfectum",
    plusquamperfectum: "Plusquamperfectum"
  };
  const TOPIC_TO_TENSE_KEY = { 1: 'present', 2: 'perfectum', 3: 'imperfectum', 13: 'plusquamperfectum' };

  // Level → topics mapping
  const LEVELS = {
    1: [14, 15, 16, 17, 18, 19, 4],
    2: [5, 6, 20],
    3: [7, 8, 21],
    4: [9, 10, 22, 24],
    5: [11, 12, 23],
    6: []
  };

  // ===== show/hide verb-tense pill =====
  function setVerbTense(label) {
    if (!verbTenseEl) return;
    if (label) {
      verbTenseEl.textContent = label;
      verbTenseEl.style.display = 'inline-block';
    } else {
      verbTenseEl.textContent = '';
      verbTenseEl.style.display = 'none';
    }
  }

  // ===== NAVIGATION =====
  welcomeStartButton?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null); // hide on non-practice screen
    welcomeScreen.classList.add('hidden');
    topicScreen.classList.remove('hidden');
  });
  backToMenuButton?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    practiceScreen.classList.add('hidden');
    topicScreen.classList.remove('hidden');
  });
  backToTopicsButton?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    verbsSubmenu.classList.add('hidden');
    topicScreen.classList.remove('hidden');
  });
  backToWelcome?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    topicScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
  });
  backToWelcomeSmall?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    practiceScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
  });

  backToLevelsBtn?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    levelSubmenu.classList.add('hidden');
    topicScreen.classList.remove('hidden');
  });
  levelBackToWelcome?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    levelSubmenu.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
  });

  // Render Level 1..6
  renderLevelButtons();

  function renderLevelButtons() {
    if (!levelButtonsContainer) return;
    levelButtonsContainer.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
      const btn = document.createElement('button');
      btn.className = 'topic-button';
      btn.textContent = `Level ${i}`;
      btn.dataset.level = String(i);
      btn.addEventListener('click', () => showLevelTopics(i));
      levelButtonsContainer.appendChild(btn);
    }
  }

  // Open separate level submenu
  function showLevelTopics(level) {
    const ids = LEVELS[level] || [];
    levelTitle.textContent = `Level ${level}`;
    levelTopicButtons.innerHTML = '';

    if (ids.length === 0) {
      levelTopicButtons.innerHTML = '<p style="text-align:center;color:#666;">(Nog geen onderdelen in dit niveau)</p>';
    } else {
      ids.forEach(id => {
        const btn = document.createElement('button');
        btn.className = 'topic-button';
        btn.textContent = TOPIC_LABELS[id] || `Topic ${id}`;
        btn.addEventListener('click', () => {
          mode = 'topic';
          selectedTopic = id;
          startPracticeForTopic(id);
        });
        levelTopicButtons.appendChild(btn);
      });
    }

    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    topicScreen.classList.add('hidden');
    levelSubmenu.classList.remove('hidden');
  }

  // Top categories
  topCategories?.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const cat = b.dataset.category;
    if (cat === 'verbs') {
      setTitle('Grammatica Oefenen');
      setVerbTense(null);
      topicScreen.classList.add('hidden');
      verbsSubmenu.classList.remove('hidden');
    } else if (cat === 'dehet') {
      setTitle('DE vs. HET');
      setVerbTense(null); // de/het is geen werkwoordsoefening
      topicScreen.classList.add('hidden');
      // show the de/het screen and start immediately
      dehetScreen.classList.remove('hidden');
      startDeHetGame();
    }
  });

  // Random practice
  randomPracticeButton?.addEventListener('click', () => {
    setTitle('Verrassingsronde');
    mode = 'random';
    let all = [];
    Object.values(topicSentences).forEach(arr => { if (Array.isArray(arr)) all = all.concat(arr); });
    if (all.length === 0) { alert('Geen oefenzinnen gevonden.'); return; }
    practiceSentences = shuffleArray(all).slice(0, clampCount(questionCount));
    resetRunState();
    topicScreen.classList.add('hidden');
    practiceScreen.classList.remove('hidden');
    updateSentence();
  });

  // Verb mix start (supports 1,2,3,13)
  startVerbsButton?.addEventListener('click', () => {
    const checked = [...verbsSubmenu.querySelectorAll('.verb-options input[type="checkbox"]:checked')]
      .map(cb => Number(cb.value)); // [1,2,3,13]

    if (checked.length === 0) { alert('Kies minimaal één werkwoordstijd.'); return; }

    const keyMap = { 1: 'present', 2: 'perfectum', 3: 'imperfectum', 13: 'plusquamperfectum' };
    let merged = [];
    checked.forEach(id => {
      if (topicSentences[id]) {
        const withKey = topicSentences[id].map(s => ({ ...s, tense: keyMap[id] }));
        merged = merged.concat(withKey);
      }
    });

    if (merged.length === 0) { alert('Er is nog geen data voor de gekozen tijden.'); return; }

    setTitle('Werkwoorden');
    mode = 'verbs-mix';
    selectedTopic = null;
    practiceSentences = shuffleArray(merged).slice(0, clampCount(questionCount));
    resetRunState();
    verbsSubmenu.classList.add('hidden');
    practiceScreen.classList.remove('hidden');
    updateSentence();
  });

  // Specific topic
  function startPracticeForTopic(topicNumber) {
    const arr = topicSentences[topicNumber];
    if (!Array.isArray(arr) || arr.length === 0) {
      alert('Dit onderdeel heeft nog geen vragen.');
      return;
    }
    setTitle(titleForTopic(topicNumber));
    selectedTopic = topicNumber;
    mode = 'topic';
    practiceSentences = shuffleArray(arr.slice()).slice(0, clampCount(questionCount));
    resetRunState();
    levelSubmenu.classList.add('hidden');
    practiceScreen.classList.remove('hidden');
    updateSentence();
  }

  // ===== Helpers =====
  function clampCount(n) {
    // Enforce 10..50 and step 5
    n = Math.max(10, Math.min(50, Math.round(n / 5) * 5));
    return n;
  }

  function resetRunState() {
    lives = 3; currentSentenceIndex = 0; mistakes = []; hasUsedHint = false; lifeDeducted = false; updateLives();
    body.classList.remove('correct-background', 'incorrect-background');
  }

  function shuffleArray(array) {
    if (!Array.isArray(array)) return [];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = array[i]; array[i] = array[j]; array[j] = tmp;
    }
    return array;
  }

  function sanitizeAnswer(text) {
    if (!text) return "";

    // Normalize Unicode, strip diacritics
    let s = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");

    // Convert ALL weird Unicode spaces to a normal space:
    // NBSP \u00A0, NNBSP \u202F, figure space \u2007, and the whole U+2000–U+200A block, etc.
    s = s.replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ");

    return s
      .trim()
      .toLowerCase()
      // collapse any remaining whitespace runs
      .replace(/\s+/g, " ")
      // remove trailing punctuation like . ! ? ; :
      .replace(/[.!?;:]+$/g, "");
  }

  // Flag: after showing hint, the ? button becomes "Volgende"
  let hintIsNextMode = false;

  // ===== Practice flow =====
  function updateSentence() {
    if (!Array.isArray(practiceSentences) || currentSentenceIndex >= practiceSentences.length) {
      showFinalScreen(); return;
    }
    const s = practiceSentences[currentSentenceIndex];

    // Infinitive label (left pill)
    infinitiveVerb.textContent = s?.infinitive ?? '';

    // Decide verb-tense visibility/label PER ITEM:
    // Show only for verb exercises (present/perfectum/imperfectum/plusquamperfectum).
    let label = null;
    if (s?.tense && VERB_TENSE_LABELS[s.tense]) {
      label = VERB_TENSE_LABELS[s.tense];
    } else if (selectedTopic && [1, 2, 3, 13].includes(Number(selectedTopic))) {
      const key = TOPIC_TO_TENSE_KEY[selectedTopic];
      label = key ? VERB_TENSE_LABELS[key] : null;
    }
    // In random mode, only show if the current item explicitly has a verb tense:
    // (i.e., we already handled s.tense above; otherwise keep hidden.)
    setVerbTense(label);

    // Sentence / translation
    sentenceDisplay.textContent = s?.sentence ?? '';
    translation.textContent = s?.translation ?? '';
    correctAnswerDisplay.classList.add('hidden');
    userInput.value = '';
    body.classList.remove('correct-background', 'incorrect-background');

    // reset controls
    hintIsNextMode = false;
    hintButton.classList.remove('next-button'); // remove purple
    hintButton.textContent = '?';
    hintButton.disabled = true;
    checkButton.disabled = false;
    userInput.onkeypress = handleKeyPress;

    hasUsedHint = false;
    lifeDeducted = false;
    updateTranslationVisibility();
    updateProgressBar();
  }

  function checkAnswer() {
    const s = practiceSentences[currentSentenceIndex];
    const user = sanitizeAnswer(userInput.value);
    if (!user) return;

    // Sanitize the right-hand side too
    const correctVariants = String(s.answer ?? '')
      .split('/')            // support multiple correct forms: "a / b / c"
      .map(sanitizeAnswer)   // normalize each variant (spaces, punctuation, accents)
      .filter(Boolean);

    if (correctVariants.includes(user)) {
      launchConfetti();
      body.classList.add('correct-background');
      currentSentenceIndex++;
      checkButton.disabled = true;
      userInput.onkeypress = null;
      setTimeout(updateSentence, 750);
    } else {
      body.classList.add('incorrect-background');
      if (!hasUsedHint && !lifeDeducted) {
        mistakes.push({ question: s.sentence, givenAnswer: user, correctAnswer: s.answer });
        lives--; lifeDeducted = true; updateLives();
        if (lives <= 0) { showFinalScreen(); return; }
      }
      hintButton.disabled = false;
      checkButton.disabled = false;
    }
  }

  function handleKeyPress(e) { if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); } }
  checkButton?.addEventListener('click', checkAnswer);

  // HINT -> show correct answer, then morph to "Volgende" (purple)
  hintButton?.addEventListener('click', function () {
    // If we're already in "Volgende" mode, advance to next
    if (hintIsNextMode) {
      hintIsNextMode = false;
      currentSentenceIndex++;
      updateSentence();
      return;
    }

    // Normal hint flow
    if (hintButton.disabled) return;
    const s = practiceSentences[currentSentenceIndex];
    correctAnswerDisplay.textContent = `Het juiste antwoord is: ${s.answer}`;
    correctAnswerDisplay.classList.remove('hidden');
    body.classList.add('incorrect-background');

    hasUsedHint = true;

    // lock controls and morph ? -> Volgende (purple)
    checkButton.disabled = true;
    userInput.onkeypress = null;

    hintIsNextMode = true;
    hintButton.textContent = 'Volgende';
    hintButton.classList.add('next-button'); // purple style (CSS in index.html)
  });

  tryAgainButton?.addEventListener('click', function () {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    finalScreen.classList.add('hidden'); topicScreen.classList.remove('hidden');
  });

  function updateProgressBar() {
    const total = Math.max(1, practiceSentences?.length || 0);
    const p = (currentSentenceIndex / total) * 100;
    progressBar.style.width = p + '%';
  }

  function showFinalScreen() {
    practiceScreen.classList.add('hidden'); finalScreen.classList.remove('hidden');
    setVerbTense(null); // hide on results screen
    finalScore.textContent = `Je score: ${currentSentenceIndex} van de ${practiceSentences?.length || 0}`;
    mistakeList.innerHTML = '';
    mistakes.forEach(m => {
      const li = document.createElement('li');
      li.textContent = `Zin: ${m.question} | Jouw antwoord: ${m.givenAnswer} | Correct: ${m.correctAnswer}`;
      mistakeList.appendChild(li);
    });
  }

  function updateLives() { livesDisplay.innerHTML = '🧡'.repeat(Math.max(0, lives)); }
  function updateTranslationVisibility() { translationRow.style.display = translationEnabled ? 'flex' : 'none'; }

  // ===== Confetti =====
  function launchConfetti() {
    if (!confettiEnabled) return;
    const emojis = ['🇳🇱', '🌷'];
    const num = 18;
    const startX = (window.innerWidth / 2) - 300;

    for (let i = 0; i < num; i++) {
      const e = document.createElement('div');
      e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      e.style.position = 'fixed'; e.style.left = startX + 'px'; e.style.bottom = '0px';
      e.style.fontSize = '24px'; e.style.zIndex = '9999'; e.style.pointerEvents = 'none';
      document.body.appendChild(e);

      const angle = (Math.random() * (Math.PI * 3 / 4)) - (Math.PI / 3); // 120°
      const speed = 4 + Math.random() * 2;
      const gravity = 0.6;
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed + 28;
      let x = startX, y = 0;

      const it = setInterval(() => {
        vy -= gravity; x += vx; y += vy;
        e.style.left = x + 'px'; e.style.bottom = y + 'px';
        if (y < -50) { clearInterval(it); e.remove(); }
      }, 16);
    }
  }

  // ===== De/Het GAME =====
  const dehetBackToMenu = document.getElementById('dehet-back-to-menu');
  const dehetBackToWelcome = document.getElementById('dehet-back-to-welcome');

  const dehetStateDefaults = () => {
    dehet.idx = 0; dehet.score = 0; dehet.lives = 3; dehet.wrong = [];
    dehetGameOver = false; dehetLocked = false;
  };

  function setDeHetButtonsVisible(show) {
    [dehetDeBtn, dehetHetBtn].forEach(b => {
      if (!b) return;
      b.style.display = show ? '' : 'none';
      b.disabled = !show;
    });
  }
  function setDeHetButtonsEnabled(enabled) {
    [dehetDeBtn, dehetHetBtn].forEach(b => { if (b) b.disabled = !enabled; });
  }

  function showDeHetStart() {
    setTitle('DE vs. HET');
    setVerbTense(null); // never show verb-tense for de/het
    dehetScreen.classList.remove('hidden');
    dehetStartPane.classList.add('hidden'); // keep hidden since we auto-start
    dehetGamePane.classList.add('hidden');

    dehetWrongList.style.display = 'none';
    dehetWrongList.innerHTML = '';
    dehetMessage.classList.add('hidden');
    dehetMessage.textContent = '';
    dehetTryBtn?.classList.add('hidden');

    progressBar.style.width = '0%';
    dehetStateDefaults();
  }

  // Extracted: start game logic (used by menu click and optional start button)
  function startDeHetGame() {
    showDeHetStart(); // sets up base state and shows screen (without start pane)

    dehet.pool = Array.isArray(DEHET_WORDS) ? [...DEHET_WORDS] : [];
    shuffleArray(dehet.pool);

    // Use the slider count
    dehet.total = clampCount(questionCount);
    dehet.run = dehet.pool.slice(0, dehet.total);

    dehetStateDefaults();

    // Show game pane now
    dehetStartPane.classList.add('hidden');
    dehetGamePane.classList.remove('hidden');
    dehetLives.innerHTML = '🧡🧡🧡';
    dehetScore.textContent = '0';
    body.classList.remove('correct-background', 'incorrect-background');
    progressBar.style.width = '0%';

    setDeHetButtonsVisible(true);
    setDeHetButtonsEnabled(true);
    dehetTryBtn?.classList.add('hidden');

    nextDeHetCard();
    updateDeHetTranslationVisibility();
  }

  // Keep the original button working (in case it exists in DOM)
  dehetStartBtn?.addEventListener('click', startDeHetGame);

  function nextDeHetCard() {
    if (dehet.idx >= dehet.run.length) {
      finishDeHet(false);
      return;
    }
    const item = dehet.run[dehet.idx];
    dehetWord.textContent = item.word || '';
    dehetTranslation.textContent = item.translation || '';

    body.classList.remove('correct-background', 'incorrect-background');
    const p = (dehet.idx / Math.max(1, dehet.run.length)) * 100;
    progressBar.style.width = p + '%';

    // unlock for this card
    dehetLocked = false;
    setDeHetButtonsEnabled(true);
  }

  function updateDeHetTranslationVisibility() {
    if (!dehetTranslationCol) return;
    dehetTranslationCol.style.visibility = translationEnabled ? 'visible' : 'hidden';
  }

  function chooseDeHet(answer) {
    if (dehetGameOver || dehetLocked) return; // ignore stray/double clicks
    dehetLocked = true;
    setDeHetButtonsEnabled(false);

    const item = dehet.run[dehet.idx];
    const ok = (answer === item.article);
    if (ok) {
      if (confettiEnabled) launchConfetti();
      body.classList.add('correct-background');
      dehet.score++;
      dehetScore.textContent = dehet.score;
    } else {
      body.classList.add('incorrect-background');
      dehet.lives--;
      dehetLives.innerHTML = '🧡'.repeat(Math.max(0, dehet.lives));
      dehet.wrong.push(item);
      if (dehet.lives <= 0) {
        dehetGameOver = true;
        finishDeHet(true);
        return;
      }
    }
    dehet.idx++;
    setTimeout(nextDeHetCard, 450);
  }

  dehetDeBtn?.addEventListener('click', () => chooseDeHet('de'));
  dehetHetBtn?.addEventListener('click', () => chooseDeHet('het'));
  dehetTryBtn?.addEventListener('click', startDeHetGame);

  function finishDeHet(gameOver = false) {
    progressBar.style.width = '100%';

    // Wrong list
    dehetWrongList.innerHTML = '';
    if (dehet.wrong.length) {
      dehetWrongList.style.display = 'block';
      dehet.wrong.forEach(w => {
        const li = document.createElement('li');
        li.textContent = `${w.word} (${w.translation}) — ${w.article}`;
        dehetWrongList.appendChild(li);
      });
    } else {
      dehetWrongList.style.display = 'none';
    }

    if (gameOver) {
      setDeHetButtonsVisible(false);           // hide green buttons
      setDeHetButtonsEnabled(false);           // keep disabled
      dehetTryBtn?.classList.remove('hidden'); // show orange retry
    } else {
      dehetTryBtn?.classList.add('hidden');
    }
  }

  // Back buttons for de/het
  dehetBackToMenu?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    dehetScreen.classList.add('hidden');
    topicScreen.classList.remove('hidden');
  });
  dehetBackToWelcome?.addEventListener('click', () => {
    setTitle('Grammatica Oefenen');
    setVerbTense(null);
    dehetScreen.classList.add('hidden');
    welcomeScreen.classList.remove('hidden');
  });
}
