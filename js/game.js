/* «Двоколірна карта» — механіка перенесена з оригінальної гри.
   Заповни поле N×N клітинками R (червоний) та B (синій). Правила:
   1) у кожному стовпці є і R, і B; 2) усі R утворюють одну зв'язну групу; 3) усі B — так само;
   4) немає квадрата 2×2 одного кольору. Клік по клітинці: порожньо → R → B → порожньо. */
(function (T) {
  const $ = id => document.getElementById(id);
  const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  const G = { undo:"Назад", reset:"Скинути", checkBtn:"Перевірити", promptFill:"Розфарбуй карту та натисни «Перевірити»!",
    fillError:"Будь ласка, заповни всі клітинки!", successFeedback:"Вітаємо! Всі правила виконані правильно!", failFeedback:"Знайдено помилки. Зверни увагу на підсвічені підказки!" };
  const tr = k => T.t(G[k]);

  let ac = null;
  function sound(type) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.connect(g); g.connect(ac.destination);
      if (type === "click") { o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(600, t + .05); g.gain.setValueAtTime(.15, t); g.gain.exponentialRampToValueAtTime(.01, t + .05); o.start(t); o.stop(t + .05); }
      else if (type === "win") { [523.25, 659.25, 783.99].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * .1)); g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.01, t + .4); o.start(t); o.stop(t + .4); }
      else { o.frequency.setValueAtTime(220, t); o.frequency.setValueAtTime(180, t + .15); g.gain.setValueAtTime(.2, t); g.gain.exponentialRampToValueAtTime(.01, t + .3); o.start(t); o.stop(t + .3); }
    } catch (e) {}
  }

  /* Перевірка правил. grid — масив рядків символів "", "R", "B". bad — індекси клітинок для підсвічування. */
  T.validate = function (grid) {
    const S = grid.length, bad = new Set(), idx = (r, c) => r * S + c;
    let r1 = true, r4 = true;
    for (let c = 0; c < S; c++) { let R = false, B = false; for (let r = 0; r < S; r++) { if (grid[r][c] === "R") R = true; if (grid[r][c] === "B") B = true; }
      if (!R || !B) { r1 = false; for (let r = 0; r < S; r++) bad.add(idx(r, c)); } }
    const conn = col => {
      const cells = []; for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) if (grid[r][c] === col) cells.push([r, c]);
      if (!cells.length) return false;
      const seen = new Set([idx(...cells[0])]), q = [cells[0]];
      while (q.length) { const [r, c] = q.shift(); [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => { const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < S && nc >= 0 && nc < S && grid[nr][nc] === col && !seen.has(idx(nr, nc))) { seen.add(idx(nr, nc)); q.push([nr, nc]); } }); }
      cells.forEach(([r, c]) => { if (!seen.has(idx(r, c))) bad.add(idx(r, c)); });
      return seen.size === cells.length;
    };
    const r2 = conn("R"), r3 = conn("B");
    for (let r = 0; r < S - 1; r++) for (let c = 0; c < S - 1; c++) { const v = grid[r][c];
      if (v && v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) { r4 = false; [[r,c],[r,c+1],[r+1,c],[r+1,c+1]].forEach(p => bad.add(idx(...p))); } }
    return { r1, r2, r3, r4, ok: r1 && r2 && r3 && r4, bad };
  };

  T.customConfig = (size, seed) => ({ size, seed, silverMs: size * size * 8000, goldMs: size * size * 4000 });

  T.play = function (cfg, o = {}) {
    return new Promise(resolve => {
      const S = cfg.size; let grid, hist = [], moves = 0, t0 = 0, timer = null, done = false, result = null, inv = new Set();
      const blank = () => Array.from({ length: S }, () => Array(S).fill(""));
      grid = blank();
      $("gm-title").textContent = o.title || T.t("Рівень"); $("gm-info").textContent = o.info || "";
      $("gm-moves").textContent = "0"; $("gm-timer").textContent = "0:00"; $("gm-win").hidden = true; $("gm-next").hidden = true; $("gm-next").textContent = o.nextLabel || "OK";
      const board = $("gm-grid"); board.style.gridTemplateColumns = `repeat(${S},minmax(0,1fr))`;
      board.innerHTML = Array.from({ length: S * S }, () => `<button class="cell u">—</button>`).join("");
      const cells = [...board.children];
      const paint = flip => cells.forEach((b, i) => { const v = grid[(i / S) | 0][i % S];
        b.className = `cell ${v === "R" ? "cR" : v === "B" ? "cB" : "u"}${inv.has(i) ? " inv" : ""}${flip === i ? " flip" : ""}`; b.textContent = v || "—"; });
      const ruleUI = res => ["r1", "r2", "r3", "r4"].forEach((k, i) => { const el = $("gm-" + k); el.className = "rule-card" + (res ? (res[k] ? " ok" : " no") : ""); el.querySelector(".ri").textContent = res ? (res[k] ? "✓" : "✕") : "–"; });
      const feedback = (txt, cls) => { const f = $("gm-feedback"); f.textContent = txt; f.className = "feedback " + (cls || ""); };
      const resetUI = () => { ruleUI(null); feedback(tr("promptFill")); };
      resetUI(); paint();
      const close = () => { clearInterval(timer); $("game-modal").hidden = true; };
      board.onclick = e => { const b = e.target.closest(".cell"); if (!b || done) return; const i = cells.indexOf(b), r = (i / S) | 0, c = i % S;
        if (!t0) { t0 = Date.now(); timer = setInterval(() => { $("gm-timer").textContent = fmt(Date.now() - t0); }, 250); }
        sound("click"); hist.push(grid.map(x => x.slice())); grid[r][c] = grid[r][c] === "" ? "R" : grid[r][c] === "R" ? "B" : "";
        moves++; $("gm-moves").textContent = moves; inv.clear(); paint(i); };
      $("gm-undo").onclick = () => { if (done || !hist.length) return; sound("click"); grid = hist.pop(); inv.clear(); paint(); };
      $("gm-reset").onclick = () => { if (done) return; sound("click"); grid = blank(); hist = []; inv.clear(); paint(); resetUI(); };
      $("gm-check").onclick = () => {
        if (done) return; inv.clear();
        if (!grid.every(row => row.every(v => v))) { sound("fail"); feedback(tr("fillError"), "warn"); paint(); return; }
        const res = T.validate(grid); res.bad.forEach(i => inv.add(i)); ruleUI(res); paint();
        if (!res.ok) { sound("fail"); feedback(tr("failFeedback"), "bad"); return; }
        done = true; clearInterval(timer); const ms = Math.max(1, Date.now() - t0), stars = T.starsFor(cfg, ms); result = { ms, stars, moves };
        sound("win"); feedback(tr("successFeedback"), "good"); $("gm-timer").textContent = fmt(ms);
        $("gm-win-stars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars); $("gm-win-time").textContent = `${fmt(ms)} · 👣 ${moves}`;
        setTimeout(() => { if (window.confetti) window.confetti({ particleCount: 120, spread: 80, origin: { y: .6 } }); $("gm-win").hidden = false; $("gm-next").hidden = false; }, 350);
      };
      $("gm-next").onclick = () => { close(); resolve(result); };
      $("gm-cancel").onclick = () => { close(); resolve(done ? result : null); };
      $("game-modal").hidden = false;
    });
  };
  T.startLevel = async function (cfg) {
    const r = await T.play(cfg, { title: T.t("Світ {w} · рівень {l}", { w: cfg.world, l: cfg.level }), info: T.t("Поле {s}×{s}", { s: cfg.size }), nextLabel: T.t("Зберегти результат") });
    if (r) T.completeLevel(cfg.world, cfg.level, r.ms);
  };
})(window.TCM);
