/* Матчі «за одним пристроєм» (гравці грають по черзі ту саму головоломку) і локальні турніри. */
(function (T, S) {
  T.runMatch = async function ({ a, b, puzzles, size, seed }) {
    const sc = { [a]: { stars: 0, ms: 0 }, [b]: { stars: 0, ms: 0 } };
    for (const p of [a, b]) for (let i = 0; i < puzzles; i++) {
      const last = i === puzzles - 1, label = p === b && last ? T.t("Показати результат") : last ? T.t("Передати пристрій → {b}", { b }) : T.t("Далі");
      const r = await T.play(T.customConfig(size, `${seed}-${i}`), { title: T.t("{p} · задача {i} із {n}", { p, i: i + 1, n: puzzles }), info: T.t("Поле {s}×{s}", { s: size }), nextLabel: label });
      if (!r) return null; sc[p].stars += r.stars; sc[p].ms += r.ms;
    }
    const A = sc[a], B = sc[b]; let w = null;
    if (A.stars !== B.stars) w = A.stars > B.stars ? a : b; else if (A.ms !== B.ms) w = A.ms < B.ms ? a : b;
    S.recordMatch(a, b, w); return { winner: w, scores: sc };
  };

  const shuffle = (arr, r) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  function pairUp(list) { const out = []; for (let i = 0; i < list.length; i += 2) { const m = { a: list[i], b: list[i + 1], w: null }; if (m.b === null) m.w = m.a; out.push(m); } return out; }
  T.standings = t => { const w = {}; t.players.forEach(p => w[p] = 0); t.rounds.flat().forEach(m => { if (m.w) w[m.w]++; });
    return Object.entries(w).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])); };
  function advance(t) {
    for (;;) {
      const cur = t.rounds[t.rounds.length - 1];
      if (cur.some(m => !m.w)) return;
      if (t.format === "round_robin") { t.status = "completed"; t.champion = T.standings(t)[0][0]; return; }
      const win = cur.map(m => m.w);
      if (win.length === 1) { t.status = "completed"; t.champion = win[0]; return; }
      t.rounds.push(pairUp(win));
    }
  }
  T.createTournament = function ({ title, format, size, players }) {
    const id = Date.now().toString(36), t = { id, title, format, size, players, status: "live", champion: null, rounds: [] };
    if (format === "round_robin") { const ms = []; for (let i = 0; i < players.length; i++) for (let j = i + 1; j < players.length; j++) ms.push({ a: players[i], b: players[j], w: null }); t.rounds.push(ms); }
    else { const pl = shuffle([...players], Math.random), pow = 1 << Math.ceil(Math.log2(pl.length)), half = pow / 2, slots = Array(pow).fill(null);
      for (let i = 0; i < half; i++) slots[2 * i] = pl[i]; for (let j = 0; j < half; j++) slots[2 * j + 1] = pl[half + j] ?? null;
      t.rounds.push(pairUp(slots)); }
    advance(t); S.data.tournaments.unshift(t); S.persist(); return t;
  };
  T.playTournamentMatch = async function (id, ri, mi) {
    const t = S.data.tournaments.find(x => x.id === id), m = t && t.rounds[ri] && t.rounds[ri][mi];
    if (!m || m.w || t.status === "completed") return;
    const res = await T.runMatch({ a: m.a, b: m.b, puzzles: 1, size: t.size, seed: `t${t.id}-${ri}-${mi}` });
    if (!res) return; m.w = res.winner || m.a; advance(t); S.persist(); window.dispatchEvent(new Event("tcm:tournaments"));
  };
})(window.TCM, window.TCMStore);
