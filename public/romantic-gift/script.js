const TOTAL_STEPS = 10;
const PUZZLE_GRID = 5;
const PUZZLE_EXPORT_PX = 500;
/** Pauza nakon poruke ispod prije prelaska na sljedeće pitanje (ms) */
const STEP_PAUSE_AFTER_MS = 1600;

const state = {
  currentStep: 0,
  _mazeKeyHandler: null,
};

const nodes = {
  startCard: document.getElementById("startCard"),
  stepCard: document.getElementById("stepCard"),
  finalCard: document.getElementById("finalCard"),
  stepCounter: document.getElementById("stepCounter"),
  stepTitle: document.getElementById("stepTitle"),
  stepMessage: document.getElementById("stepMessage"),
  stepContent: document.getElementById("stepContent"),
  hintText: document.getElementById("hintText"),
  progressFill: document.getElementById("progressFill"),
  stepGoalFill: document.getElementById("stepGoalFill"),
  giftVisual: document.getElementById("giftVisual"),
  startBtn: document.getElementById("startBtn"),
  openGiftBtn: document.getElementById("openGiftBtn"),
  bigReveal: document.getElementById("bigReveal"),
  finalHeadline: document.getElementById("finalHeadline"),
  confettiCanvas: document.getElementById("confettiCanvas"),
  bgHearts: document.getElementById("bgHearts"),
};

function scheduleNextStep() {
  setTimeout(moveToNextStep, STEP_PAUSE_AFTER_MS);
}

const stepData = [
  {
    title: "Prvo pitanje — znaš li kako najviše volim da me zoveš?",
    message: () => "",
    render: renderQHowSheCallsMe,
  },
  {
    title: "Kako ja volim da te zovem?",
    message: () => "",
    render: renderQHowICallHer,
  },
  {
    title: "Ti si moje … (dopuni tačnim odgovorom)",
    message: () => "",
    render: renderQTiSiMoje,
  },
  {
    title: "Kad si ti sretna, ja sam:",
    message: () => "",
    render: renderQWhenYouHappy,
  },
  {
    title: "Šta te najviše usreći?",
    message: () => "",
    render: renderQWhatMakesYouHappy,
  },
  {
    title: "Pored tebe se osjećam: (odaberi više tačnih odgovora)",
    message: () => "",
    render: renderQFeelBeside,
  },
  {
    title: "Memory za nas — 8 parova",
    message: () =>
      "Blizu si lozinke....",
    render: renderMemoryStep,
  },
  {
    title: "Pomozi 🧸 medi da stigne do 🐻",
    message: () => "",
    render: renderMazeStep,
  },
  {
    title: "Složi puzzle 5×5 — povuci pločice na prazna mjesta",
    message: () => "",
    render: renderPuzzleStep,
  },
  {
    title: "Ocijeni ovaj kviz od 1 do 10",
    message: () => "",
    render: renderRateQuiz,
  },
];

/**
 * Nasumičan lavirint: DFS + dodatni proboji zida (petlje / alternativni hodnici)
 * → dugački ćorsokaci, lako zalutati i morati se vraćati.
 * W i H neka budu neparni, npr. 31×27.
 */
function shuffleMazeDirs(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateMazeLines(wantCols, wantRows) {
  let W = wantCols;
  let H = wantRows;
  if (W % 2 === 0) W += 1;
  if (H % 2 === 0) H += 1;
  const grid = Array.from({ length: H }, () => Array(W).fill(1));

  const stack = [[1, 1]];
  grid[1][1] = 0;
  const jump = [
    [0, 2],
    [0, -2],
    [2, 0],
    [-2, 0],
  ];

  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = shuffleMazeDirs(
      jump
        .map(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          const wr = r + dr / 2;
          const wc = c + dc / 2;
          return { nr, nc, wr, wc };
        })
        .filter(
          ({ nr, nc }) =>
            nr > 0 &&
            nr < H - 1 &&
            nc > 0 &&
            nc < W - 1 &&
            grid[nr][nc] === 1
        )
    );
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const { nr, nc, wr, wc } = opts[0];
    grid[wr][wc] = 0;
    grid[nr][nc] = 0;
    stack.push([nr, nc]);
  }

  const punches = Math.floor(W * H * 0.05);
  for (let p = 0; p < punches; p += 1) {
    const r = 1 + Math.floor(Math.random() * (H - 2));
    const c = 1 + Math.floor(Math.random() * (W - 2));
    if (grid[r][c] !== 1) continue;
    let open = 0;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      if (grid[r + dr][c + dc] === 0) open += 1;
    }
    if (open >= 2) grid[r][c] = 0;
  }

  for (let r = 0; r < H; r += 1) {
    grid[r][0] = 1;
    grid[r][W - 1] = 1;
  }
  for (let c = 0; c < W; c += 1) {
    grid[0][c] = 1;
    grid[H - 1][c] = 1;
  }

  let sr = 1;
  let sc = 1;
  if (grid[sr][sc] !== 0) {
    let found = false;
    for (let r = 1; r < H - 1 && !found; r += 1) {
      for (let c = 1; c < W - 1 && !found; c += 1) {
        if (grid[r][c] === 0) {
          sr = r;
          sc = c;
          found = true;
        }
      }
    }
  }

  const dist = Array.from({ length: H }, () => Array(W).fill(-1));
  const q = [[sr, sc]];
  dist[sr][sc] = 0;
  let gr = sr;
  let gc = sc;
  let best = 0;
  const d4 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of d4) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= H || nc < 0 || nc >= W) continue;
      if (grid[nr][nc] !== 0) continue;
      if (dist[nr][nc] >= 0) continue;
      dist[nr][nc] = dist[r][c] + 1;
      if (dist[nr][nc] > best) {
        best = dist[nr][nc];
        gr = nr;
        gc = nc;
      }
      q.push([nr, nc]);
    }
  }

  const lines = [];
  for (let r = 0; r < H; r += 1) {
    let row = "";
    for (let c = 0; c < W; c += 1) {
      if (r === sr && c === sc) row += "S";
      else if (r === gr && c === gc) row += "G";
      else row += grid[r][c] === 1 ? "#" : ".";
    }
    lines.push(row);
  }
  return lines;
}

function init() {
  nodes.startBtn.addEventListener("click", startJourney);
  nodes.openGiftBtn.addEventListener("click", revealGift);

  createFloatingHearts();
  setProgress(0);
  updateGiftDistance(0);

  const params = new URLSearchParams(window.location.search);
  if (params.get("autostart") === "1") {
    nodes.startCard.classList.add("hidden");
    nodes.stepCard.classList.remove("hidden");
    startJourney();
  }
}

function startJourney() {
  state.currentStep = 1;
  nodes.startCard.classList.add("hidden");
  nodes.stepCard.classList.remove("hidden");
  renderCurrentStep();
}

function renderCurrentStep() {
  if (state._mazeKeyHandler) {
    window.removeEventListener("keydown", state._mazeKeyHandler);
    state._mazeKeyHandler = null;
  }
  const step = stepData[state.currentStep - 1];
  nodes.hintText.textContent = "";
  nodes.stepCounter.textContent = `Korak ${state.currentStep} od ${TOTAL_STEPS}`;
  nodes.stepTitle.textContent = step.title;
  const sub = step.message();
  nodes.stepMessage.textContent = sub;
  if (sub && sub.trim()) {
    nodes.stepMessage.classList.remove("hidden");
  } else {
    nodes.stepMessage.classList.add("hidden");
  }
  nodes.stepContent.innerHTML = "";
  step.render();

  const progress = Math.min(
    100,
    Math.round((state.currentStep / TOTAL_STEPS) * 100)
  );
  setProgress(progress);
  updateGiftDistance(state.currentStep - 1);
}

function moveToNextStep() {
  if (state.currentStep < TOTAL_STEPS) {
    state.currentStep += 1;
    renderCurrentStep();
    return;
  }

  nodes.stepCard.classList.add("hidden");
  nodes.finalCard.classList.remove("hidden");
  setProgress(100);
  updateGiftDistance(TOTAL_STEPS);
}

function renderQHowSheCallsMe() {
  const options = [
    { label: "Dudu", correct: false },
    { label: "Rudu", correct: false },
    { label: "Medo", correct: true },
  ];

  const list = document.createElement("div");
  list.className = "option-list";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      if (option.correct) {
        nodes.hintText.textContent = "Tačno! Medo ❤️";
        pulseSuccess();
        scheduleNextStep();
      } else {
        nodes.hintText.textContent = "Pokušaj opet";
      }
    });
    list.appendChild(btn);
  });

  nodes.stepContent.appendChild(list);
}

function renderQHowICallHer() {
  const options = [
    { label: "Djevojčice", key: "djevojcice" },
    { label: "Princezo", key: "princezo" },
    { label: "Suncice", key: "suncice" },
    { label: "Sve navedeno", key: "sve" },
  ];

  const list = document.createElement("div");
  list.className = "option-list";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      if (option.key === "sve") {
        nodes.hintText.textContent = "Tako jee ❤️";
        scheduleNextStep();
      } else {
        nodes.hintText.textContent =
          "Taj mi je nadimak posebno lijep, ali pokušaj opet…";
      }
    });
    list.appendChild(btn);
  });

  nodes.stepContent.appendChild(list);
}

function normalizeWord(s) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/š/g, "s")
    .replace(/đ/g, "dj")
    .replace(/ž/g, "z")
    .replace(/č/g, "c")
    .replace(/ć/g, "c");
}

function renderQTiSiMoje() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <input id="tiSiInput" type="text" maxlength="40" placeholder="Upiši nastavak…" />
    <button class="primary-btn" id="tiSiBtn" type="button">Pošalji</button>
  `;
  nodes.stepContent.appendChild(wrap);

  const ok = ["najmoje", "naj moje"];
  document.getElementById("tiSiBtn").addEventListener("click", () => {
    const val = normalizeWord(document.getElementById("tiSiInput").value);
    if (ok.includes(val)) {
      nodes.hintText.textContent = "Tačno — ti si moje najmoje 💗";
      scheduleNextStep();
    } else {
      nodes.hintText.textContent = "Pokušaj opet";
    }
  });
}

function renderQWhenYouHappy() {
  const options = [
    { label: "Pospan", correct: false },
    { label: "Razigran", correct: false },
    { label: "Sretan", correct: true },
  ];

  const list = document.createElement("div");
  list.className = "option-list";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      if (option.correct) {
        nodes.hintText.textContent = "Da — tvoja sreća je i moja ❤️";
        scheduleNextStep();
      } else {
        nodes.hintText.textContent = "Pokušaj opet";
      }
    });
    list.appendChild(btn);
  });

  nodes.stepContent.appendChild(list);
}

function renderQFeelBeside() {
  const picked = new Set();

  const options = [
    { label: "Sigurno", key: "sigurno", good: true },
    { label: "Pospano", key: "pospano", good: false },
    { label: "Mirno", key: "mirno", good: true },
    { label: "Uplašeno", key: "uplaseno", good: false },
  ];

  const list = document.createElement("div");
  list.className = "option-list";

  const resetGoodButtons = () => {
    picked.clear();
    options.forEach((opt) => {
      const b = opt._btn;
      if (!b) return;
      if (opt.good) {
        b.disabled = false;
        b.classList.remove("option-selected");
      }
    });
  };

  const checkDone = () => {
    if (picked.has("sigurno") && picked.has("mirno")) {
      nodes.hintText.textContent = "Tačno — sigurno i mirno, baš uz tebe 💕";
      list.querySelectorAll(".option-btn").forEach((b) => {
        b.disabled = true;
      });
      scheduleNextStep();
    } else if (picked.size === 1) {
      nodes.hintText.textContent = "Super — odaberi još jedan tačan odgovor.";
    }
  };

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option.label;
    option._btn = btn;
    btn.addEventListener("click", () => {
      if (!option.good) {
        nodes.hintText.textContent = "Pokušaj opet — trebaju oba: Sigurno i Mirno.";
        resetGoodButtons();
        return;
      }

      if (picked.has(option.key)) return;
      picked.add(option.key);
      btn.classList.add("option-selected");
      btn.disabled = true;
      checkDone();
    });
    list.appendChild(btn);
  });

  nodes.stepContent.appendChild(list);
}

function renderQWhatMakesYouHappy() {
  const options = [
    { label: "Šetnja", correct: false },
    { label: "Kiša", correct: false },
    { label: "Kinder jaje", correct: true },
  ];

  const list = document.createElement("div");
  list.className = "option-list";

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      if (option.correct) {
        nodes.hintText.textContent = "Tačno — Kinder jaje 🍫❤️";
        scheduleNextStep();
      } else {
        nodes.hintText.textContent = "Pokušaj opet";
      }
    });
    list.appendChild(btn);
  });

  nodes.stepContent.appendChild(list);
}

function loadImageUrl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error("fail"));
    img.src = src;
  });
}

async function loadMemoryImageUrls() {
  const urls = [];
  for (let i = 1; i <= 8; i += 1) {
    let found = null;
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      try {
        const u = `./memory/${i}.${ext}`;
        await loadImageUrl(u);
        found = u;
        break;
      } catch {
        /* try next ext */
      }
    }
    if (!found) return { ok: false, missing: i };
    urls.push(found);
  }
  return { ok: true, urls };
}

function renderMemoryStep() {
  const root = document.createElement("div");
  root.className = "memory-step";

  const status = document.createElement("div");
  status.className = "memory-meta";
  status.innerHTML =
    '<p class="memory-turn" id="memoryTurn"></p><p class="memory-scores" id="memoryScores"></p>';

  const gridHost = document.createElement("div");
  gridHost.className = "memory-grid-host";
  gridHost.id = "memoryGridHost";

  root.appendChild(status);
  root.appendChild(gridHost);
  nodes.stepContent.appendChild(root);

  const turnEl = root.querySelector("#memoryTurn");
  const scoresEl = root.querySelector("#memoryScores");

  (async () => {
    const loaded = await loadMemoryImageUrls();
    if (!loaded.ok) {
      gridHost.innerHTML = `<p class="memory-error">U folder <code>memory/</code> (pored <code>index.html</code>) dodaj slike nazvane <strong>1</strong> do <strong>8</strong>, npr. <code>1.jpg</code> … <code>8.jpg</code> (ili .png / .webp). Nedostaje slika broj <strong>${loaded.missing}</strong>.</p>`;
      nodes.hintText.textContent =
        "Kad slike budu na mjestu, osvježi stranicu i nastavi od ovog koraka.";
      return;
    }

    const game = {
      urls: loaded.urls,
      deck: [],
      flipped: [],
      matched: new Set(),
      lock: false,
      currentPlayer: "her",
      scores: { her: 0, him: 0 },
      ended: false,
    };

    function buildDeckFromUrls(urls) {
      const deck = [];
      urls.forEach((url, pairId) => {
        deck.push({ pairId, url });
        deck.push({ pairId, url });
      });
      shuffleInPlace(deck);
      return deck;
    }

    function updateMeta() {
      const turnLabel =
        game.currentPlayer === "her"
          ? "Na redu: ti (ona) — okreni dvije karte."
          : "Na redu: ja — okreni dvije karte.";
      turnEl.textContent = turnLabel;
      scoresEl.textContent = `Ti (ona): ${game.scores.her} parova  —  Ja: ${game.scores.him} parova`;
    }

    function cardIsFaceUp(idx) {
      return game.matched.has(idx) || game.flipped.includes(idx);
    }

    function renderGrid() {
      gridHost.innerHTML = "";
      const grid = document.createElement("div");
      grid.className = "memory-grid";
      game.deck.forEach((cell, idx) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "memory-card";
        btn.dataset.idx = String(idx);
        if (game.matched.has(idx)) btn.classList.add("memory-card--matched");
        if (cardIsFaceUp(idx)) btn.classList.add("memory-card--open");

        const inner = document.createElement("span");
        inner.className = "memory-card-inner";

        const back = document.createElement("span");
        back.className = "memory-card-back";
        back.setAttribute("aria-hidden", "true");
        back.textContent = "❤";

        const front = document.createElement("span");
        front.className = "memory-card-front";
        front.style.backgroundImage = `url("${cell.url}")`;

        inner.appendChild(back);
        inner.appendChild(front);
        btn.appendChild(inner);

        if (game.matched.has(idx) || game.ended) {
          btn.disabled = true;
        } else {
          btn.addEventListener("click", () => onPick(idx));
        }
        grid.appendChild(btn);
      });
      gridHost.appendChild(grid);
    }

    function resetRound() {
      game.deck = buildDeckFromUrls(game.urls);
      game.flipped = [];
      game.matched = new Set();
      game.scores = { her: 0, him: 0 };
      game.currentPlayer = "her";
      game.lock = false;
      game.ended = false;
      updateMeta();
      renderGrid();
    }

    function finishRound() {
      if (game.scores.her > game.scores.him) {
        game.ended = true;
        nodes.hintText.textContent = "Pobijedila si — idemo dalje! ❤️";
        updateMeta();
        renderGrid();
        scheduleNextStep();
        return;
      }
      nodes.hintText.textContent =
        "Ova runda nije tvoja pobjeda — igramo ponovo od nule.";
      setTimeout(() => {
        resetRound();
        nodes.hintText.textContent = "Nova runda — ti prva biraš.";
      }, STEP_PAUSE_AFTER_MS);
    }

    function onPick(idx) {
      if (game.lock || game.ended) return;
      if (game.matched.has(idx) || game.flipped.includes(idx)) return;
      if (game.flipped.length >= 2) return;

      game.flipped.push(idx);
      updateMeta();
      renderGrid();

      if (game.flipped.length < 2) return;

      const [a, b] = game.flipped;
      const pa = game.deck[a].pairId;
      const pb = game.deck[b].pairId;

      if (pa === pb) {
        game.matched.add(a);
        game.matched.add(b);
        game.flipped = [];
        game.scores[game.currentPlayer] += 1;
        nodes.hintText.textContent =
          game.currentPlayer === "her"
            ? "Par! Još jedan potez tebi."
            : "Par! Još jedan potez meni.";
        if (game.matched.size === 16) {
          finishRound();
        } else {
          updateMeta();
          renderGrid();
        }
        return;
      }

      game.lock = true;
      setTimeout(() => {
        game.flipped = [];
        game.currentPlayer = game.currentPlayer === "her" ? "him" : "her";
        game.lock = false;
        nodes.hintText.textContent =
          game.currentPlayer === "her"
            ? "Nije par — sada si ti na redu."
            : "Nije par — sada sam ja na redu.";
        updateMeta();
        renderGrid();
      }, 900);
    }

    game.deck = buildDeckFromUrls(game.urls);
    updateMeta();
    renderGrid();
  })();
}

function parseMaze(lines) {
  const rows = lines.length;
  const cols = lines[0].length;
  let start = { r: 0, c: 0 };
  let goal = { r: 0, c: 0 };
  const grid = [];

  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      const ch = lines[r][c];
      if (ch === "S") {
        start = { r, c };
        row.push(".");
      } else if (ch === "G") {
        goal = { r, c };
        row.push(".");
      } else {
        row.push(ch);
      }
    }
    grid.push(row);
  }
  return { grid, rows, cols, start, goal };
}

function renderMazeStep() {
  const mazeLines = generateMazeLines(31, 27);
  const { grid, rows, cols, start, goal } = parseMaze(mazeLines);
  let pr = start.r;
  let pc = start.c;
  let mazeFinished = false;

  const wrap = document.createElement("div");
  wrap.className = "maze-step";

  const sub = document.createElement("p");
  sub.className = "step-inline-hint";
  sub.textContent =
    "Ima puno hodnika, požuri nađi put do mede kako ne bi bio tužan...";
  wrap.appendChild(sub);

  const viewport = document.createElement("div");
  viewport.className = "maze-viewport";

  const gridEl = document.createElement("div");
  gridEl.className = "maze-grid";
  gridEl.style.setProperty("--maze-cols", String(cols));
  gridEl.style.setProperty("--maze-rows", String(rows));
  gridEl.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  gridEl.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;

  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = document.createElement("div");
      cell.className = "maze-cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      const ch = grid[r][c];
      if (ch === "#") {
        cell.classList.add("maze-wall");
      } else {
        cell.classList.add("maze-path");
        if (r === goal.r && c === goal.c) {
          cell.classList.add("maze-goal");
        }
        const icon = document.createElement("span");
        icon.className = "maze-cell-icon";
        icon.setAttribute("aria-hidden", "true");
        cell.appendChild(icon);
      }
      cells.push(cell);
      gridEl.appendChild(cell);
    }
  }

  function redrawMazeActors() {
    cells.forEach((el) => {
      const r = Number(el.dataset.r);
      const c = Number(el.dataset.c);
      const icon = el.querySelector(".maze-cell-icon");
      if (!icon) return;
      if (r === pr && c === pc) {
        icon.textContent = "🧸";
      } else if (r === goal.r && c === goal.c) {
        icon.textContent = "🐻";
      } else {
        icon.textContent = "";
      }
    });
  }

  function tryMove(dr, dc) {
    if (mazeFinished) return;
    const nr = pr + dr;
    const nc = pc + dc;
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return;
    if (grid[nr][nc] === "#") return;
    pr = nr;
    pc = nc;
    redrawMazeActors();
    if (pr === goal.r && pc === goal.c) {
      mazeFinished = true;
      nodes.hintText.textContent = "Bravo — djevočica je stigala do mede! 🎉";
      pulseSuccess();
      scheduleNextStep();
    }
  }

  const controls = document.createElement("div");
  controls.className = "maze-controls";
  controls.innerHTML = `
    <button type="button" class="maze-dir maze-up" data-dr="-1" data-dc="0" aria-label="Gore">▲</button>
    <div class="maze-mid-row">
      <button type="button" class="maze-dir" data-dr="0" data-dc="-1" aria-label="Lijevo">◀</button>
      <button type="button" class="maze-dir" data-dr="0" data-dc="1" aria-label="Desno">▶</button>
    </div>
    <button type="button" class="maze-dir maze-down" data-dr="1" data-dc="0" aria-label="Dolje">▼</button>
  `;
  controls.querySelectorAll(".maze-dir").forEach((btn) => {
    btn.addEventListener("click", () => {
      tryMove(Number(btn.dataset.dr), Number(btn.dataset.dc));
    });
  });

  viewport.appendChild(gridEl);
  wrap.appendChild(viewport);
  wrap.appendChild(controls);
  nodes.stepContent.appendChild(wrap);

  redrawMazeActors();

  function onKey(e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      tryMove(-1, 0);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      tryMove(1, 0);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      tryMove(0, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      tryMove(0, 1);
    }
  }
  window.addEventListener("keydown", onKey);
  state._mazeKeyHandler = onKey;
}

function drawImageSquareCover(ctx, img, size) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const side = Math.min(iw, ih);
  const sx = (iw - side) / 2;
  const sy = (ih - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
}

function mountPuzzleGrid(dataUrl, rootEl) {
  rootEl.innerHTML = "";
  const n = PUZZLE_GRID;
  const board = document.createElement("div");
  board.className = "puzzle-board";
  board.id = "puzzleBoard";
  board.style.setProperty("--puzzle-n", String(n));

  for (let i = 0; i < n * n; i += 1) {
    const slot = document.createElement("div");
    slot.className = "puzzle-slot";
    slot.dataset.idx = String(i);
    board.appendChild(slot);
  }

  const pool = document.createElement("div");
  pool.className = "puzzle-pool";
  pool.id = "puzzlePool";
  pool.style.setProperty("--puzzle-n", String(n));

  const row = (idx) => Math.floor(idx / n);
  const col = (idx) => idx % n;
  const pieces = [];
  for (let i = 0; i < n * n; i += 1) {
    const wrap = document.createElement("div");
    wrap.className = "puzzle-piece-wrap";
    wrap.dataset.idx = String(i);
    const inner = document.createElement("div");
    inner.className = "puzzle-piece-inner";
    inner.style.backgroundImage = `url("${dataUrl}")`;
    inner.style.backgroundSize = `${n * 100}% ${n * 100}%`;
    inner.style.backgroundPosition = `${(col(i) / (n - 1)) * 100}% ${(row(i) / (n - 1)) * 100}%`;
    wrap.appendChild(inner);
    pieces.push(wrap);
    attachPuzzlePieceDrag(wrap, pool, board, n);
  }

  shuffleInPlace(pieces);
  pieces.forEach((p) => pool.appendChild(p));

  rootEl.appendChild(board);
  rootEl.appendChild(pool);
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function attachPuzzlePieceDrag(wrap, pool, board, n) {
  let drag = null;

  wrap.addEventListener("pointerdown", (e) => {
    if (wrap.classList.contains("locked")) return;
    if (e.button !== 0) return;
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    drag = {
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add("dragging");
    wrap.style.position = "fixed";
    wrap.style.width = `${rect.width}px`;
    wrap.style.height = `${rect.height}px`;
    wrap.style.left = `${rect.left}px`;
    wrap.style.top = `${rect.top}px`;
    wrap.style.zIndex = "60";
    wrap.style.touchAction = "none";
  });

  wrap.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    wrap.style.left = `${e.clientX - drag.offsetX}px`;
    wrap.style.top = `${e.clientY - drag.offsetY}px`;
  });

  const finishWrong = () => {
    pool.appendChild(wrap);
    wrap.classList.remove("dragging");
    wrap.style.position = "";
    wrap.style.left = "";
    wrap.style.top = "";
    wrap.style.width = "";
    wrap.style.height = "";
    wrap.style.zIndex = "";
    nodes.hintText.textContent = "Nije tu — probaj drugo mjesto 💕";
    drag = null;
  };

  const finishRight = (slot) => {
    slot.classList.add("filled");
    wrap.classList.remove("dragging");
    wrap.classList.add("locked");
    wrap.style.position = "absolute";
    wrap.style.left = "0";
    wrap.style.top = "0";
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.zIndex = "1";
    slot.appendChild(wrap);
    drag = null;

    const placed = board.querySelectorAll(".puzzle-slot.filled").length;
    if (placed >= n * n) {
      nodes.hintText.textContent = "Bravo! Puzzle je složen 🎉";
      pulseSuccess();
      scheduleNextStep();
    } else {
      nodes.hintText.textContent = `Super — još ${n * n - placed} pločica.`;
    }
  };

  wrap.addEventListener("pointerup", (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    try {
      wrap.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    wrap.style.visibility = "hidden";
    const under = document.elementsFromPoint(e.clientX, e.clientY);
    wrap.style.visibility = "";

    const slot = under.find((el) => el.classList && el.classList.contains("puzzle-slot"));

    if (slot && !slot.classList.contains("filled")) {
      const want = slot.dataset.idx;
      const have = wrap.dataset.idx;
      if (want === have) {
        finishRight(slot);
        return;
      }
    }
    finishWrong();
  });

  wrap.addEventListener("pointercancel", () => {
    if (!drag) return;
    try {
      wrap.releasePointerCapture(drag.pointerId);
    } catch {
      /* ignore */
    }
    finishWrong();
  });
}

function renderPuzzleStep() {
  const root = document.createElement("div");
  root.className = "puzzle-step";

  const intro = document.createElement("p");
  intro.className = "puzzle-intro";
  intro.textContent = "Povuci pločice na prazna mjesta.";
  root.appendChild(intro);

  const mountHost = document.createElement("div");
  mountHost.className = "puzzle-mount";
  mountHost.id = "puzzleMount";
  root.appendChild(mountHost);
  nodes.stepContent.appendChild(root);

  const preset = new Image();
  preset.onload = () => {
    const canvas = document.createElement("canvas");
    const px = PUZZLE_EXPORT_PX;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    drawImageSquareCover(ctx, preset, px);
    mountPuzzleGrid(canvas.toDataURL("image/jpeg", 0.88), mountHost);
    nodes.hintText.textContent = "Srećno slaganje!";
  };
  preset.onerror = () => {
    nodes.hintText.textContent =
      "Nedostaje gift-puzzle.jpg u istom folderu kao stranica — dodaj sliku i osvježi.";
  };
  preset.src = "./gift-puzzle.jpg";
}

function renderRateQuiz() {
  const row = document.createElement("div");
  row.className = "rate-row";

  for (let n = 1; n <= 10; n += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rate-btn";
    btn.textContent = String(n);
    btn.addEventListener("click", () => {
      row.querySelectorAll(".rate-btn").forEach((b) => {
        b.disabled = true;
      });
      if (n === 10) {
        nodes.hintText.textContent = "Samo si ti 10 od 10..";
      } else {
        nodes.hintText.textContent = "Svakako si samo ti 10 od 10";
      }
      scheduleNextStep();
    });
    row.appendChild(btn);
  }

  nodes.stepContent.appendChild(row);
}

function setProgress(percent) {
  const w = `${percent}%`;
  nodes.progressFill.style.width = w;
  if (nodes.stepGoalFill) {
    nodes.stepGoalFill.style.width = w;
  }
}

function updateGiftDistance(stepCount) {
  const scale = 0.55 + stepCount * 0.08;
  const rise = 22 - stepCount * 2.5;
  nodes.giftVisual.style.transform = `translateY(${rise}px) scale(${Math.min(scale, 1.35)})`;
}

function pulseSuccess() {
  nodes.stepCard.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.03)" },
      { transform: "scale(1)" },
    ],
    { duration: 350, easing: "ease-out" }
  );
}

function revealGift() {
  nodes.bigReveal.classList.remove("hidden");
  nodes.finalHeadline.textContent =
    "";
  runConfetti();
}

function createFloatingHearts() {
  setInterval(() => {
    const heart = document.createElement("span");
    heart.className = "float-heart";
    heart.textContent = "❤";
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.animationDuration = `${7 + Math.random() * 6}s`;
    nodes.bgHearts.appendChild(heart);
    setTimeout(() => heart.remove(), 13000);
  }, 850);
}

function runConfetti() {
  const canvas = nodes.confettiCanvas;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);

  const pieces = Array.from({ length: 130 }, () => ({
    x: Math.random() * width,
    y: -Math.random() * height,
    size: 4 + Math.random() * 6,
    speedY: 1.2 + Math.random() * 3.2,
    speedX: -1 + Math.random() * 2,
    color: ["#ff76ad", "#ffd166", "#b8f2e6", "#f4a9c4"][Math.floor(Math.random() * 4)],
  }));

  let frames = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    pieces.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y > height) p.y = -10;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size * 1.4);
    });
    frames += 1;
    if (frames < 220) requestAnimationFrame(draw);
  }
  draw();
}

init();
