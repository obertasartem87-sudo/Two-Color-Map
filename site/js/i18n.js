/* Рушій мов і тем. Ключ перекладу = український текст (js/i18n-data*.js). Статичний HTML перекладається обходом текстових вузлів,
   динамічні тексти — через T.t(ключ, {змінні}). Дані профілів/мов зберігаються в localStorage. */
(function (T) {
  const CODES = ["ua","en","es","de","ja","fr","pt","cs","zh","it","nl","pl"], HTML_LANG = { ua: "uk" };
  T.LANGS = [["ua","Українська"],["en","English"],["es","Español"],["de","Deutsch"],["ja","日本語"],["fr","Français"],["pt","Português"],["cs","Čeština"],["zh","中文"],["it","Italiano"],["nl","Nederlands"],["pl","Polski"]];
  const dict = {}; (window.TCM_ROWS || []).forEach(r => { dict[r[0]] = r; });
  const store = (k, v) => { try { v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  T.lang = CODES.includes(read("tcm_lang")) ? read("tcm_lang") : "ua";
  T.t = function (k, v) {
    const r = dict[k]; let s = (r && r[CODES.indexOf(T.lang)]) || k;
    return v ? s.replace(/\{(\w+)\}/g, (m, x) => (x in v ? v[x] : m)) : s;
  };
  const DYN = ["page-eyebrow","world-grid","rating-table","tour-list","tour-detail","profile-list","match-result","pf-name","chip-name","pf-sub","chip-sub","stat-best","stat-best-sub","rating-heading","gm-title","gm-info","gm-win-time","gm-feedback","gm-grid","m-p1"];
  DYN.forEach(id => { const e = document.getElementById(id); if (e) e.setAttribute("data-dyn", ""); });

  T.i18nApply = function (root = document.body) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => {
      const p = n.parentElement; return p && !/^(SCRIPT|STYLE)$/.test(p.tagName) && !p.closest("[data-dyn]") ? 1 : 2; } });
    const list = []; while (w.nextNode()) list.push(w.currentNode);
    list.forEach(n => {
      if (n._k === undefined) { const m = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/); n._k = m[2] && dict[m[2]] ? m[2] : null; n._p = [m[1], m[3]]; }
      if (n._k) n.nodeValue = n._p[0] + T.t(n._k) + n._p[1];
    });
    root.querySelectorAll("[placeholder],[title]").forEach(el => ["placeholder", "title"].forEach(a => {
      if (!el.hasAttribute(a)) return; const o = "o" + a; if (!el.dataset[o]) el.dataset[o] = el.getAttribute(a);
      if (dict[el.dataset[o]]) el.setAttribute(a, T.t(el.dataset[o]));
    }));
    document.documentElement.lang = HTML_LANG[T.lang] || T.lang;
  };
  T.setLang = c => { if (!CODES.includes(c)) return; T.lang = c; store("tcm_lang", c); T.i18nApply(); window.dispatchEvent(new Event("tcm:lang")); };

  T.setTheme = th => {
    document.documentElement.dataset.theme = th; store("tcm_theme", th);
    const b = document.getElementById("theme-toggle"); if (b) b.textContent = th === "light" ? "☾" : "☀";
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = th === "light" ? "#f2f5fb" : "#10172a";
  };
  const sel = document.getElementById("lang-select");
  sel.innerHTML = T.LANGS.map(([c, n]) => `<option value="${c}">${n}</option>`).join(""); sel.value = T.lang;
  sel.addEventListener("change", () => T.setLang(sel.value));
  document.getElementById("theme-toggle").addEventListener("click", () => T.setTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light"));
  T.setTheme(document.documentElement.dataset.theme || "dark"); T.i18nApply();
})(window.TCM);
