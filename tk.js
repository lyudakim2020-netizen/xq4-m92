/* Банкет под ключ: «Свадьба под ключ 2026 / 2027» и «Корпоратив под ключ».
   Отдельная вкладка. Остальной калькулятор не меняется. Цены взяты из таблицы «План RizzW». */
(function () {
  try {
    var LS = KEY + "-tk", LSP = KEY + "-tkprices";
    var HALLS = { big: "Большой зал", small: "Малый зал" };
    var HOST = [70000, 75000, 80000, 90000, 100000, 120000];

    function R(id, name, p, o) { o = o || {}; return { id: id, name: name, p: p, unit: o.unit || "усл", on: o.on !== false, host: !!o.host, warnG: o.warnG || 0 }; }
    function T(id, name) { return { id: id, name: name }; }
    var T_ALL = [T("all", "Любой день")];
    var T_WF = [T("wd", "Будни"), T("fs", "Пт/сб")];
    var T_CORP = [T("c1", "1–13 декабря, будни"), T("c1f", "11–12 декабря (пт/сб)"), T("c2", "14–31 декабря, будни"), T("c2f", "18–19 декабря (пт/сб)"), T("c3", "25–26 декабря")];

    var TPL = {
      w26: { name: "Свадьба под ключ 2026", halls: {
        big: { tariffs: T_ALL, min: 30, rows: [
          R("sound", "Звук + свет", 45000), R("screen", "Экран", 20000),
          R("host", "Ведущий + диджей", 70000, { host: true }), R("deco", "Оформление зала", 50000) ] },
        small: { tariffs: T_ALL, rows: [
          R("sound", "Звук + свет", 35000), R("screen", "Экран", 10000),
          R("host", "Ведущий + диджей", 70000, { host: true }), R("deco", "Оформление зала", 40000) ] } } },
      w27: { name: "Свадьба под ключ 2027", halls: {
        big: { tariffs: T_WF, rows: [
          R("sound", "Звук + свет", 55000), R("screen", "Экран", 25000),
          R("host", "Ведущий + диджей", { wd: 70000, fs: 90000 }, { host: true }),
          R("deco", "Оформление зала", 70000), R("rent", "Аренда зала", { wd: 15000, fs: 65000 }),
          R("smoke", "Тяжёлый дым", 15000), R("podium", "Подиум (4 модуля)", 8000),
          R("shirma", "Ширма для диджея", 4000), R("karaoke", "Караоке", 30000),
          R("cake", "Свадебный торт (5,4 кг на 30 гостей)", 31500, { warnG: 30 }) ] },
        small: { tariffs: T_WF, rows: [
          R("sound", "Звук + свет", 30000), R("screen", "Экран", 10000),
          R("host", "Ведущий + диджей", { wd: 70000, fs: 90000 }, { host: true }),
          R("deco", "Оформление зала", 50000), R("rent", "Аренда зала", { wd: 0, fs: 50000 }),
          R("karaoke", "Караоке", 30000) ] } } },
      corp: { name: "Корпоратив под ключ", halls: {
        big: { tariffs: T_CORP, rows: [
          R("sound", "Звук + свет", 55000), R("screen", "Экран", 25000),
          R("host", "Ведущий + диджей", { c1: 80000, c1f: 80000, c2: 100000, c2f: 100000, c3: 100000 }, { host: true }),
          R("deco", "Оформление зала", 30000),
          R("rent", "Аренда зала", { c1: 15000, c1f: 65000, c2: 65000, c2f: 85000, c3: 100000 }),
          R("band", "Группа + доп. звук", 250000, { on: false }),
          R("shirma", "Ширма для диджея", 4000), R("karaoke", "Караоке", 25000) ] },
        small: { tariffs: T_WF, rows: [
          R("sound", "Звук + свет", 30000), R("screen", "Экран", 10000),
          R("host", "Ведущий + диджей", { wd: 70000, fs: 90000 }, { host: true }),
          R("deco", "Оформление зала", 50000), R("rent", "Аренда зала", { wd: 0, fs: 50000 }),
          R("karaoke", "Караоке", 25000) ] } } }
    };

    /* ---------- состояние ---------- */
    function load(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }
    function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    var TKP = load(LSP) || {};
    function mkRows(tpl, hall) {
      return TPL[tpl].halls[hall].rows.map(function (r) { return { id: r.id, tpl: true, name: r.name, unit: r.unit, qty: 1, on: r.on, ov: null }; });
    }
    function fresh(keep) {
      var s = { client: "", date: "", guests: 30, tpl: "w27", hall: "big", tariff: "wd", manual: false, menu: "p1", svcOn: true, showPrices: false, showMenu: true, mods: [], tb: null, rows: null };
      if (keep) { s.tpl = keep.tpl; s.hall = keep.hall; s.menu = keep.menu; s.showMenu = keep.showMenu; s.svcOn = keep.svcOn; }
      s.tariff = TPL[s.tpl].halls[s.hall].tariffs[0].id;
      s.rows = mkRows(s.tpl, s.hall);
      return s;
    }
    var S = load(LS);
    if (!(S && TPL[S.tpl] && TPL[S.tpl].halls[S.hall] && Array.isArray(S.rows))) S = fresh();

    function hallDef() { return TPL[S.tpl].halls[S.hall]; }
    function tplRow(id) { return hallDef().rows.find(function (r) { return r.id === id; }); }
    function basePrice(id, tariff) {
      var o = TKP[S.tpl] && TKP[S.tpl][S.hall] && TKP[S.tpl][S.hall][id], v = o && o[tariff];
      if (fin(v)) return v;
      var r = tplRow(id); if (!r) return NaN;
      var p = r.p; return typeof p === "number" ? p : (p && fin(p[tariff]) ? p[tariff] : NaN);
    }
    function rowPrice(r) {
      if (!r.tpl) return num(r.price);
      var o = num(r.ov); return fin(o) ? o : basePrice(r.id, S.tariff);
    }
    function detect() {
      var d = parseD(S.date); if (!d) return null;
      if (S.tpl === "w26") return "all";
      var fs = d.getDay() === 5 || d.getDay() === 6;
      if (hallDef().tariffs[0].id === "wd") return fs ? "fs" : "wd";
      if (d.getFullYear() !== 2026 || d.getMonth() !== 11) return null;
      var n = d.getDate();
      if (n === 25 || n === 26) return "c3";
      if (n === 11 || n === 12) return "c1f";
      if (n === 18 || n === 19) return "c2f";
      return n <= 13 ? "c1" : "c2";
    }
    function autoTariff() {
      var ids = hallDef().tariffs.map(function (x) { return x.id; }), t = detect();
      if (!S.manual && t && ids.indexOf(t) >= 0) S.tariff = t;
      if (ids.indexOf(S.tariff) < 0) S.tariff = ids[0];
    }
    function menuPkgs() { return DB.packages.filter(function (p) { return p.kind === "package" && p.price > 0; }); }
    function menuPkg() { var l = menuPkgs(); return l.find(function (p) { return p.id === S.menu; }) || l[0] || null; }

    /* ---------- расчёт ---------- */
    function calc() {
      var pk = menuPkg(), G = num(S.guests), P = pk ? pk.price : NaN;
      var menu = fin(P) && G > 0 ? P * G : NaN;
      var sp = (num(DB.settings.service) || 0) / 100;
      var svc = S.svcOn && fin(menu) ? menu * sp : 0;
      var items = [], sv = 0;
      S.rows.forEach(function (r, i) {
        var q = r.pg ? (G > 0 ? G : NaN) : num(r.qty), pr = rowPrice(r), s = fin(q) && fin(pr) ? q * pr : NaN;
        items.push({ i: i, r: r, q: q, pr: pr, s: s });
        if (r.on && fin(s)) sv += s;
      });
      var total = (fin(menu) ? menu : 0) + svc + sv;
      var pre = total * (num(DB.settings.prepay) || 0) / 100;
      return { pk: pk, G: G, P: P, menu: menu, sp: sp, svc: svc, items: items, sv: sv, total: total, pre: pre, rest: total - pre,
        per: G > 0 ? total / G : NaN, dt: parseD(S.date) };
    }

    /* ---------- документ для гостя ---------- */
    function money(v) { return fin(v) ? rub(v) : "—"; }
    function qtyText(it, withUnit) {
      var q = it.q; if (!fin(q)) return "";
      return fm(q, q % 1 ? 1 : 0) + (withUnit && it.r.unit && it.r.unit !== "усл" ? " " + it.r.unit : "");
    }
    function amtOf(dish, g, pcs) {
      var d = dishById(dish);
      return d && d.unit === "шт" ? fm(fin(pcs) ? pcs : 1) + " шт" : fm(g) + (d && d.unit === "л" ? " мл" : " г");
    }
    function menuGroups(pk) {
      var groups = [], idx = {}, mods = S.mods || [];
      function push(sec, text) {
        if (!(sec in idx)) { idx[sec] = groups.length; groups.push({ sec: sec, items: [] }); }
        groups[idx[sec]].items.push(text);
      }
      pk.lines.forEach(function (l) {
        var m = mods.find(function (x) { return x.base === l.title; });
        if (m) { if (m.to != null) push(l.sec, m.to + " — " + m.amt); return; }
        push(l.sec, l.title + " — " + amtOf(l.dish, l.g, l.pcs));
      });
      mods.forEach(function (m) { if (m.base == null && m.to != null) push(m.sec || "Дополнительно", m.to + " — " + m.amt); });
      return groups;
    }
    function buildDoc(c, o) {
      var d = { title: TPL[S.tpl].name + (S.client ? " — " + S.client : ""), meta: [], lines: [], groups: [], menuTitle: "", totals: [] };
      if (c.dt) d.meta.push("Дата мероприятия: " + fmtD(c.dt));
      d.meta.push(HALLS[S.hall]);
      d.meta.push("Гостей: " + (fin(c.G) ? fm(c.G) : "—"));
      if (c.pk) {
        d.lines.push({ name: "Меню «" + c.pk.name + "»", qty: c.G > 0 ? fm(c.G) : "", price: c.P, sum: c.menu, plain: "Меню «" + c.pk.name + "»" + (c.G > 0 ? ", " + fm(c.G) + " гостей" : "") });
        d.menuTitle = "Состав меню «" + c.pk.name + "» (на одного гостя)";
        if (o.menu) d.groups = menuGroups(c.pk);
      }
      if (S.svcOn) { var sn = "Обслуживание " + fm(c.sp * 100) + "%"; d.lines.push({ name: sn, qty: "", price: NaN, sum: c.svc, plain: sn }); }
      c.items.forEach(function (it) {
        if (!it.r.on) return;
        var nm = it.r.name || "Без названия";
        d.lines.push({ name: nm, qty: qtyText(it, true), price: it.pr, sum: it.s, plain: nm + (fin(it.q) && it.q !== 1 ? " × " + qtyText(it, true) : "") });
      });
      // гостю: одна сумма «итого» вместе с обслуживанием, предоплата и остаток; цен отдельных услуг нет
      d.totals.push([S.svcOn ? "Итого с обслуживанием" : "Итого", c.total, true]);
      var pp = num(DB.settings.prepay) || 0;
      if (pp > 0) {
        d.totals.push(["Предоплата " + fm(pp) + "% при договоре", c.pre]);
        d.totals.push(["Остаток" + (c.dt ? " до " + fmtD(minusDays(c.dt, num(DB.settings.payDays) || 0)) : ""), c.rest]);
      }
      return d;
    }
    function docHTML(d, o) {
      var h = '<div class="tkdoc"><h1>' + esc(d.title) + '</h1><p class="tkm">' + esc(d.meta.join(" · ")) + "</p>";
      if (o.prices) {
        h += '<table><thead><tr><th>Позиция</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Сумма</th></tr></thead><tbody>' +
          d.lines.map(function (l) { return "<tr><td>" + esc(l.name) + '</td><td class="r">' + esc(l.qty) + '</td><td class="r">' + (fin(l.price) ? rub(l.price) : "") + '</td><td class="r">' + money(l.sum) + "</td></tr>"; }).join("") + "</tbody></table>";
      } else {
        h += "<h2>В стоимость входит</h2><ul>" + d.lines.map(function (l) { return "<li>" + esc(l.plain) + "</li>"; }).join("") + "</ul>";
      }
      if (d.groups.length) {
        h += "<h2>" + esc(d.menuTitle) + "</h2>" + d.groups.map(function (g) {
          return '<p class="tkg"><b>' + esc(g.sec) + "</b></p><ul>" + g.items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
        }).join("");
      }
      h += '<table class="tkt"><tbody>' + d.totals.map(function (t) { return "<tr" + (t[2] ? ' class="tkb"' : "") + "><td>" + esc(t[0]) + '</td><td class="r">' + money(t[1]) + "</td></tr>"; }).join("") + "</tbody></table></div>";
      return h;
    }
    function docText(d, o) {
      var L = [d.title, d.meta.join(", "), ""];
      if (o.prices) {
        L.push("Что входит:");
        d.lines.forEach(function (l) { L.push("• " + l.name + (l.qty ? " — " + l.qty : "") + (fin(l.price) ? " × " + rub(l.price) : "") + " = " + money(l.sum)); });
      } else {
        L.push("В стоимость входит:");
        d.lines.forEach(function (l) { L.push("• " + l.plain); });
      }
      if (d.groups.length) {
        L.push("", d.menuTitle + ":");
        d.groups.forEach(function (g) { L.push(g.sec + ":"); g.items.forEach(function (x) { L.push("  – " + x); }); });
      }
      L.push("");
      d.totals.forEach(function (t) { L.push((t[2] ? t[0].toUpperCase() : t[0]) + ": " + money(t[1])); });
      return L.join("\n");
    }
    function r2l(v) { return fin(v) ? Math.round(v * 100) / 100 : ""; }
    function docRows(d, o) {
      var A = [[d.title], [d.meta.join(", ")], []];
      if (o.prices) {
        A.push(["Позиция", "Кол-во", "Цена, ₽", "Сумма, ₽"]);
        d.lines.forEach(function (l) { A.push([l.name, l.qty, fin(l.price) ? r2l(l.price) : "", r2l(l.sum)]); });
      } else {
        A.push(["В стоимость входит"]);
        d.lines.forEach(function (l) { A.push([l.plain]); });
      }
      if (d.groups.length) {
        A.push([], [d.menuTitle]);
        d.groups.forEach(function (g) { A.push([g.sec]); g.items.forEach(function (x) { A.push(["   " + x]); }); });
      }
      A.push([]);
      d.totals.forEach(function (t) { A.push([t[0], "", "", r2l(t[1])]); });
      return A;
    }

    /* ---------- разметка вкладки ---------- */
    document.head.insertAdjacentHTML("beforeend", `<style>
.tk-tbl{min-width:600px}
.tk-tbl tr.removed td{opacity:.5}
.tk-tbl tr.removed input{text-decoration:line-through}
.tk-tbl input.dsel{background:transparent;border-color:transparent;padding:3px 4px;font-weight:500}
.tk-tbl input.dsel:hover,.tk-tbl input.dsel:focus{background:var(--sunk);border-color:var(--line)}
body.tab-tk .mbar{display:none!important}
.tkprev{background:#fff;border:1px solid var(--line);border-radius:8px;padding:16px;overflow:auto;max-height:640px}
.tkdoc,.tkdoc *{color:#000!important}
.tkdoc h1{font-size:1.25rem;margin:0 0 4px}
.tkdoc h2{font-size:1rem;margin:14px 0 6px}
.tkdoc .tkm{margin:0 0 8px;font-size:.9rem}
.tkdoc ul{margin:0 0 6px;padding-left:20px}
.tkdoc table{width:100%;border-collapse:collapse;margin-top:6px}
.tkdoc th{font-size:.75rem;text-transform:none;letter-spacing:0;border-bottom:1px solid #999;padding:4px 6px}
.tkdoc td{border-bottom:1px solid #ddd;padding:4px 6px}
.tkdoc .tkt td{border-bottom:none}
.tkdoc .tkb td{font-weight:700;font-size:1.05em;border-top:1px solid #999}
.tkdoc .tkg{margin:8px 0 2px}
.tkdoc td.r,.tkdoc th.r{text-align:right}
@media (max-width:640px){
.tkm-tbl tr.sec{display:block}
.tk-tbl,.tk-tbl tbody{display:block;min-width:0}
.tk-tbl thead{display:none}
.tk-tbl tr{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:4px 8px;align-items:center;border-bottom:1px solid var(--line);padding-block:6px}
.tk-tbl td{border-bottom:none;padding:0 2px}
.tk-tbl tr td:first-child{grid-column:1/-1}
.tk-tbl .qty{justify-content:flex-start}
}
</style>`);
    document.querySelector("nav.tabs").insertAdjacentHTML("beforeend", '<button type="button" role="tab" data-tab="tk" aria-selected="false">Под ключ</button>');
    $("tab-saved").insertAdjacentHTML("afterend", `<section id="tab-tk" class="layout" hidden>
<div class="col">
<div class="panel">
<div class="row between"><h2>Банкет под ключ</h2><button type="button" id="tkNew">Новая смета</button></div>
<div class="grid-params">
<label class="f" for="tkClient">Клиент<input id="tkClient" placeholder="Например, Анна и Игорь"></label>
<label class="f" for="tkDate">Дата мероприятия<input id="tkDate" type="date"></label>
<label class="f" for="tkGuests">Гостей<input id="tkGuests" class="num" inputmode="numeric"></label>
<label class="f" for="tkTpl">Пакет под ключ<select id="tkTpl"></select></label>
<label class="f" for="tkHall">Зал<select id="tkHall"></select></label>
<label class="f" for="tkTariff">Цены на день<select id="tkTariff"></select></label>
<label class="f" for="tkMenu">Меню на гостя<select id="tkMenu"></select></label>
</div>
<p class="why" id="tkHint"></p>
</div>
<div class="panel">
<div class="row between"><h2>Что входит в смету</h2><span class="small muted">Лишнее уберите крестиком, цену и количество можно поправить</span></div>
<div class="tw"><table class="tk-tbl">
<thead><tr><th>Позиция</th><th class="r">Кол-во</th><th class="r">Цена, ₽</th><th class="r">Сумма, ₽</th><th></th></tr></thead>
<tbody id="tkBody"></tbody></table></div>
<div class="row"><select id="tkAddSel" aria-label="Добавить позицию" style="max-width:420px"></select><button type="button" id="tkAddBtn">+ Добавить</button></div>
</div>
<div class="panel"><details id="tkMenuBox"><summary>Меню и замена блюд</summary>
<p class="why" style="margin-top:10px" id="tkModsInfo"></p>
<div class="tw"><table class="tk-tbl tkm-tbl" style="min-width:520px">
<thead><tr><th>Блюдо</th><th class="r">На гостя</th><th class="r int">Разница, ₽</th><th></th></tr></thead>
<tbody id="tkMenuBody"></tbody></table></div>
<div class="row"><button type="button" class="ghost" id="tkMenuAdd">+ Добавить блюдо сверх пакета</button><button type="button" id="tkMenuReset">Вернуть меню пакета</button></div>
<p class="note" id="tkMenuNote" hidden></p>
</details></div>
<div class="panel"><details id="tkPriceBox"><summary>Цены этого пакета под ключ</summary>
<p class="why" style="margin-top:10px">Цены из ваших таблиц. Если они изменились, поправьте здесь: сохранится в этом браузере. Цена меню берётся из вкладки «Пакеты».</p>
<div class="tw"><table id="tkPriceTbl" style="min-width:420px"></table></div>
<div class="row"><button type="button" id="tkPriceReset">Вернуть цены из таблицы</button></div>
</details></div>
<div class="panel">
<div class="row between"><h2>Так увидит гость</h2><span class="small muted">Это попадёт в PDF</span></div>
<div class="tkprev" id="tkPrev"></div>
</div>
</div>
<aside class="col sticky" aria-live="polite">
<div class="panel">
<h2>Итого</h2>
<div class="kv"><span id="tkLMenu">Меню</span><span id="tkTMenu"></span></div>
<div class="kv" id="tkRowSvc"><span id="tkLSvc">Обслуживание</span><span id="tkTSvc"></span></div>
<div class="kv"><span>Услуги и оборудование</span><span id="tkTSvcs"></span></div>
<div class="kv em"><span>Итого</span><span id="tkTTotal"></span></div>
<div class="kv"><span id="tkLPre">Предоплата</span><span id="tkTPre"></span></div>
<div class="kv"><span id="tkLRest">Остаток</span><span id="tkTRest"></span></div>
<p class="note warn" id="tkWarn" hidden></p>
</div>
<div class="panel int"><h2>Для нас</h2><div class="kv"><span>Выходит на одного гостя</span><span id="tkTPer"></span></div><div id="tkRef"></div></div>
<div class="panel">
<h2>Смета для гостя</h2>
<label class="switch" for="tkShowPrices"><input type="checkbox" id="tkShowPrices"> Показывать гостю цены услуг</label>
<label class="switch" for="tkShowMenu"><input type="checkbox" id="tkShowMenu"> Показывать состав меню (блюда и граммовка)</label>
<p class="note" id="tkPriceState"></p>
<div class="row"><button type="button" class="pri" id="tkPrint">Печать / PDF</button><button type="button" id="tkCopy">Скопировать</button><button type="button" id="tkXls">В Excel</button></div>
</div>
</aside>
</section>`);

    /* ---------- отрисовка ---------- */
    function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (sel ? " selected" : "") + ">" + esc(label) + "</option>"; }
    function renderTop() {
      $("tkTpl").innerHTML = Object.keys(TPL).map(function (k) { return opt(k, TPL[k].name, k === S.tpl); }).join("");
      $("tkHall").innerHTML = Object.keys(HALLS).map(function (k) { return opt(k, HALLS[k], k === S.hall); }).join("");
      $("tkTariff").innerHTML = hallDef().tariffs.map(function (x) { return opt(x.id, x.name, x.id === S.tariff); }).join("");
      var cur = menuPkg();
      $("tkMenu").innerHTML = menuPkgs().map(function (p) { return opt(p.id, p.name + " — " + fm(p.price) + " ₽", cur && p.id === cur.id); }).join("") || '<option value="">нет пакета с ценой</option>';
      $("tkClient").value = S.client || ""; $("tkDate").value = S.date || "";
      $("tkGuests").value = fin(num(S.guests)) ? S.guests : "";
      $("tkShowPrices").checked = !!S.showPrices; $("tkShowMenu").checked = !!S.showMenu;
      var h = '<option value="">+ Добавить позицию…</option><option value="custom">Своя строка: своё название и цена (торт, декор…)</option>', grp = null;
      DB.services.forEach(function (s) {
        if (s.grp !== grp) { if (grp !== null) h += "</optgroup>"; h += '<optgroup label="' + esc(s.grp) + '">'; grp = s.grp; }
        h += opt(s.id, s.name + " — " + fm(s.price) + " ₽", false);
      });
      if (grp !== null) h += "</optgroup>";
      $("tkAddSel").innerHTML = h;
    }
    function rowHTML(it) {
      var r = it.r, i = it.i, def = r.tpl ? tplRow(r.id) : null, pr = it.pr;
      var h = '<tr data-i="' + i + '"' + (r.on ? "" : ' class="removed"') + '><td><input class="dsel" data-k="name" value="' + esc(r.name) + '" aria-label="Название">';
      if (def && def.host) {
        h += '<select data-k="host" aria-label="Ставка ведущего" style="margin-top:4px">' + HOST.map(function (v) { return opt(v, fm(v) + " ₽", v === pr); }).join("") + opt("", "другая цена", HOST.indexOf(pr) < 0) + "</select>";
      }
      h += '<div class="aiko" data-o="note"></div></td>';
      h += '<td class="r"><div class="qty"><input class="num" data-k="qty" inputmode="decimal"' + (r.pg ? " readonly" : "") + ' value="' + esc(r.pg ? (fin(it.q) ? String(it.q) : "") : (fin(num(r.qty)) ? String(r.qty) : "")) + '" aria-label="Количество"><span>' + esc(r.unit || "") + "</span></div></td>";
      h += '<td class="r"><input class="num" style="width:96px" data-k="price" inputmode="decimal" value="' + (fin(pr) ? pr : "") + '" aria-label="Цена"></td>';
      h += '<td class="r v" data-o="sum"></td>';
      var act = r.tpl ? (r.on ? "off" : "on") : "del", ttl = act === "on" ? "Вернуть в смету" : act === "off" ? "Убрать из сметы" : "Удалить строку";
      h += '<td class="r"><button type="button" class="icon" data-act="' + act + '" title="' + ttl + '" aria-label="' + ttl + '">' + (act === "on" ? "+" : "✕") + "</button></td></tr>";
      return h;
    }
    function renderRows() {
      var c = calc();
      var h = '<tr class="tkfix"><td><b data-o="menuName"></b><div class="aiko">Цена меню меняется во вкладке «Пакеты»</div></td><td class="r v" data-o="menuQty"></td><td class="r v" data-o="menuPrice"></td><td class="r v" data-o="menuSum"></td><td></td></tr>';
      h += '<tr class="tkfix"><td><label class="switch" for="tkSvcOn"><input type="checkbox" id="tkSvcOn"' + (S.svcOn ? " checked" : "") + '> <span data-o="svcName"></span></label></td><td></td><td class="r v" data-o="svcPct"></td><td class="r v" data-o="svcSum"></td><td></td></tr>';
      c.items.forEach(function (it) { h += rowHTML(it); });
      $("tkBody").innerHTML = h;
    }
    function renderPrices() {
      var t = hallDef().tariffs, rows = hallDef().rows;
      $("tkPriceTbl").innerHTML = "<thead><tr><th>Позиция</th>" + t.map(function (x) { return '<th class="r">' + esc(x.name) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        rows.map(function (r) {
          return "<tr><td>" + esc(r.name) + "</td>" + t.map(function (x) {
            var v = basePrice(r.id, x.id);
            return '<td class="r"><input class="num" style="width:96px" data-pr="' + r.id + '" data-pt="' + x.id + '" inputmode="decimal" value="' + (fin(v) ? v : "") + '" aria-label="' + esc(r.name + ", " + x.name) + '"></td>';
          }).join("") + "</tr>";
        }).join("") + "</tbody>";
    }
    function renderAll() { renderTop(); fillDishList(); syncMods(); renderRows(); renderPrices(); renderMenuBox(); update(); }
    function setO(root, key, text) { var el = root.querySelector('[data-o="' + key + '"]'); if (el) el.textContent = text; }

    function hintText() {
      var out = [], d = parseD(S.date), t = detect();
      var nm = function (id) { var x = hallDef().tariffs.find(function (y) { return y.id === id; }); return x ? x.name : id; };
      if (!d) out.push("Укажите дату мероприятия, и цены на день выберутся сами. Их можно выбрать и вручную.");
      else {
        if (t && hallDef().tariffs.length > 1) out.push(S.manual && t !== S.tariff ? "По дате подходит «" + nm(t) + "», но вы выбрали «" + nm(S.tariff) + "» вручную." : "Цены на день выбраны по дате: " + nm(S.tariff) + ".");
        if (!t && S.tpl === "corp" && hallDef().tariffs[0].id !== "wd") out.push("Цены корпоратива в таблице есть только на декабрь 2026. Для этой даты выберите цены вручную.");
        if (d.getDay() === 0 && S.tpl !== "w26") out.push("Воскресенье считаю будним днём. Если у вас иначе, выберите цены вручную.");
        if (S.tpl === "w26" && d.getFullYear() !== 2026) out.push("Это пакет 2026 года, а дата в другом году.");
        if (S.tpl === "w27" && d.getFullYear() !== 2027) out.push("Это пакет 2027 года, а дата в другом году.");
      }
      return out.join(" ");
    }

    function update() {
      var c = calc(), body = $("tkBody"), fixed = body.querySelectorAll("tr.tkfix");
      if (fixed.length) {
        setO(body, "menuName", c.pk ? "Меню «" + c.pk.name + "»" : "Меню: нет пакета с ценой");
        setO(body, "menuQty", c.G > 0 ? fm(c.G) + " гост." : "");
        setO(body, "menuPrice", fin(c.P) ? fm(c.P) : "");
        setO(body, "menuSum", fin(c.menu) ? fm(c.menu) : "—");
        setO(body, "svcName", "Обслуживание " + fm(c.sp * 100) + "% от меню");
        setO(body, "svcPct", S.svcOn ? fm(c.sp * 100) + "%" : "");
        setO(body, "svcSum", S.svcOn ? fm(c.svc) : "");
      }
      c.items.forEach(function (it) {
        var tr = body.querySelector('tr[data-i="' + it.i + '"]'); if (!tr) return;
        tr.classList.toggle("removed", !it.r.on);
        setO(tr, "sum", fin(it.s) ? fm(it.s) : "—");
        if (it.r.pg) { var qi = tr.querySelector('[data-k="qty"]'); if (qi) qi.value = fin(it.q) ? String(it.q) : ""; }
        var def = it.r.tpl ? tplRow(it.r.id) : null;
        setO(tr, "note", def && def.warnG && c.G > def.warnG ? "В таблице цена рассчитана на " + def.warnG + " гостей. Для " + fm(c.G) + " проверьте цену." : "");
      });
      $("tkHint").textContent = hintText();
      modsInfo();
      $("tkLMenu").textContent = fin(c.P) && c.G > 0 ? "Меню: " + fm(c.P) + " ₽ × " + fm(c.G) + " гостей" : "Меню";
      $("tkTMenu").textContent = rub(c.menu);
      $("tkRowSvc").hidden = !S.svcOn;
      $("tkLSvc").textContent = "Обслуживание " + fm(c.sp * 100) + "%"; $("tkTSvc").textContent = rub(c.svc);
      $("tkTSvcs").textContent = rub(c.sv);
      $("tkTTotal").textContent = rub(c.total);
      $("tkLPre").textContent = "Предоплата " + fm(num(DB.settings.prepay)) + "% при договоре"; $("tkTPre").textContent = rub(c.pre);
      $("tkLRest").textContent = c.dt ? "Остаток до " + fmtD(minusDays(c.dt, num(DB.settings.payDays) || 0)) : "Остаток"; $("tkTRest").textContent = rub(c.rest);
      $("tkTPer").textContent = rub(c.per);
      renderRef();
      var w = [], mg = hallDef().min;
      if (!(c.G > 0)) w.push("Укажите количество гостей.");
      if (!c.pk) w.push("Нет пакета меню с ценой: задайте цену во вкладке «Пакеты».");
      if (mg && c.G > 0 && c.G < mg) w.push("В таблице для этого пакета минимум " + mg + " гостей.");
      var bad = c.items.filter(function (it) { return it.r.on && !fin(it.s); }).map(function (it) { return it.r.name || "без названия"; });
      if (bad.length) w.push("Нет цены или количества, в сумму не вошло: " + bad.join(", ") + ".");
      $("tkWarn").hidden = !w.length; $("tkWarn").textContent = w.join(" ");
      var ps = $("tkPriceState");
      ps.className = "note " + (S.showPrices ? "warn" : "ok");
      ps.textContent = S.showPrices ? "Гость увидит цены услуг и меню." : "Цены услуг скрыты: гость увидит только состав и итоговую сумму.";
      $("tkPrev").innerHTML = docHTML(buildDoc(c, { prices: S.showPrices, menu: S.showMenu }), { prices: S.showPrices, menu: S.showMenu });
      store(LS, S);
      return c;
    }
    function docNow() { var c = calc(); var o = { prices: S.showPrices, menu: S.showMenu }; return { d: buildDoc(c, o), o: o }; }

    /* ---------- события ---------- */
    function rebuild(msgIfDirty) {
      var dirty = JSON.stringify(S.rows) !== JSON.stringify(mkRows(S.tpl, S.hall));
      S.rows = mkRows(S.tpl, S.hall); S.manual = false; autoTariff();
      renderAll();
      if (dirty && msgIfDirty) toast("Состав заменён на шаблон выбранного пакета");
    }
    function rebuildKeep(change) {
      var dirty = JSON.stringify(S.rows) !== JSON.stringify(mkRows(S.tpl, S.hall));
      change(); S.rows = mkRows(S.tpl, S.hall); S.manual = false; S.tariff = hallDef().tariffs[0].id; autoTariff();
      renderAll(); if (dirty) toast("Состав заменён на шаблон выбранного пакета");
    }
    $("tkTpl").addEventListener("change", function (e) { rebuildKeep(function () { S.tpl = e.target.value; }); });
    $("tkHall").addEventListener("change", function (e) { rebuildKeep(function () { S.hall = e.target.value; }); });
    $("tkTariff").addEventListener("change", function (e) { S.tariff = e.target.value; S.manual = true; renderRows(); update(); });
    $("tkMenu").addEventListener("change", function (e) { S.menu = e.target.value; S.tb = null; syncMods(); renderRows(); renderMenuBox(); update(); });
    $("tkClient").addEventListener("input", function (e) { S.client = e.target.value; update(); });
    $("tkGuests").addEventListener("input", function (e) { S.guests = num(e.target.value); update(); });
    $("tkDate").addEventListener("input", function (e) {
      S.date = e.target.value; var before = S.tariff; autoTariff();
      $("tkTariff").value = S.tariff;
      if (before !== S.tariff) renderRows();
      update();
    });
    $("tkShowPrices").addEventListener("change", function (e) { S.showPrices = e.target.checked; update(); });
    $("tkShowMenu").addEventListener("change", function (e) { S.showMenu = e.target.checked; update(); });
    $("tkNew").addEventListener("click", function () { S = fresh(S); renderAll(); toast("Новая смета"); });

    $("tkBody").addEventListener("input", function (e) {
      var tr = e.target.closest("tr[data-i]"); if (!tr) return;
      var r = S.rows[+tr.dataset.i], k = e.target.dataset.k; if (!r) return;
      if (k === "name") r.name = e.target.value;
      else if (k === "qty") r.qty = e.target.value;
      else if (k === "price") { if (r.tpl) r.ov = e.target.value === "" ? null : num(e.target.value); else r.price = e.target.value; }
      else return;
      update();
    });
    $("tkBody").addEventListener("change", function (e) {
      if (e.target.id === "tkSvcOn") { S.svcOn = e.target.checked; update(); return; }
      var tr = e.target.closest("tr[data-i]"); if (!tr) return;
      var r = S.rows[+tr.dataset.i], k = e.target.dataset.k; if (!r) return;
      if (k === "host") { if (e.target.value !== "") r.ov = Number(e.target.value); renderRows(); update(); }
      else if (k === "price") { renderRows(); update(); }
    });
    $("tkBody").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]"); if (!b) return;
      var i = +b.closest("tr").dataset.i, r = S.rows[i];
      if (b.dataset.act === "off") r.on = false;
      if (b.dataset.act === "on") r.on = true;
      if (b.dataset.act === "del") S.rows.splice(i, 1);
      renderRows(); update();
    });
    $("tkAddBtn").addEventListener("click", function () {
      var v = $("tkAddSel").value; if (!v) return;
      if (v === "custom") S.rows.push({ id: uid("c"), tpl: false, name: "", unit: "усл", qty: 1, on: true, price: "" });
      else { var s = DB.services.find(function (x) { return x.id === v; }); if (!s) return; S.rows.push({ id: uid("c"), tpl: false, name: s.name, unit: s.unit, qty: 1, on: true, price: s.price }); }
      $("tkAddSel").value = ""; renderRows(); update();
      if (v === "custom") { var ins = $("tkBody").querySelectorAll("input.dsel"); if (ins.length) ins[ins.length - 1].focus(); }
    });
    /* ---------- замена блюд прямо здесь: своя копия меню пакета, расчёт доплаты тот же, что во вкладке «Банкет» ---------- */
    function ensureTb() {
      var p = menuPkg();
      if (!p) { S.tb = null; return null; }
      if (!S.tb || S.tb.pkg !== p.id || !Array.isArray(S.tb.rows)) { S.tb = { pkg: p.id, rows: rowsFromPkg(p) }; S.mods = []; S.rows = S.rows.filter(function (r) { return r.id !== "mods"; }); }
      return S.tb;
    }
    function withB(fn) {
      var tb = S.tb, saved = B;
      B = { pkg: tb.pkg, rows: tb.rows, guests: S.guests, svc: {}, custom: [], svcOn: false, disc: NaN, manual: NaN };
      try { return fn(); } finally { B = saved; }
    }
    function syncMods() {
      var tb = ensureTb(); if (!tb) return null;
      var res = withB(function () {
        var mods = [];
        tb.rows.forEach(function (r) {
          var s = rowState(r); if (!s.changed || s.unknown && !r.removed && !r.dish) return;
          if (s.added) { if (r.dish) mods.push({ sec: r.sec, base: null, to: r.title, amt: amtOf(r.dish, r.g, r.pcs) }); return; }
          mods.push({ sec: r.sec, base: baseTitle(r), to: r.removed ? null : r.title, amt: amtOf(r.dish, r.g, r.pcs) });
        });
        var c = window.calc();
        return { mods: mods, use: c.use, why: c.why, rs: c.rs, rec: c.rec };
      });
      S.mods = res.mods;
      S.rows = S.rows.filter(function (r) { return r.id !== "mods"; });
      if (res.mods.length && res.use > 0) S.rows.push({ id: "mods", tpl: false, pg: true, name: "Изменения в меню", unit: "гост.", qty: 1, on: true, price: res.use });
      return res;
    }
    function modsInfo() {
      var n = (S.mods || []).length, el = $("tkModsInfo"); if (!el) return;
      el.textContent = n
        ? "Замен в меню: " + n + ". В смете гостя блюда обновлены, доплата добавлена строкой «Изменения в меню»."
        : "Гость хочет заменить блюдо? Начните вводить новое название в нужной строке. Доплата посчитается сама и добавится в смету.";
    }
    function renderMenuBox() {
      var tb = ensureTb(), body = $("tkMenuBody");
      if (!tb) { body.innerHTML = '<tr><td colspan="4" class="muted">Нет пакета меню с ценой.</td></tr>'; return; }
      var h = "", last = null;
      tb.rows.forEach(function (r, i) {
        if (r.sec !== last) { h += '<tr class="sec"><td colspan="4">' + esc(r.sec) + "</td></tr>"; last = r.sec; }
        var d = dishById(r.dish), isPcs = d && d.unit === "шт";
        var q = isPcs
          ? '<div class="qty"><input class="num" data-k="pcs" inputmode="decimal" value="' + (fin(r.pcs) ? r.pcs : "") + '" aria-label="Штук на гостя"><span>шт</span></div>'
          : '<div class="qty"><input class="num" data-k="g" inputmode="decimal" value="' + (fin(r.g) ? r.g : "") + '" aria-label="Граммов на гостя"><span>' + (d && d.unit === "л" ? "мл" : "г") + "</span></div>";
        var changed = r.base && (r.dish !== r.base.dish || r.g !== r.base.g || r.pcs !== r.base.pcs || r.removed);
        h += '<tr data-i="' + i + '"><td><input class="dsel" list="dishList" data-k="dish" value="' + esc(r.title) + '" aria-label="Блюдо"><div class="aiko"><span data-o="chips"></span></div></td>' +
          '<td class="r">' + q + '</td><td class="r v int" data-o="delta"></td><td class="r" style="white-space:nowrap">' +
          (changed ? '<button type="button" class="icon" data-act="undo" title="Вернуть как в пакете" aria-label="Вернуть как в пакете">↺</button>' : "") +
          '<button type="button" class="icon" data-act="' + (r.base ? (r.removed ? "restore" : "remove") : "del") + '" aria-label="' + (r.removed ? "Вернуть блюдо" : "Убрать блюдо") + '">' + (r.removed ? "+" : "✕") + "</button></td></tr>";
      });
      body.innerHTML = h;
      updateMenuBox();
    }
    function updateMenuBox() {
      var tb = S.tb; if (!tb) return;
      var c = withB(function () { var x = window.calc(); return { rs: x.rs, use: x.use, why: x.why, rec: x.rec, safeRed: x.safeRed || 0, normRed: x.normRed || 0, addG: x.addG || 0, remG: x.remG || 0 }; });
      var body = $("tkMenuBody");
      [].forEach.call(body.querySelectorAll("tr[data-i]"), function (tr) {
        var i = +tr.dataset.i, r = tb.rows[i], s = c.rs[i], d = dishById(r.dish); if (!r || !s) return;
        tr.classList.toggle("changed", s.changed && !r.removed); tr.classList.toggle("removed", !!r.removed);
        var ch = "";
        if (r.removed) ch += '<span class="chip mute">убрано</span>';
        else if (s.added) ch += '<span class="chip swap">сверх пакета</span>';
        else if (s.swapped) ch += '<span class="chip swap">замена</span>';
        else if (s.qtyChanged) ch += '<span class="chip swap">граммовка изменена</span>';
        if (!d) ch += '<span class="chip bad">нет в справочнике</span>';
        else if (!fin(d.cost)) ch += '<span class="chip bad int">нет себестоимости</span>';
        tr.querySelector('[data-o="chips"]').innerHTML = ch;
        var dl = tr.querySelector('[data-o="delta"]');
        dl.textContent = s.changed ? (s.unknown ? "?" : (s.delta > 0 ? "+" : s.delta < 0 ? "−" : "") + fm(Math.abs(s.delta), 2)) : "";
        dl.className = "r v int " + (s.delta > 0 ? "pos" : s.delta < 0 ? "neg" : "");
        if (window.rzGstHtml) dl.insertAdjacentHTML("beforeend", window.rzGstHtml(s));
      });
      var n = $("tkMenuNote"), G = num(S.guests);
      if (!(S.mods || []).length) { n.hidden = true; return; }
      n.hidden = false; n.className = "note " + (c.use > 0 ? "warn" : "ok");
      n.textContent = c.use > 0
        ? "Доплата за изменения: " + fm(c.use) + " ₽ на гостя" + (G > 0 ? ", " + fm(c.use * G) + " ₽ на всех гостей" : "") + ". " + c.why
        : c.why + (c.safeRed > 0 ? " Если гость просит скидку за убранное: не больше " + fm(c.safeRed) + " ₽ на гостя" + (G > 0 ? " (" + fm(c.safeRed * G) + " ₽ на всех)" : "") + ", иначе прибыль в рублях упадёт. В смету скидка не добавляется сама." : "");
    }
    function renderRef() {
      var el = $("tkRef"); if (!el) return;
      var tb = S.tb; if (!tb) { el.innerHTML = ""; return; }
      var G = num(S.guests);
      var x = withB(function () {
        var c = window.calc(), rows = [];
        tb.rows.forEach(function (r, i) {
          var st = c.rs[i]; if (!st || !st.changed) return;
          rows.push({ from: r.base ? baseTitle(r) : null, to: r.removed ? null : r.title, delta: st.delta, base: st.base, cur: st.cur, unknown: st.unknown, gst: st.gst, capFrom: st.capFrom });
        });
        return { rows: rows, P: c.P, F: c.F, D: c.D, rec: c.rec, use: c.use, why: c.why, cost0: c.st.cost, addG: c.addG || 0, remG: c.remG || 0, safeRed: c.safeRed || 0, normRed: c.normRed || 0, hasP: !!c.p };
      });
      if (!x.hasP) { el.innerHTML = ""; return; }
      function kv(a, b, cls) { return '<div class="kv ' + (cls || "sm") + '"><span>' + a + "</span><span>" + b + "</span></div>"; }
      function tot(v) { return fm(v) + " ₽" + (G > 0 ? " · на всех " + fm(v * G) + " ₽" : ""); }
      var h = '<h3 style="margin:14px 0 6px;font-size:.95rem">Замены меню: расчёт доплаты</h3>';
      h += kv("Пакет «" + esc((menuPkg() || {}).name || "") + "»: цена на гостя", fm(x.P) + " ₽");
      h += kv("Себестоимость пакета / фудкост", fm(x.cost0, 2) + " ₽ / " + pct(x.F));
      if (!x.rows.length) { el.innerHTML = h + '<p class="why">Замен нет: меню как в пакете, доплаты нет.</p>'; return; }
      h += '<div style="margin:8px 0 4px;font-weight:600;font-size:.85rem">Что изменено</div>';
      x.rows.forEach(function (r) {
        var what = r.from === null ? "Добавлено: «" + esc(r.to) + "»" : r.to === null ? "Убрано: «" + esc(r.from) + "»" : r.from === r.to ? "Граммовка: «" + esc(r.to) + "»" : "«" + esc(r.from) + "» → «" + esc(r.to) + "»";
        var val = r.unknown ? "нет себестоимости" : "себест. " + fm(r.base, 2) + " → " + fm(r.cur, 2) + " (" + sgn(r.delta) + " ₽); гостю " + (r.gst > 0 ? "+" : r.gst < 0 ? "−" : "") + fm(Math.abs(r.gst)) + " ₽";
        h += '<div class="kv sm" style="align-items:flex-start;gap:10px"><span>' + what + '</span><span style="text-align:right">' + val + "</span></div>";
      });
      h += kv("Разница себестоимости на гостя", sgn(x.D) + " ₽");
      h += kv("Доплата за замены и добавки (по норме)", x.addG > 0 ? "+" + fm(x.addG) + " ₽" : "—");
      h += kv("Скидка за убранное и более дешёвое (по норме)", x.remG > 0 ? "−" + fm(x.remG) + " ₽" : "—");
      h += kv("Идёт в смету гостя (строка «Изменения в меню»)", x.use > 0 ? tot(x.use) : "ничего", "em");
      var cost1 = x.cost0 + (x.unknownAny ? 0 : x.D), price1 = x.P + (x.use > 0 ? x.use : 0);
      h += kv("Себестоимость меню после замен", fm(cost1, 2) + " ₽ (было " + fm(x.cost0, 2) + " ₽)");
      if (price1 > 0) h += kv("Фудкост после замен", pct(cost1 / price1) + " (было " + pct(x.F) + ")");
      h += kv("Прибыль с блюд на гостя", fm(price1 - cost1, 2) + " ₽ (было " + fm(x.P - x.cost0, 2) + " ₽)");
      if (x.safeRed > 0) {
        h += kv("Если гость просит скидку: не больше (прибыль в рублях не падает)", tot(x.safeRed));
        h += kv("Скидка по норме фудкоста (прибыль падает)", tot(x.normRed));
      }
      if (x.rows.some(function (r) { return r.capFrom; })) h += '<p class="why">Замена на блюдо из более дорогого пакета: доплата ограничена разницей цен пакетов.</p>';
      h += '<p class="why">' + esc(x.why) + "</p>";
      el.innerHTML = h;
    }
    function menuChanged() { syncMods(); renderRows(); update(); updateMenuBox(); }
    function tbRow(el) { var tr = el.closest("tr[data-i]"); return tr && S.tb ? { tr: tr, i: +tr.dataset.i, r: S.tb.rows[+tr.dataset.i] } : null; }
    $("tkMenuBody").addEventListener("input", function (e) {
      var x = tbRow(e.target), k = e.target.dataset.k; if (!x || !x.r) return;
      if (k === "g" || k === "pcs") { x.r[k] = num(e.target.value); if (!fin(x.r[k])) x.r[k] = 0; menuChanged(); }
    });
    $("tkMenuBody").addEventListener("change", function (e) {
      var x = tbRow(e.target); if (!x || !x.r || e.target.dataset.k !== "dish") return;
      var r = x.r, v = e.target.value.trim();
      var bt = r.base ? withB(function () { return baseTitle(r); }) : null;
      if (r.base && norm(v) === norm(bt)) { r.dish = r.base.dish; r.title = bt; r.g = r.base.g; r.pcs = r.base.pcs; }
      else {
        var d = findDish(v);
        if (!d) { toast("Такого блюда нет в справочнике"); e.target.value = r.title; return; }
        var od = dishById(r.dish); r.dish = d.id; r.title = clean(d.name);
        if (d.unit === "шт" && !(r.pcs > 0)) r.pcs = 1;
        if (d.unit !== "шт" && !(r.g > 0)) r.g = od && od.unit === "шт" ? 40 : 100;
      }
      r.removed = false; renderMenuBox(); menuChanged();
    });
    $("tkMenuBody").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]"), x = b && tbRow(b); if (!x || !x.r) return;
      var r = x.r, a = b.dataset.act;
      if (a === "remove") r.removed = true;
      if (a === "restore") r.removed = false;
      if (a === "undo") { r.dish = r.base.dish; r.g = r.base.g; r.pcs = r.base.pcs; r.removed = false; r.title = withB(function () { return baseTitle(r); }); }
      if (a === "del") S.tb.rows.splice(x.i, 1);
      renderMenuBox(); menuChanged();
    });
    $("tkMenuAdd").addEventListener("click", function () {
      if (!ensureTb()) return;
      S.tb.rows.push({ sec: "Дополнительно", title: "", base: null, dish: null, g: 100, pcs: 1, removed: false });
      $("tkMenuBox").open = true; renderMenuBox(); menuChanged();
      var ins = $("tkMenuBody").querySelectorAll("input.dsel"); if (ins.length) ins[ins.length - 1].focus();
    });
    $("tkMenuReset").addEventListener("click", function () {
      var p = menuPkg(); if (!p) return;
      S.tb = { pkg: p.id, rows: rowsFromPkg(p) }; renderMenuBox(); menuChanged(); toast("Меню как в пакете");
    });
    $("tkPriceTbl").addEventListener("change", function (e) {
      var id = e.target.dataset.pr, t = e.target.dataset.pt; if (!id) return;
      var v = num(e.target.value);
      TKP[S.tpl] = TKP[S.tpl] || {}; TKP[S.tpl][S.hall] = TKP[S.tpl][S.hall] || {}; TKP[S.tpl][S.hall][id] = TKP[S.tpl][S.hall][id] || {};
      if (fin(v)) TKP[S.tpl][S.hall][id][t] = v; else delete TKP[S.tpl][S.hall][id][t];
      store(LSP, TKP); renderPrices(); renderRows(); update(); toast("Цена сохранена");
    });
    $("tkPriceReset").addEventListener("click", function () {
      if (TKP[S.tpl]) delete TKP[S.tpl][S.hall];
      store(LSP, TKP); renderPrices(); renderRows(); update(); toast("Цены как в таблице");
    });

    $("tkPrint").addEventListener("click", function () { var x = docNow(); $("printArea").innerHTML = docHTML(x.d, x.o); window.print(); });
    $("tkCopy").addEventListener("click", function () {
      var x = docNow(), t = docText(x.d, x.o);
      var fb = function () { var ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Смета скопирована"); } catch (e) { toast("Не удалось скопировать"); } ta.remove(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast("Смета скопирована"); }, fb); else fb();
    });
    $("tkXls").addEventListener("click", function () {
      var x = docNow();
      loadXLSX(function () {
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, xSheet(docRows(x.d, x.o), [52, 14, 16, 18]), "Смета");
        XLSX.writeFile(wb, "Смета_" + fileSafe(S.client || TPL[S.tpl].name) + "_" + (S.date || today()) + ".xlsx");
        toast("Смета сохранена в Excel");
      });
    });

    /* ---------- вкладка в общей навигации ---------- */
    var _show = showTab;
    showTab = function (t) {
      if (t === "tk") {
        document.querySelectorAll("nav.tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === "tk"); });
        ["banq", "pkgs", "dish", "saved", "fur", "ct"].forEach(function (k) { var el = $("tab-" + k); if (el) el.hidden = true; document.body.classList.remove("tab-" + k); });
        $("tab-tk").hidden = false; document.body.classList.add("tab-tk");
        renderAll();
        try { localStorage.setItem(KEY + "-tab", "tk"); } catch (e) {}
        return;
      }
      $("tab-tk").hidden = true; document.body.classList.remove("tab-tk");
      _show(t);
    };
    autoTariff();
    if (window.__TK_TEST__) window.__TK_API__ = { calc: calc, S: function () { return S; }, TPL: TPL, buildDoc: buildDoc, docHTML: docHTML, docText: docText, docRows: docRows };
    try { if (localStorage.getItem(KEY + "-tab") === "tk") showTab("tk"); } catch (e) {}
  } catch (err) {
    if (window.console) console.error("tk.js", err);
    try { if (localStorage.getItem(KEY + "-tab") === "tk") { localStorage.setItem(KEY + "-tab", "banq"); showTab("banq"); } } catch (e) {}
  }
})();
