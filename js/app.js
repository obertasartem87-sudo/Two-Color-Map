(() => {
  const T = window.TCM, S = window.TCMStore, esc = T.esc; let curPage = "home", authTab = "login";
  const pages = ["home","game","ratings","competitions","tournaments","profile"];
  const eyebrows = {home:"ІГРОВА ПЛАТФОРМА",game:"ОДИНОЧНА ГРА",ratings:"ТАБЛИЦІ ЛІДЕРІВ",competitions:"ГРАЙ РАЗОМ",tournaments:"ВЕЛИКІ ПОДІЇ",profile:"ОСОБИСТИЙ КАБІНЕТ"};
  const titles = {home:"Твоя карта пригод",game:"Світи та рівні",ratings:"Рейтинги гравців",competitions:"Змагання",tournaments:"Турніри та чемпіонати",profile:"Профіль гравця"};
  const $ = id => document.getElementById(id), toast = $("toast");
  const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  function notify(m) { toast.textContent = m; toast.classList.add("show"); clearTimeout(notify.t); notify.t = setTimeout(() => toast.classList.remove("show"), 3200); }
  function showPage(p) {
    if (!pages.includes(p)) return;
    pages.forEach(n => $(`page-${n}`).classList.toggle("active", n === p));
    document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === p));
    curPage = p; $("page-title").textContent = T.t(titles[p]); $("page-eyebrow").textContent = T.t(eyebrows[p]); window.scrollTo({top:0,behavior:"smooth"});
  }

  /* Нескінченний список світів */
  let shown = 0; const BATCH = 6, arts = ["blue-world","violet-world","orange-world"];
  function worldCard(n) {
    const i = T.worldInfo(n), open = T.isWorldUnlocked(n), done = T.worldDone(n); let earned = 0;
    for (let l = 1; l <= i.levels; l++) { const r = T.progress[`${n}-${l}`]; if (r) earned += r.stars; }
    const btns = Array.from({length:i.levels}, (_, k) => k + 1).map(l => `<button class="level-btn ${T.isDone(n,l)?"done":""}" data-play="${n}-${l}" ${T.isLevelUnlocked(n,l)?"":"disabled"}>${l}</button>`).join("");
    const range = i.levels === 1 ? T.t("1 рівень") : T.t("Рівні {a}–{b}", { a: i.first, b: i.first + i.levels - 1 });
    return `<article class="world-card"><div class="world-art ${arts[(n-1)%3]}">${String(n).padStart(2,"0")}</div><span class="pill ${open?"green-pill":""}">${T.t(done?"ПРОЙДЕНО":open?"ВІДКРИТО":"ЗАБЛОКОВАНО")}</span><h3>${n === 1 ? T.t("Пробний світ") : T.t("Світ {n}", { n })}</h3><p>${range} · ${T.t("Поле {s}×{s}", { s: i.size })}</p><div class="world-stars">${"★".repeat(earned)}${"☆".repeat(i.levels*3-earned)}</div><div class="level-row">${btns}</div></article>`;
  }
  function renderWorlds(reset) {
    const g = $("world-grid"), target = reset ? Math.max(shown, BATCH) : shown + BATCH;
    if (reset) { g.innerHTML = ""; shown = 0; }
    while (shown < target) { shown++; g.insertAdjacentHTML("beforeend", worldCard(shown)); }
  }
  function renderStats() {
    const t = T.totals(), p = S.profile();
    $("stat-levels").firstChild.textContent = t.levels + " "; $("stat-stars").firstChild.textContent = t.stars + " ";
    $("stat-best").textContent = t.best ? fmt(t.best) : "—"; $("stat-best-sub").textContent = T.t(t.best ? "Твій рекорд" : "Пройди перший рівень");
    $("p-levels").textContent = t.levels; $("p-stars").textContent = t.stars + " ★"; $("p-matches").textContent = p.played; $("p-wins").textContent = p.wins;
  }

  /* Профілі */
  function renderAuth() {
    const name = S.data.current, p = S.profile();
    const shown = name === "Гість" ? T.t("Гість") : name; $("pf-name").textContent = $("chip-name").textContent = shown; $("pf-avatar").textContent = $("chip-avatar").textContent = shown[0].toUpperCase();
    $("pf-sub").textContent = p.played ? T.t("Рейтинг матчів: {r}", { r: Math.round(p.rating) }) : T.t("Профіль на цьому пристрої"); $("chip-sub").textContent = T.t(S.isGuest() ? "Створи профіль" : "Мій профіль");
    const guest = S.isGuest(); $("auth-tabs").hidden = !guest; $("login-form").hidden = !guest || authTab !== "login"; $("signup-form").hidden = !guest || authTab !== "signup"; $("logout-btn").hidden = guest; $("auth-note").hidden = !guest;
    ["quick-match","challenge-match"].forEach(id => { $(id).disabled = guest; });
    $("tour-form").querySelector("button[type=submit]").disabled = guest; $("guest-note-c").hidden = $("guest-note-t").hidden = !guest;
    const sel = $("m-p1"); sel.innerHTML = `<option>${esc(name === "Гість" ? T.t("Гість") : name)}</option>`; sel.disabled = true;
  }
  $("login-form").addEventListener("submit", async e => { e.preventDefault(); const m = $("li-msg"); m.textContent = "";
    try { const n = await S.login($("li-login").value, $("li-pass").value); $("li-pass").value = ""; notify(T.t("Привіт, {n}!", { n })); } catch (er) { m.textContent = T.t(er.message); } });
  $("signup-form").addEventListener("submit", async e => { e.preventDefault(); const m = $("su-msg"); m.textContent = "";
    try { const n = await S.register($("su-email").value, $("su-name").value, $("su-pass").value, $("su-pass2").value); ["su-pass","su-pass2"].forEach(i => { $(i).value = ""; }); notify(T.t("Привіт, {n}!", { n })); } catch (er) { m.textContent = T.t(er.message); } });
  $("logout-btn").addEventListener("click", () => { S.logout(); notify(T.t("Ти вийшов з акаунта.")); });
  $("export-btn").addEventListener("click", () => S.exportData());
  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async e => { const f = e.target.files[0]; if (!f) return;
    try { S.importData(await f.text()); notify(T.t("Дані завантажено")); } catch (er) { notify(T.t("Не вдалося: {e}", { e: T.t(er.message) })); } e.target.value = ""; });

  /* Матчі */
  const GM = "Гість може лише грати. Створи профіль, щоб брати участь у змаганнях, турнірах і рейтингах.";
  async function startMatch(puzzles) {
    if (S.isGuest()) return notify(T.t(GM));
    const a = S.data.current, size = +$("m-size").value; let b = null;
    try { b = await S.verify($("m-p2").value, $("m-p2pass").value); } catch (e) {}
    if (!b) return notify(T.t("Невірний логін або пароль."));
    if (b === a) return notify(T.t("Потрібні два різні гравці."));
    $("m-p2pass").value = "";
    const res = await T.runMatch({ a, b, puzzles, size, seed: "m" + Date.now().toString(36) });
    if (!res) return; const A = res.scores[a], B = res.scores[b], box = $("match-result"), line = (n, x) => `${esc(n)}: ${x.stars} ★, ${fmt(x.ms)}`;
    box.innerHTML = `<b>${res.winner ? esc(T.t("Переміг {n}", { n: res.winner })) : T.t("Нічия")}</b><br>${line(a, A)}<br>${line(b, B)}`; box.hidden = false; renderAuth();
  }
  $("quick-match").addEventListener("click", () => startMatch(1));
  $("challenge-match").addEventListener("click", () => startMatch(3));

  /* Турніри */
  let openTour = null; const FMT = { single_elimination: "На вибування", round_robin: "Круговий" };
  function renderTours() {
    const ts = S.data.tournaments;
    $("tour-list").innerHTML = ts.length ? ts.map(t => `<div class="leader-row"><span class="rank">${t.status==="completed"?"✔":"▶"}</span><span class="leader-name">${esc(t.title)} · ${T.t(FMT[t.format])} · ${T.t("{n} уч.", { n: t.players.length })} · ${t.size}×${t.size}${t.champion?" · 🏆 "+esc(t.champion):""}</span><button class="secondary-btn" data-tour-open="${t.id}">${T.t("Відкрити")}</button></div>`).join("") : `<div class="empty">${T.t("Турнірів ще немає. Створи перший!")}</div>`;
    const t = ts.find(x => x.id === openTour), box = $("tour-detail"); if (!t) { box.hidden = true; return; } box.hidden = false;
    let h = `<div class="table-title"><h3>${esc(t.title)}</h3><button class="text-btn" data-tour-del="${t.id}">${T.t("Видалити")}</button></div>`;
    if (t.champion) h += `<div class="notice">🏆 ${T.t("Переможець")}: <b>${esc(t.champion)}</b></div>`;
    t.rounds.forEach((r, ri) => { h += `<p class="eyebrow" style="margin:14px 0 4px">${t.format==="round_robin"?T.t("УСІ МАТЧІ"):T.t("РАУНД {n}", { n: ri + 1 })}</p>`;
      r.forEach((m, mi) => { const right = m.w ? `${T.t("Переможець")}: ${esc(m.w)}` : `<button class="secondary-btn" data-tour-play="${t.id}:${ri}:${mi}">${T.t("Зіграти")}</button>`;
        h += `<div class="leader-row"><span class="rank">${mi+1}</span><span class="leader-name">${esc(m.a)} vs ${m.b===null?T.t("(пропуск)"):esc(m.b)}</span><span class="leader-value">${right}</span></div>`; }); });
    if (t.format === "round_robin") h += `<p class="eyebrow" style="margin:14px 0 4px">${T.t("ТАБЛИЦЯ")}</p>` + T.standings(t).map(([n, w], i) => `<div class="leader-row"><span class="rank">#${i+1}</span><span class="leader-name">${esc(n)}</span><span class="leader-value">${T.t("{n} перемог", { n: w })}</span></div>`).join("");
    box.innerHTML = h;
  }
  $("tour-form").addEventListener("submit", e => { e.preventDefault(); const msg = $("t-msg");
    if (S.isGuest()) { msg.textContent = T.t(GM); return; }
    const raw = $("t-players").value.split(/[,\n]/).map(x => x.trim()).filter(Boolean), missing = raw.find(x => !S.exists(x)), players = [...new Set(raw.map(x => S.exists(x) || x))];
    if (players.length < 2 || players.length > 16) { msg.textContent = T.t("Потрібно від 2 до 16 різних учасників."); return; }
    if (missing) { msg.textContent = T.t("Учасник не знайдений: {n}", { n: missing }); return; }
    const title = $("t-title").value.trim(); if (title.length < 3) { msg.textContent = T.t("Назва — мінімум 3 символи."); return; }
    const t = T.createTournament({ title, format: $("t-format").value, size: +$("t-size").value, players }); openTour = t.id; msg.textContent = "";
    $("tour-form").reset(); renderTours(); renderAuth(); notify(T.t("Турнір створено"));
  });
  window.addEventListener("tcm:tournaments", () => { renderTours(); renderAuth(); });

  window.addEventListener("tcm:progress", () => { renderWorlds(true); renderStats(); renderAuth(); });
  window.addEventListener("tcm:auth", renderAuth);
  $("more-worlds").addEventListener("click", () => renderWorlds(false));

  document.addEventListener("click", e => {
    const pb = e.target.closest("[data-page]"); if (pb) { showPage(pb.dataset.page); return; }
    const rb = e.target.closest("[data-rating]"); if (rb) { document.querySelectorAll("[data-rating]").forEach(b => b.classList.toggle("active", b === rb)); window.renderTCMLeaderboard(rb.dataset.rating); return; }
    const pl = e.target.closest("[data-play]"); if (pl) { const [w, l] = pl.dataset.play.split("-").map(Number); T.startLevel(T.levelConfig(w, l)); return; }
    const at = e.target.closest("[data-auth-tab]"); if (at) { authTab = at.dataset.authTab; document.querySelectorAll("[data-auth-tab]").forEach(b => b.classList.toggle("active", b === at)); renderAuth(); return; }
    const to = e.target.closest("[data-tour-open]"); if (to) { openTour = to.dataset.tourOpen; renderTours(); $("tour-detail").scrollIntoView({behavior:"smooth"}); return; }
    const tp = e.target.closest("[data-tour-play]"); if (tp) { if (S.isGuest()) return notify(T.t(GM)); const [id, ri, mi] = tp.dataset.tourPlay.split(":"); T.playTournamentMatch(id, +ri, +mi).then(() => { renderTours(); renderStats(); }); return; }
    const td = e.target.closest("[data-tour-del]"); if (td && S.isGuest()) { notify(T.t(GM)); return; }
    if (td && confirm(T.t("Видалити турнір?"))) { S.data.tournaments = S.data.tournaments.filter(t => t.id !== td.dataset.tourDel); openTour = null; S.persist(); renderTours(); return; }
    const br = e.target.closest("[data-demo]"); if (br) $("tour-list").scrollIntoView({behavior:"smooth"});
  });
  window.addEventListener("tcm:lang", () => { $("page-title").textContent = T.t(titles[curPage]); $("page-eyebrow").textContent = T.t(eyebrows[curPage]); renderWorlds(true); renderStats(); renderAuth(); renderTours(); });
  renderWorlds(false); renderStats(); renderAuth(); renderTours(); window.renderTCMLeaderboard("progress");
})();
