/* Рейтинги профілів на цьому пристрої (дані з js/store.js). */
(function () {
  const T = window.TCM, esc = T.esc;
  const meta = {
    progress: { title: "Найбільше пройдених рівнів", fmt: v => T.t("{v} рівнів", { v }) },
    stars: { title: "Найбільше зібраних зірок", fmt: v => `${v} ★` },
    speed: { title: "Найкращий час проходження", fmt: v => { const s = Math.round(v / 1000); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); } },
    tournament: { title: "Рейтинг матчів", fmt: v => String(v) }
  };
  let current = "progress";
  window.renderTCMLeaderboard = function (type) {
    current = meta[type] ? type : "progress";
    const m = meta[current], rows = window.TCMStore.leaderboard(current);
    document.getElementById("rating-heading").textContent = T.t(m.title);
    document.getElementById("rating-table").innerHTML = rows.length
      ? rows.map((r, i) => `<div class="leader-row"><span class="rank">#${i + 1}</span><span class="leader-name">${esc(r.username)}</span><span class="leader-value">${esc(m.fmt(r.value))}</span></div>`).join("")
      : `<div class="empty">${T.t("Поки що немає результатів. Пройди рівень або зіграй матч!")}</div>`;
  };
  window.addEventListener("tcm:progress", () => window.renderTCMLeaderboard(current));
  window.addEventListener("tcm:lang", () => window.renderTCMLeaderboard(current));
})();
