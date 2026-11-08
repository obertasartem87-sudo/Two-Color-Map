/* Нескінченна генерація світів і рівнів.
   Світ 1 — пробний: 1 рівень, поле 2×2. Далі кожен світ має 10 рівнів; по 5 світів на кожен розмір поля: світи 2–6 = 3×3, 7–11 = 4×4, 12–16 = 5×5 і так до нескінченності. */
window.TCM = window.TCM || {};
(function (T) {
  const PER = 10, WORLDS_PER_SIZE = 5, KEY = "tcm_progress_v1";
  T.worldInfo = function (n) {
    if (n === 1) return { n: 1, name: "Пробний світ", levels: 1, size: 2, first: 1 };
    return { n, name: "Світ " + n, levels: PER, size: 3 + Math.floor((n - 2) / WORLDS_PER_SIZE), first: 2 + (n - 2) * PER };
  };
  T.levelConfig = function (w, l) {
    const i = T.worldInfo(w);
    return { world: w, level: l, size: i.size, seed: `w${w}-l${l}`,
      silverMs: i.size * i.size * 8000, goldMs: i.size * i.size * 4000 }; /* орієнтовні пороги — відкалібруй після тестів */
  };
  T.starsFor = (cfg, ms) => ms <= cfg.goldMs ? 3 : ms <= cfg.silverMs ? 2 : 1;

  T.progress = {}; /* підставляється профілем із js/store.js */
  T.saveProgress = function () {
    if (window.TCMStore) window.TCMStore.persist();
    window.dispatchEvent(new Event("tcm:progress"));
  };
  T.mergeProgress = function (remote) {
    Object.entries(remote || {}).forEach(([k, r]) => {
      const m = T.progress[k];
      if (!m) T.progress[k] = r;
      else T.progress[k] = { stars: Math.max(m.stars, r.stars), ms: Math.min(m.ms, r.ms) };
    });
    T.saveProgress();
  };
  T.totals = function () {
    const v = Object.values(T.progress);
    return { levels: v.length, stars: v.reduce((s, r) => s + r.stars, 0), best: v.length ? Math.min(...v.map(r => r.ms)) : null };
  };
  T.isDone = (w, l) => !!T.progress[`${w}-${l}`];
  T.worldDone = w => { const n = T.worldInfo(w).levels; for (let l = 1; l <= n; l++) if (!T.isDone(w, l)) return false; return true; };
  T.isWorldUnlocked = w => w === 1 || T.worldDone(w - 1);
  T.isLevelUnlocked = (w, l) => T.isWorldUnlocked(w) && (l === 1 || T.isDone(w, l - 1));

  /* Виклич це з механіки головоломки, коли гравець правильно розв'язав рівень. */
  T.completeLevel = function (w, l, elapsedMs) {
    const cfg = T.levelConfig(w, l), stars = T.starsFor(cfg, elapsedMs), k = `${w}-${l}`, old = T.progress[k];
    T.progress[k] = { stars: Math.max(stars, old ? old.stars : 0), ms: Math.min(elapsedMs, old ? old.ms : Infinity) };
    T.saveProgress();
    return stars;
  };
})(window.TCM);
