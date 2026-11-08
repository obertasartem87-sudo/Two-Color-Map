/* Локальне сховище: акаунти (пошта + нікнейм + пароль), прогрес, рейтинг матчів, турніри — усе в localStorage цього браузера.
   Пароль не зберігається: лише сіль і хеш PBKDF2-SHA256. Унікальність пошти/нікнейму перевіряється в межах цього пристрою. */
(function (T) {
  const GUEST = "Гість", KEY = "tcm_store_v1", BAD = ["__proto__", "constructor", "prototype"];
  T.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let s; try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!s || typeof s.profiles !== "object" || !Array.isArray(s.tournaments)) s = { profiles: {}, current: GUEST, tournaments: [] };
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k), lc = x => String(x).trim().toLowerCase();
  const mk = () => ({ created: Date.now(), progress: {}, played: 0, wins: 0, rating: 1000 });
  if (!own(s.profiles, GUEST)) s.profiles[GUEST] = mk();
  if (!own(s.profiles, s.current)) s.current = GUEST;
  const S = window.TCMStore = { data: s };
  const GN = new Set(["guest", ...(((window.TCM_ROWS || []).find(r => r[0] === GUEST)) || [GUEST]).map(lc)]);
  S.reserved = n => typeof n === "string" && GN.has(lc(n));
  S.isGuest = n => (n === undefined ? s.current : n) === GUEST;
  S.validName = n => typeof n === "string" && n.trim().length >= 2 && n.trim().length <= 20 && !/[<>]/.test(n) && !BAD.includes(n.trim()) && !S.reserved(n);
  S.profile = () => s.profiles[s.current];
  S.persist = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  S.select = name => { if (!own(s.profiles, name)) return; s.current = name; T.progress = S.profile().progress; S.persist(); window.dispatchEvent(new Event("tcm:auth")); window.dispatchEvent(new Event("tcm:progress")); };
  T.progress = S.profile().progress;

  /* --- акаунти --- */
  const EMAIL = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;
  const b64 = u => btoa(String.fromCharCode(...u)), unb64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  async function hashPw(pw, salt) {
    const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
    return b64(new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, k, 256)));
  }
  S.findByEmail = e => Object.keys(s.profiles).find(n => s.profiles[n].email && s.profiles[n].email === lc(e));
  S.findByName = n => Object.keys(s.profiles).find(k => lc(k) === lc(n));
  S.exists = n => { const k = S.findByName(n); return k && k !== GUEST && s.profiles[k].hash ? k : null; };
  S.register = async (email, name, pw, pw2) => {
    email = lc(email); name = String(name).trim();
    if (email.length > 254 || !EMAIL.test(email)) throw new Error("Введи коректну пошту.");
    if (S.findByEmail(email)) throw new Error("Ця пошта вже зареєстрована.");
    if (S.reserved(name)) throw new Error("Це ім'я зарезервоване.");
    if (!S.validName(name)) throw new Error("Нікнейм: 2–20 символів, без < >.");
    const ex = S.findByName(name); if (ex && s.profiles[ex].hash) throw new Error("Цей нікнейм уже зайнятий.");
    if (!(pw.length >= 8 && pw.length <= 64 && /\p{L}/u.test(pw) && /\d/.test(pw))) throw new Error("Пароль: щонайменше 8 символів, літери й цифри.");
    if (pw !== pw2) throw new Error("Паролі не збігаються.");
    const key = ex || name, salt = crypto.getRandomValues(new Uint8Array(16)), h = await hashPw(pw, salt);
    if (S.findByEmail(email)) throw new Error("Ця пошта вже зареєстрована.");
    const p = s.profiles[key] || (s.profiles[key] = mk()); p.email = email; p.salt = b64(salt); p.hash = h;
    S.persist(); S.select(key); return key;
  };
  S.verify = async (login, pw) => {
    login = String(login).trim(); const k = login.includes("@") ? S.findByEmail(login) : S.findByName(login), p = k && s.profiles[k];
    if (!p || !p.hash) { await hashPw(String(pw), new Uint8Array(16)); return null; }
    return (await hashPw(String(pw), unb64(p.salt))) === p.hash ? k : null;
  };
  S.login = async (login, pw) => {
    const k = await S.verify(login, pw);
    if (!k) { await new Promise(r => setTimeout(r, 600)); throw new Error("Невірний логін або пароль."); }
    S.select(k); return k;
  };
  S.logout = () => S.select(GUEST);

  S.recordMatch = (a, b, w) => {
    const A = s.profiles[a], B = s.profiles[b]; if (!A || !B || S.isGuest(a) || S.isGuest(b)) return;
    const ea = 1 / (1 + Math.pow(10, (B.rating - A.rating) / 400)), sa = w === a ? 1 : w === b ? 0 : .5;
    A.rating += 32 * (sa - ea); B.rating += 32 * ((1 - sa) - (1 - ea)); A.played++; B.played++;
    if (w === a) A.wins++; if (w === b) B.wins++;
    S.persist(); window.dispatchEvent(new Event("tcm:progress"));
  };
  S.leaderboard = type => {
    const rows = Object.entries(s.profiles).filter(([n]) => n !== GUEST).map(([name, p]) => { const v = Object.values(p.progress || {});
      return { name, levels: v.length, stars: v.reduce((a, r) => a + r.stars, 0), best: v.length ? Math.min(...v.map(r => r.ms)) : 0, rating: p.played ? Math.round(p.rating) : 0 }; });
    const f = { progress: ["levels", -1], stars: ["stars", -1], speed: ["best", 1], tournament: ["rating", -1] }[type];
    return rows.filter(x => x[f[0]] > 0).sort((x, y) => f[1] * (x[f[0]] - y[f[0]])).slice(0, 20).map(x => ({ username: x.name, value: x[f[0]] }));
  };
  S.exportData = () => { const b = new Blob([JSON.stringify(s)], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = "two-color-map-save.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  S.importData = text => {
    const d = JSON.parse(text); if (!d || typeof d.profiles !== "object") throw new Error("Невірний файл.");
    const B64 = /^[A-Za-z0-9+/=]{16,100}$/;
    for (const [name, p] of Object.entries(d.profiles)) {
      if ((name !== GUEST && !S.validName(name)) || !p) continue;
      const cur = own(s.profiles, name) ? s.profiles[name] : (s.profiles[name] = mk()), pr = p.progress || {};
      for (const [k, r] of Object.entries(pr)) {
        if (!/^\d+-\d+$/.test(k) || !r || !(r.stars >= 1 && r.stars <= 3) || !(r.ms > 0)) continue;
        const m = cur.progress[k]; cur.progress[k] = m ? { stars: Math.max(m.stars, r.stars | 0), ms: Math.min(m.ms, r.ms) } : { stars: r.stars | 0, ms: +r.ms };
      }
      if (name !== GUEST && !cur.hash && typeof p.email === "string" && EMAIL.test(p.email) && B64.test(p.salt || "") && B64.test(p.hash || "") && !S.findByEmail(p.email)) { cur.email = lc(p.email); cur.salt = p.salt; cur.hash = p.hash; }
      if ((p.played | 0) > cur.played) { cur.played = p.played | 0; cur.wins = p.wins | 0; cur.rating = Number.isFinite(p.rating) ? p.rating : 1000; }
    }
    S.select(s.current);
  };
})(window.TCM);
