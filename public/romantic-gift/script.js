const TOTAL_STEPS = 8;
const PUZZLE_GRID = 5;
const PUZZLE_EXPORT_PX = 500;

const state = {
  currentStep: 0,
  musicOn: false,
  audioContext: null,
  musicTimer: null,
  puzzleObjectUrl: null,
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
  musicBtn: document.getElementById("musicBtn"),
  bgHearts: document.getElementById("bgHearts"),
};

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
    title: "Pored tebe se osjećam: (odaberi oba tačna odgovora)",
    message: () => "",
    render: renderQFeelBeside,
  },
  {
    title: "Pomozi 🧸 medu da stigne do 🐻",
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
  nodes.musicBtn.addEventListener("click", toggleMusic);

  createFloatingHearts();
  setProgress(0);
  updateGiftDistance(0);
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
        setTimeout(moveToNextStep, 500);
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
        nodes.hintText.textContent = "Tako je — sve to i još više ❤️";
        setTimeout(moveToNextStep, 500);
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
      setTimeout(moveToNextStep, 500);
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
        setTimeout(moveToNextStep, 500);
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
      setTimeout(moveToNextStep, 550);
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
    "Ima puno hodnika i ćorsokaka — možeš zalutati pa se vratiti. Strelice ili dugmad ispod.";
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
      nodes.hintText.textContent = "Bravo — medo je stigao do mede! 🎉";
      pulseSuccess();
      setTimeout(moveToNextStep, 700);
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

function revokePuzzleUrl() {
  if (state.puzzleObjectUrl) {
    URL.revokeObjectURL(state.puzzleObjectUrl);
    state.puzzleObjectUrl = null;
  }
}

function makeDemoPuzzleDataUrl() {
  const size = PUZZLE_EXPORT_PX;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#ffe4ef");
  g.addColorStop(0.5, "#ffc9e0");
  g.addColorStop(1, "#ff9ec8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      8 + Math.random() * 18,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.fillStyle = "#c66087";
  const fs = Math.round(size * 0.07);
  ctx.font = `bold ${fs}px Quicksand, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("❤", size / 2, size / 2 - fs * 0.6);
  ctx.font = `600 ${Math.round(fs * 0.55)}px Quicksand, sans-serif`;
  ctx.fillText("Naša slika", size / 2, size / 2 + fs * 0.75);
  return c.toDataURL("image/png");
}

function drawImageSquareCover(ctx, img, size) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const side = Math.min(iw, ih);
  const sx = (iw - side) / 2;
  const sy = (ih - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
}

function buildPuzzleFromImageUrl(imageUrl, rootEl, loadId, getActiveLoadId) {
  const img = new Image();
  img.onload = () => {
    if (getActiveLoadId && loadId !== getActiveLoadId()) return;
    const size = PUZZLE_EXPORT_PX;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    drawImageSquareCover(ctx, img, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    if (getActiveLoadId && loadId !== getActiveLoadId()) return;
    mountPuzzleGrid(dataUrl, rootEl);
  };
  img.onerror = () => {
    if (getActiveLoadId && loadId !== getActiveLoadId()) return;
    nodes.hintText.textContent = "Ne mogu učitati sliku. Probaj drugu ili demo.";
  };
  img.src = imageUrl;
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
      setTimeout(moveToNextStep, 900);
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

  const loadSession = { id: 0 };
  const bumpLoad = () => {
    loadSession.id += 1;
    return loadSession.id;
  };
  const getLoadId = () => loadSession.id;

  const intro = document.createElement("p");
  intro.className = "puzzle-intro";
  intro.innerHTML =
    "Učitaj fotografiju ili odaberi <strong>demo</strong> — pločice povlači prstom ili mišem.";

  const controls = document.createElement("div");
  controls.className = "puzzle-controls";

  const fileLabel = document.createElement("label");
  fileLabel.className = "puzzle-file-label";
  fileLabel.textContent = "Učitaj sliku";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.className = "puzzle-file-input";
  fileInput.id = "puzzleFileInput";
  fileLabel.setAttribute("for", "puzzleFileInput");

  const demoBtn = document.createElement("button");
  demoBtn.type = "button";
  demoBtn.className = "secondary-btn puzzle-demo-btn";
  demoBtn.textContent = "Demo puzzle (bez slike)";

  const mountHost = document.createElement("div");
  mountHost.className = "puzzle-mount";
  mountHost.id = "puzzleMount";

  controls.appendChild(fileLabel);
  controls.appendChild(fileInput);
  controls.appendChild(demoBtn);

  root.appendChild(intro);
  root.appendChild(controls);
  root.appendChild(mountHost);
  nodes.stepContent.appendChild(root);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const lid = bumpLoad();
    revokePuzzleUrl();
    state.puzzleObjectUrl = URL.createObjectURL(file);
    buildPuzzleFromImageUrl(state.puzzleObjectUrl, mountHost, lid, getLoadId);
    nodes.hintText.textContent = "Puzzle je spreman — srećno slaganje!";
  });

  demoBtn.addEventListener("click", () => {
    bumpLoad();
    revokePuzzleUrl();
    fileInput.value = "";
    mountPuzzleGrid(makeDemoPuzzleDataUrl(), mountHost);
    nodes.hintText.textContent = "Demo slika — povuci pločice na mrežu.";
  });

  const presetId = loadSession.id;
  const preset = new Image();
  preset.onload = () => {
    if (presetId !== loadSession.id) return;
    const canvas = document.createElement("canvas");
    const px = PUZZLE_EXPORT_PX;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d");
    drawImageSquareCover(ctx, preset, px);
    if (presetId !== loadSession.id) return;
    mountPuzzleGrid(canvas.toDataURL("image/jpeg", 0.88), mountHost);
    nodes.hintText.textContent =
      "Koristi se slika gift-puzzle.jpg. Možeš je zamijeniti učitavanjem.";
  };
  preset.onerror = () => {
    if (presetId !== loadSession.id) return;
    mountPuzzleGrid(makeDemoPuzzleDataUrl(), mountHost);
    nodes.hintText.textContent =
      "Nema gift-puzzle.jpg — demo. Učitaj svoju sliku ili ostavi demo.";
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
      setTimeout(moveToNextStep, 1100);
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
    "Ovaj poklon je moje srce i sva moja ljubav prema tebi.";
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

function toggleMusic() {
  state.musicOn = !state.musicOn;
  nodes.musicBtn.textContent = `Muzika: ${state.musicOn ? "uključena" : "isključena"}`;

  if (!state.audioContext) {
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (state.musicOn) {
    playSoftLoop();
  } else {
    clearInterval(state.musicTimer);
  }
}

function playSoftLoop() {
  const notes = [261.63, 329.63, 392, 329.63];
  let idx = 0;
  clearInterval(state.musicTimer);

  state.musicTimer = setInterval(() => {
    if (!state.musicOn) return;
    const osc = state.audioContext.createOscillator();
    const gain = state.audioContext.createGain();
    osc.type = "sine";
    osc.frequency.value = notes[idx % notes.length];
    gain.gain.value = 0.0001;
    gain.gain.exponentialRampToValueAtTime(0.05, state.audioContext.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, state.audioContext.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(state.audioContext.destination);
    osc.start();
    osc.stop(state.audioContext.currentTime + 0.62);
    idx += 1;
  }, 650);
}

init();
