"use strict";
const SEED = window.RIZZW_SEED || JSON.parse(document.getElementById("seed").textContent);
const KEY = "rizzw-banquet-calc-v1";
const SECS = ["Закуски","Горячая закуска","Салаты","Основное блюдо","Гарнир","Фрукты","Хлеб","Напитки","Дополнительно"];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num = v => { if (v === "" || v == null) return NaN; const n = parseFloat(String(v).replace(/[\s ]/g,"").replace(",",".")); return isFinite(n) ? n : NaN; };
const fin = v => typeof v === "number" && isFinite(v);
const fm = (v, d = 0) => fin(v) ? v.toLocaleString("ru-RU", {minimumFractionDigits: d, maximumFractionDigits: d}) : "—";
const rub = (v, d = 0) => fin(v) ? fm(v, d) + " ₽" : "—";
const pct = v => fin(v) ? fm(v * 100, 1) + "%" : "—";
const sgn = (v, d = 2) => fin(v) ? (v > 0 ? "+" : v < 0 ? "−" : "") + fm(Math.abs(v), d) : "—";
const norm = s => String(s || "").toLowerCase().replace(/[«»"“”„']/g, '"').replace(/ё/g, "е").replace(/\s+/g, " ").trim();
const clone = o => JSON.parse(JSON.stringify(o));
const clean = s => String(s || "").replace(/\s+(RW|LX|RizzW)\b/g, "").replace(/\s+1700$/, "").trim();
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toISOString().slice(0, 10);
/* ---------- состояние ---------- */
let DB, B, PUB = "", ART = null, readOnly = false;
function freshDB() { const d = clone(SEED); return normDB(d); }
function normDB(d) { d.banquets = d.banquets || []; d.settings = Object.assign({}, SEED.settings, d.settings || {}); d.rev = d.rev || SEED.rev; return d; }
function newBanquet(pkgId) {
const p = DB.packages.find(x => x.id === pkgId) || DB.packages[0];
return { id: null, client: "", date: "", guests: 30, pkg: p ? p.id : null, rows: p ? rowsFromPkg(p) : [],
svc: {}, custom: [], svcOn: true, disc: NaN, manual: NaN };
}
function rowsFromPkg(p) {
return p.lines.map(l => ({ sec: l.sec, title: l.title, base: { dish: l.dish, g: l.g, pcs: l.pcs }, dish: l.dish, g: l.g, pcs: l.pcs, removed: false }));
}
function exampleBanquet() { // пример: замена горячего у Кости
const b = newBanquet("p1"); b.client = "Костя (пример)"; b.date = "2026-12-17"; b.guests = 30; b.manual = 300;
const by = n => (DB.dishes.find(d => d.name === n) || {}).id;
const sw = (from, to) => { const r = b.rows.find(x => x.dish === by(from)); const d = by(to); if (r && d) { r.dish = d; r.title = clean(to); } };
sw("Томленая буженина BBQ RW", "Томленая буженина из мраморной говядины BBQ RW");
sw("Колбаски свиные на гриле", "Дорада запеченная со специями");
return b;
}
function load() {
let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
PUB = JSON.stringify(freshDB());
// своя копия данных берётся, только если она сделана с этой же опубликованной версии
DB = s && s.db && Array.isArray(s.db.dishes) && s.db.rev === SEED.rev ? normDB(s.db) : freshDB();
B = s && s.cur && Array.isArray(s.cur.rows) ? s.cur : exampleBanquet();
}
let saveT;
function saveNow() { try { localStorage.setItem(KEY, JSON.stringify({ db: DB, cur: B })); } catch (e) {} }
function save() { clearTimeout(saveT); saveT = setTimeout(() => { saveNow(); updShare(); }, 250); }
function updShare() { $("shareBar").hidden = !ART || readOnly || JSON.stringify(DB) === PUB; $("roNote").hidden = !(ART && readOnly && JSON.stringify(DB) !== PUB); }
function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 2200); }
/* ---------- расчёт ---------- */
const dishById = id => DB.dishes.find(d => d.id === id);
function lineCost(dishId, g, pcs) {
const d = dishById(dishId); if (!d || !fin(d.cost)) return NaN;
return d.unit === "шт" ? (fin(pcs) ? pcs : 0) * d.cost : (fin(g) ? g : 0) / 1000 * d.cost;
}
function pkgStats(p) {
let c = 0, miss = [], star = [], chk = [];
p.lines.forEach(l => { const v = lineCost(l.dish, l.g, l.pcs); const d = dishById(l.dish);
if (fin(v)) c += v; else miss.push(l.title);
if (d && d.star) star.push(l.title); if (l.check) chk.push(l.title); });
return { cost: c, fc: p.price > 0 ? c / p.price : NaN, miss, star, chk };
}
function srcPrice(dishId) { // цена самого дешёвого типового пакета с этим блюдом; если блюда нет в пакетах — по группе в Айко
let best = NaN;
DB.packages.forEach(p => { if (p.kind === "package" && p.lines.some(l => l.dish === dishId) && !(best <= p.price)) best = p.price; });
if (!fin(best)) { const d = dishById(dishId); best = d && DB.groupPrice ? num(DB.groupPrice[d.group]) : NaN; }
return best;
}
function rowState(r) {
const base = r.base ? lineCost(r.base.dish, r.base.g, r.base.pcs) : 0;
const cur = r.removed ? 0 : lineCost(r.dish, r.g, r.pcs);
const swapped = r.base && r.dish !== r.base.dish;
const qtyChanged = r.base && !swapped && (r.g !== r.base.g || r.pcs !== r.base.pcs);
const added = !r.base;
const changed = r.removed || swapped || qtyChanged || added;
const unknown = changed && (!fin(base) || !fin(cur));
return { base, cur, delta: changed && !unknown ? cur - base : 0, swapped, qtyChanged, added, changed, unknown };
}
function calc() {
const p = DB.packages.find(x => x.id === B.pkg);
const P = p ? p.price : NaN, G = num(B.guests);
const st = p ? pkgStats(p) : { cost: NaN, fc: NaN, miss: [], star: [], chk: [] };
const F = st.fc;
let dS = 0, dO = 0, capP = NaN, unknown = [], curCost = 0;
const rs = B.rows.map(r => {
const s = rowState(r);
if (fin(s.cur)) curCost += s.cur;
if (s.unknown) unknown.push(r.title);
if (s.changed && !s.unknown) {
const sp = s.swapped ? srcPrice(r.dish) : NaN;
if (s.swapped && fin(sp) && fin(P) && sp > P) { dS += s.delta; capP = fin(capP) ? Math.max(capP, sp) : sp; s.capFrom = sp; }
else dO += s.delta;
}
return s;
});
const D = dS + dO, min = Math.max(0, D), nrm = F > 0 ? Math.max(0, D) / F : NaN;
const cap = fin(capP) ? capP - P : NaN;
let rec = 0, why = "";
const R = Math.max(1, num(DB.settings.roundTo) || 50), up = v => Math.ceil(v / R - 1e-9) * R;
if (!p) why = "Выберите пакет.";
else if (!(F > 0)) { rec = NaN; why = "Нет себестоимости пакета: проверьте цены в справочнике."; }
else if (D <= 0.005) { rec = 0; why = B.rows.some(r => rowState(r).changed) ? "Изменения не дороже исходного меню. Доплату не берём, цену пакета не снижаем." : "Меню без изменений."; }
else {
const capped = fin(cap) && dS > 0 && dS / F > cap;
if (capped) rec = Math.max(cap + (dO > 0 ? up(dO / F) : dO / F), up(D));
else rec = up(Math.max((dS + dO) / F, D));
if (capped) why = "Норма по заменам выше разницы цен пакетов, поэтому замены считаем по потолку: гость платит как за пакет, из которого блюдо." + (dO > 0 ? " Остальные изменения — по норме." : "");
else why = "Норма: разница себестоимости ÷ фудкост пакета, округлено вверх до " + fm(R) + " ₽. Наценка пакета сохраняется.";
}
const man = num(B.manual), use = fin(man) ? man : rec;
const perGuest = fin(P) ? P + (fin(use) ? use : 0) : NaN;
const menu = fin(perGuest) && G > 0 ? perGuest * G : NaN;
const disc = fin(num(B.disc)) ? num(B.disc) / 100 : 0;
const menuD = fin(menu) ? menu * (1 - disc) : NaN;
const svcPct = (num(DB.settings.service) || 0) / 100;
const svc = B.svcOn && fin(menuD) ? menuD * svcPct : 0;
let svcs = 0;
DB.services.forEach(s => { const q = num(B.svc[s.id]); if (q > 0) svcs += q * s.price; });
B.custom.forEach(c => { const q = num(c.qty), pr = num(c.price); if (fin(q) && fin(pr)) svcs += q * pr; });
const total = (fin(menuD) ? menuD : 0) + svc + svcs;
const pre = total * (num(DB.settings.prepay) || 0) / 100;
const foodCost = G > 0 ? curCost * G : NaN;
return { p, P, G, st, F, rs, dS, dO, D, min, nrm, cap, rec, why, man, use, perGuest, menu, disc, menuD, svc, svcPct, svcs, total, pre,
foodCost, fcB: fin(menuD) && menuD > 0 ? foodCost / menuD : NaN, gp: fin(menuD) ? menuD - foodCost : NaN, unknown };
}
/* ---------- даты ---------- */
const parseD = s => { if (!s) return null; const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtD = d => d ? d.toLocaleDateString("ru-RU") : "—";
const minusDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() - n); return x; };
const minusWork = (d, n) => { const x = new Date(d); let k = 0; while (k < n) { x.setDate(x.getDate() - 1); const w = x.getDay(); if (w !== 0 && w !== 6) k++; } return x; };
/* ---------- вкладки ---------- */
function showTab(t) {
document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
["banq", "pkgs", "dish", "saved"].forEach(k => { $("tab-" + k).hidden = k !== t; document.body.classList.toggle("tab-" + k, k === t); });
if (t === "banq") renderBanq(); if (t === "pkgs") renderPkgs(); if (t === "dish") renderDish(); if (t === "saved") renderSaved();
try { localStorage.setItem(KEY + "-tab", t); } catch (e) {}
}
document.querySelector("nav.tabs").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab); });
document.addEventListener("click", e => { const g = e.target.closest("[data-goto]"); if (g) showTab(g.dataset.goto); });
function fillDishList() { $("dishList").innerHTML = DB.dishes.map(d => `<option value="${esc(d.name)}">`).join(""); }
function findDish(name) { const n = norm(name); return DB.dishes.find(d => norm(d.name) === n) || DB.dishes.find(d => norm(clean(d.name)) === n); }
/* ---------- БАНКЕТ: рендер ---------- */
function renderBanq() {
fillDishList();
$("bPkg").innerHTML = DB.packages.map(p => `<option value="${p.id}"${p.id === B.pkg ? " selected" : ""}>${esc(p.name)} — ${fm(p.price)} ₽</option>`).join("");
$("bClient").value = B.client || ""; $("bDate").value = B.date || ""; $("bGuests").value = fin(num(B.guests)) ? B.guests : "";
$("bManual").value = fin(num(B.manual)) ? B.manual : ""; $("bDisc").value = fin(num(B.disc)) ? B.disc : ""; $("bSvcOn").checked = !!B.svcOn;
renderMenu(); renderSvc(); recalc();
}
function renderMenu() {
let html = "", last = null;
B.rows.forEach((r, i) => {
if (r.sec !== last) { html += `<tr class="sec"><td colspan="5">${esc(r.sec)}</td></tr>`; last = r.sec; }
const d = dishById(r.dish);
const isPcs = d && d.unit === "шт";
const q = isPcs
? `<div class="qty"><input class="num" data-k="pcs" inputmode="decimal" value="${fin(r.pcs) ? r.pcs : ""}" aria-label="Штук на гостя"><span>шт</span></div>`
: `<div class="qty"><input class="num" data-k="g" inputmode="decimal" value="${fin(r.g) ? r.g : ""}" aria-label="Граммов на гостя"><span>${d && d.unit === "л" ? "мл" : "г"}</span></div>`;
html += `<tr data-i="${i}">
<td><input class="dsel" list="dishList" data-k="dish" value="${esc(r.title)}" aria-label="Блюдо"><div class="aiko"><span data-o="chips"></span> <span class="int" data-o="aiko"></span></div></td>
<td class="r">${q}</td>
<td class="r v int" data-o="cost"></td>
<td class="r v int" data-o="delta"></td>
<td class="r" style="white-space:nowrap">${r.base && (r.dish !== r.base.dish || r.g !== r.base.g || r.pcs !== r.base.pcs || r.removed) ? `<button type="button" class="icon" data-act="undo" title="Вернуть как в пакете" aria-label="Вернуть как в пакете">↺</button>` : ""}<button type="button" class="icon" data-act="${r.base ? (r.removed ? "restore" : "remove") : "del"}" title="${r.removed ? "Вернуть" : "Убрать"}" aria-label="${r.removed ? "Вернуть блюдо" : "Убрать блюдо"}">${r.removed ? "+" : "✕"}</button></td></tr>`;
});
$("menuBody").innerHTML = html || `<tr><td colspan="5" class="muted">Выберите пакет.</td></tr>`;
}
function renderSvc() {
let html = "", grp = null;
DB.services.forEach(s => {
if (s.grp !== grp) { html += `<tr class="sec"><td colspan="5">${esc(s.grp)}</td></tr>`; grp = s.grp; }
const q = B.svc[s.id];
html += `<tr data-s="${s.id}"><td>${esc(s.name)}</td><td class="r v">${fm(s.price)}${s.unit === "час" ? " / час" : s.unit === "шт" ? " / шт" : ""}</td>
<td class="r"><input class="num" style="width:76px" data-k="svc" inputmode="decimal" value="${fin(num(q)) ? q : ""}" placeholder="0" aria-label="Количество"></td>
<td class="r v" data-o="sum"></td><td></td></tr>`;
});
if (B.custom.length) html += `<tr class="sec"><td colspan="5">Свои строки</td></tr>`;
B.custom.forEach((c, i) => {
html += `<tr data-c="${i}"><td><input data-k="name" value="${esc(c.name)}" placeholder="Например, ведущий" aria-label="Название"></td>
<td class="r"><input class="num" style="width:96px" data-k="price" inputmode="decimal" value="${fin(num(c.price)) ? c.price : ""}" aria-label="Цена"></td>
<td class="r"><input class="num" style="width:76px" data-k="qty" inputmode="decimal" value="${fin(num(c.qty)) ? c.qty : ""}" aria-label="Количество"></td>
<td class="r v" data-o="sum"></td><td class="r"><button type="button" class="icon" data-act="delc" aria-label="Удалить строку">✕</button></td></tr>`;
});
$("svcBody").innerHTML = html;
}
function recalc() {
const c = calc();
// строки меню
[...$("menuBody").querySelectorAll("tr[data-i]")].forEach(tr => {
const i = +tr.dataset.i, r = B.rows[i], s = c.rs[i], d = dishById(r.dish);
tr.classList.toggle("changed", s.changed && !r.removed); tr.classList.toggle("removed", !!r.removed);
let chips = "";
if (r.removed) chips += `<span class="chip mute">убрано</span>`;
else if (s.added) chips += `<span class="chip swap">сверх пакета</span>`;
else if (s.swapped) chips += `<span class="chip swap">замена${r.base ? ": было «" + esc(baseTitle(r)) + "»" : ""}</span>`;
else if (s.qtyChanged) chips += `<span class="chip swap">${(r.g || 0) > (r.base.g || 0) || (r.pcs || 0) > (r.base.pcs || 0) ? "больше" : "меньше"} граммовка</span>`;
if (s.capFrom) chips += `<span class="chip mute int">из пакета ${fm(s.capFrom)}</span>`;
if (!d) chips += `<span class="chip bad">нет в справочнике</span>`;
else if (!fin(d.cost)) chips += `<span class="chip bad int">нет себестоимости</span>`;
else if (d.star) chips += `<span class="chip warn int">цена со * в Айко</span>`;
if (d && d.unitGuess) chips += `<span class="chip warn int">проверьте единицу: ${esc(d.unit)}</span>`;
tr.querySelector('[data-o="chips"]').innerHTML = chips;
tr.querySelector('[data-o="aiko"]').textContent = d ? `Айко: ${d.name}${fin(d.cost) ? " · " + fm(d.cost, 2) + " ₽/" + d.unit : ""}` : "";
tr.querySelector('[data-o="cost"]').textContent = r.removed ? "0,00" : fm(s.cur, 2);
const del = tr.querySelector('[data-o="delta"]');
del.textContent = s.changed ? (s.unknown ? "?" : sgn(s.delta)) : "";
del.className = "r v int " + (s.delta > 0 ? "pos" : s.delta < 0 ? "neg" : "");
});
// услуги
[...$("svcBody").querySelectorAll("tr[data-s]")].forEach(tr => { const s = DB.services.find(x => x.id === tr.dataset.s); const q = num(B.svc[s.id]); tr.querySelector('[data-o="sum"]').textContent = q > 0 ? fm(q * s.price) : ""; });
[...$("svcBody").querySelectorAll("tr[data-c]")].forEach(tr => { const x = B.custom[+tr.dataset.c]; const v = num(x.price) * num(x.qty); tr.querySelector('[data-o="sum"]').textContent = fin(v) ? fm(v) : ""; });
$("svcTot").textContent = fm(c.svcs);
// сводка
$("pkgNote").textContent = c.p ? `${c.p.note || ""} Цена ${fm(c.P)} ₽ на гостя.` : "";
$("hdrSub").textContent = `Цены Айко на ${fmtD(parseD(DB.pricesDate))}`;
$("sRec").textContent = rub(c.rec);
$("sRecTot").textContent = fin(c.rec) && c.G > 0 ? `× ${fm(c.G)} гостей = ${rub(c.rec * c.G)}` : "";
$("sWhy").textContent = c.why;
$("sC0").textContent = rub(c.st.cost, 2); $("sF").textContent = pct(c.F); $("sD").textContent = sgn(c.D) + " ₽";
$("sMin").textContent = rub(c.min); $("sNorm").textContent = rub(c.nrm); $("sCap").textContent = fin(c.cap) ? rub(c.cap) : "нет (блюда не из дорогого пакета)";
const mn = $("sManualNote");
if (fin(c.man)) { mn.hidden = false;
if (c.man < c.min - 0.005) { mn.className = "note bad"; mn.textContent = `Ниже себестоимости изменений: убыток ${rub(c.min - c.man)} на гостя${c.G > 0 ? ", " + rub((c.min - c.man) * c.G) + " за банкет" : ""}.`; }
else if (c.man < c.rec) { mn.className = "note warn"; mn.textContent = `Убытка нет, но недополучаем ${rub(c.rec - c.man)} на гостя${c.G > 0 ? ", " + rub((c.rec - c.man) * c.G) + " за банкет" : ""}.`; }
else { mn.className = "note ok"; mn.textContent = "Не меньше рекомендованной доплаты."; }
} else mn.hidden = true;
$("lMenu").textContent = fin(c.perGuest) && c.G > 0 ? `Меню: ${fm(c.perGuest)} ₽ × ${fm(c.G)} гостей` : "Меню";
$("tMenu").textContent = rub(c.menu);
$("rowDisc").hidden = !(c.disc > 0); $("tDisc").textContent = "−" + rub(c.menu * c.disc);
$("lSvcOn").textContent = `Обслуживание ${fm(c.svcPct * 100)}%`;
$("rowSvc").hidden = !B.svcOn; $("lSvc").textContent = `Обслуживание ${fm(c.svcPct * 100)}%`; $("tSvc").textContent = rub(c.svc);
$("tSvcs").textContent = rub(c.svcs); $("tTotal").textContent = rub(c.total);
const dt = parseD(B.date);
$("lPre").textContent = `Предоплата ${fm(num(DB.settings.prepay))}% при договоре`; $("tPre").textContent = rub(c.pre);
$("lRest").textContent = dt ? `Остаток до ${fmtD(minusDays(dt, num(DB.settings.payDays) || 0))}` : `Остаток (за ${fm(num(DB.settings.payDays))} дней до мероприятия)`;
$("tRest").textContent = rub(c.total - c.pre);
$("rowChg").hidden = !dt; if (dt) $("tChg").textContent = fmtD(minusWork(dt, num(DB.settings.changeDays) || 0));
$("mRec").textContent = rub(fin(c.man) ? c.man : c.rec); $("mTot").textContent = rub(c.total);
$("iCost").textContent = rub(c.foodCost); $("iFc").textContent = pct(c.fcB); $("iGp").textContent = rub(c.gp);
$("iGpG").textContent = c.G > 0 ? rub(c.gp / c.G) : "—";
const w = [];
if (c.st.miss.length) w.push(`<p class="note bad">Нет себестоимости: ${esc(c.st.miss.join(", "))}. Фудкост пакета и доплата посчитаны без них — фудкост занижен, доплата завышена.</p>`);
if (c.unknown.length) w.push(`<p class="note bad">Не посчитана разница по строкам: ${esc(c.unknown.join(", "))} — нет себестоимости.</p>`);
if (c.st.star.length) w.push(`<p class="note warn">Цена со звёздочкой в Айко (может быть неточной): ${esc(c.st.star.join(", "))}.</p>`);
const fw = (num(DB.settings.fcWarn) || 0) / 100;
if (fw > 0 && c.fcB > fw) w.push(`<p class="note warn">Фудкост банкета ${pct(c.fcB)} выше порога ${pct(fw)}.</p>`);
$("iWarn").innerHTML = w.join(""); $("iWarn").hidden = !w.length;
// кухня
const kit = {};
B.rows.forEach(r => { if (r.removed) return; const d = dishById(r.dish); const k = r.dish || r.title;
kit[k] = kit[k] || { name: d ? d.name : r.title, unit: d ? d.unit : "кг", g: 0, pcs: 0 };
kit[k].g += num(r.g) || 0; kit[k].pcs += num(r.pcs) || 0; });
$("kitBody").innerHTML = Object.values(kit).map(k => k.unit === "шт"
? `<tr><td>${esc(k.name)}</td><td class="r v">${fm(k.pcs, 1)} шт</td><td class="r v">${c.G > 0 ? fm(k.pcs * c.G) + " шт" : "—"}</td></tr>`
: `<tr><td>${esc(k.name)}</td><td class="r v">${fm(k.g)} ${k.unit === "л" ? "мл" : "г"}</td><td class="r v">${c.G > 0 ? fm(k.g * c.G / 1000, 2) + (k.unit === "л" ? " л" : " кг") : "—"}</td></tr>`).join("");
save();
return c;
}
function baseTitle(r) { const p = DB.packages.find(x => x.id === B.pkg); const l = p && p.lines.find(l => l.dish === r.base.dish && l.g === r.base.g); const d = dishById(r.base.dish); return l ? l.title : d ? d.name : "?"; }
/* ---------- БАНКЕТ: события ---------- */
["bClient", "bDate"].forEach(id => $(id).addEventListener("input", e => { B[id === "bClient" ? "client" : "date"] = e.target.value; recalc(); }));
$("bGuests").addEventListener("input", e => { B.guests = num(e.target.value); recalc(); });
$("bManual").addEventListener("input", e => { B.manual = num(e.target.value); recalc(); });
$("bDisc").addEventListener("input", e => { B.disc = num(e.target.value); recalc(); });
$("bSvcOn").addEventListener("change", e => { B.svcOn = e.target.checked; recalc(); });
$("bPkg").addEventListener("change", e => {
const changed = B.rows.some(r => rowState(r).changed);
B.pkg = e.target.value; const p = DB.packages.find(x => x.id === B.pkg); B.rows = rowsFromPkg(p); B.manual = NaN; $("bManual").value = "";
renderMenu(); recalc(); if (changed) toast("Меню заменено на состав выбранного пакета");
});
$("menuBody").addEventListener("input", e => {
const tr = e.target.closest("tr[data-i]"); if (!tr) return; const r = B.rows[+tr.dataset.i], k = e.target.dataset.k;
if (k === "g" || k === "pcs") { r[k] = num(e.target.value); if (!fin(r[k])) r[k] = 0; recalc(); }
});
$("menuBody").addEventListener("change", e => {
const tr = e.target.closest("tr[data-i]"); if (!tr || e.target.dataset.k !== "dish") return;
const r = B.rows[+tr.dataset.i], v = e.target.value.trim();
if (r.base && norm(v) === norm(baseTitle(r))) { r.dish = r.base.dish; r.title = baseTitle(r); r.g = r.base.g; r.pcs = r.base.pcs; }
else { const d = findDish(v);
if (!d) { toast("Такого блюда нет в справочнике"); e.target.value = r.title; return; }
const od = dishById(r.dish); r.dish = d.id; r.title = clean(d.name);
if (d.unit === "шт" && !(r.pcs > 0)) r.pcs = 1;
if (d.unit !== "шт" && !(r.g > 0)) r.g = od && od.unit === "шт" ? 40 : 100;
}
renderMenu(); recalc();
});
$("menuBody").addEventListener("click", e => {
const b = e.target.closest("button[data-act]"); if (!b) return; const i = +b.closest("tr").dataset.i, r = B.rows[i];
if (b.dataset.act === "remove") r.removed = true;
if (b.dataset.act === "restore") r.removed = false;
if (b.dataset.act === "undo") { r.dish = r.base.dish; r.g = r.base.g; r.pcs = r.base.pcs; r.removed = false; r.title = baseTitle(r); }
if (b.dataset.act === "del") B.rows.splice(i, 1);
renderMenu(); recalc();
});
$("addRow").onclick = () => { B.rows.push({ sec: "Дополнительно", title: "", base: null, dish: null, g: 100, pcs: 1, removed: false }); renderMenu(); recalc();
const inputs = $("menuBody").querySelectorAll("input.dsel"); const last = inputs[inputs.length - 1]; if (last) last.focus(); };
$("resetMenu").onclick = () => { const p = DB.packages.find(x => x.id === B.pkg); if (p) { B.rows = rowsFromPkg(p); renderMenu(); recalc(); toast("Меню как в пакете"); } };
$("svcBody").addEventListener("input", e => {
const tr = e.target.closest("tr"); if (!tr) return;
if (tr.dataset.s) B.svc[tr.dataset.s] = e.target.value;
if (tr.dataset.c != null) B.custom[+tr.dataset.c][e.target.dataset.k] = e.target.value;
recalc();
});
$("svcBody").addEventListener("click", e => { const b = e.target.closest('[data-act="delc"]'); if (b) { B.custom.splice(+b.closest("tr").dataset.c, 1); renderSvc(); recalc(); } });
$("addCustom").onclick = () => { B.custom.push({ name: "", price: "", qty: 1 }); renderSvc(); recalc(); };
$("newBanq").onclick = () => { B = newBanquet(B.pkg); renderBanq(); toast("Новый банкет"); };
$("saveBanq").onclick = () => {
const c = calc(); if (!B.id) B.id = uid("b");
const rec = Object.assign(clone(B), { savedAt: new Date().toISOString(), total: c.total, fc: c.fcB, pkgName: c.p ? c.p.name : "" });
const i = DB.banquets.findIndex(x => x.id === B.id); if (i >= 0) DB.banquets[i] = rec; else DB.banquets.push(rec);
if (ART && !readOnly) { saveNow(); publishAll("Банкет сохранён для всех"); } else { save(); toast("Банкет сохранён"); }
};
/* ---------- смета: текст и печать ---------- */
function smetaText() {
const c = calc(), L = [];
L.push(`Смета банкета${B.client ? " — " + B.client : ""}${B.date ? ", " + fmtD(parseD(B.date)) : ""}`);
L.push(`Пакет «${c.p ? c.p.name : ""}», гостей: ${fm(c.G)}`); L.push("");
let last = null;
B.rows.forEach(r => { if (r.removed) return; if (r.sec !== last) { L.push(r.sec + ":"); last = r.sec; }
const d = dishById(r.dish); L.push(`• ${r.title} — ${d && d.unit === "шт" ? fm(r.pcs) + " шт" : fm(r.g) + (d && d.unit === "л" ? " мл" : " г")}`); });
L.push("");
L.push(`Меню: ${fm(c.perGuest)} ₽ × ${fm(c.G)} = ${rub(c.menu)}`);
if (c.use > 0) L.push(`  в т.ч. доплата за изменения меню: ${rub(c.use)} на гостя`);
if (c.disc > 0) L.push(`Скидка ${fm(c.disc * 100)}%: −${rub(c.menu * c.disc)}`);
if (B.svcOn) L.push(`Обслуживание ${fm(c.svcPct * 100)}%: ${rub(c.svc)}`);
DB.services.forEach(s => { const q = num(B.svc[s.id]); if (q > 0) L.push(`${s.name}: ${fm(q)} × ${fm(s.price)} = ${rub(q * s.price)}`); });
B.custom.forEach(x => { const v = num(x.price) * num(x.qty); if (fin(v) && x.name) L.push(`${x.name}: ${rub(v)}`); });
L.push(`ИТОГО: ${rub(c.total)}`);
L.push(`Предоплата ${fm(num(DB.settings.prepay))}%: ${rub(c.pre)}`);
const dt = parseD(B.date);
L.push(`Остаток ${rub(c.total - c.pre)}${dt ? " — до " + fmtD(minusDays(dt, num(DB.settings.payDays) || 0)) : ""}`);
return L.join("\n");
}
$("copySmeta").onclick = () => {
const t = smetaText();
const fallback = () => { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Смета скопирована"); } catch (e) { toast("Не удалось скопировать"); } ta.remove(); };
if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast("Смета скопирована"), fallback); else fallback();
};
$("printSmeta").onclick = () => {
$("printArea").innerHTML = `<pre style="font-family:inherit;font-size:12pt;white-space:pre-wrap">${esc(smetaText())}</pre>`;
window.print();
};
/* ---------- ПАКЕТЫ ---------- */
let selPkg = null, delArm = null;
function renderPkgs() {
fillDishList();
const fw = (num(DB.settings.fcWarn) || 0) / 100;
const maxFc = Math.max(0.0001, ...DB.packages.map(p => pkgStats(p).fc || 0), fw);
$("pkgList").innerHTML = DB.packages.map(p => { const s = pkgStats(p);
return `<tr class="pick${p.id === selPkg ? " sel" : ""}" data-p="${p.id}" tabindex="0">
<td><b>${esc(p.name)}</b>${p.kind === "custom" ? ' <span class="chip mute">индивидуальное</span>' : ""}</td>
<td class="r v">${fm(p.price)}</td><td class="r v">${fm(s.cost, 2)}</td>
<td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="bar" style="flex:1"><i class="${fw > 0 && s.fc > fw ? "hi" : ""}" style="width:${Math.min(100, (s.fc || 0) / maxFc * 100)}%"></i></div><span class="v">${pct(s.fc)}</span></div></td>
<td class="r v">${s.cost > 0 ? fm(p.price / s.cost, 1) : "—"}</td>
<td class="r">${s.miss.length ? `<span class="chip bad">${s.miss.length}</span>` : "—"}</td></tr>`; }).join("");
renderPkgEdit();
}
function renderPkgEdit() {
const p = DB.packages.find(x => x.id === selPkg);
if (!p) { $("pkgEdit").innerHTML = `<p class="muted" style="margin:0">Выберите пакет в таблице, чтобы посмотреть и изменить состав.</p>`; return; }
const s = pkgStats(p);
let html = `<div class="row between"><h2>${esc(p.name)}</h2><div class="row">
<button type="button" data-pa="use">Посчитать банкет по этому пакету</button>
<button type="button" data-pa="dup">Дублировать</button>
<button type="button" data-pa="del">${delArm === p.id ? "Точно удалить?" : "Удалить пакет"}</button></div></div>
<div class="grid-params">
<label class="f" for="peName">Название<input id="peName" data-pf="name" value="${esc(p.name)}"></label>
<label class="f" for="pePrice">Цена на гостя, ₽<input id="pePrice" data-pf="price" class="num" value="${fin(p.price) ? p.price : ""}"></label>
<label class="f" for="peKind">Тип<select id="peKind" data-pf="kind"><option value="package"${p.kind === "package" ? " selected" : ""}>типовой пакет</option><option value="custom"${p.kind === "custom" ? " selected" : ""}>индивидуальное меню</option></select></label>
<label class="f" for="peNote">Примечание<input id="peNote" data-pf="note" value="${esc(p.note || "")}"></label>
</div>
<p class="why">Себестоимость на гостя <b class="v">${rub(s.cost, 2)}</b>, фудкост <b class="v">${pct(s.fc)}</b>, выход ${fm(p.lines.reduce((a, l) => { const d = dishById(l.dish); return a + (d && d.unit === "л" ? 0 : num(l.g) || 0); }, 0))} г еды на гостя.
Типовые пакеты задают потолок доплаты: если блюдо есть в более дорогом пакете, доплата за него не выше разницы цен.</p>
<div class="tw"><table style="min-width:860px"><thead><tr><th>Раздел</th><th>Название в меню</th><th>Блюдо в Айко</th><th class="r">г/мл</th><th class="r">шт</th><th class="r">Себест., ₽</th><th class="r">Доля</th><th></th></tr></thead><tbody>`;
p.lines.forEach((l, i) => { const d = dishById(l.dish), c = lineCost(l.dish, l.g, l.pcs);
html += `<tr data-l="${i}">
<td><select data-lf="sec" aria-label="Раздел">${SECS.map(x => `<option${x === l.sec ? " selected" : ""}>${x}</option>`).join("")}</select></td>
<td><input data-lf="title" value="${esc(l.title)}" aria-label="Название в меню"></td>
<td><input data-lf="dish" list="dishList" value="${esc(d ? d.name : "")}" aria-label="Блюдо в Айко">
<div class="aiko">${d ? `${fin(d.cost) ? fm(d.cost, 2) + " ₽/" + d.unit : '<span class="chip bad">нет себестоимости</span>'}${d.star ? ' <span class="chip warn">*</span>' : ""}` : '<span class="chip bad">не выбрано</span>'}${l.check ? ' <button type="button" class="chip warn" data-la="ok" style="cursor:pointer" title="Нажмите, если сопоставление верное">проверить соответствие</button>' : ""}</div></td>
<td class="r"><input class="num" style="width:70px" data-lf="g" value="${fin(l.g) ? l.g : ""}" aria-label="Граммов"></td>
<td class="r"><input class="num" style="width:56px" data-lf="pcs" value="${fin(l.pcs) ? l.pcs : ""}" placeholder="${d && d.unit === "шт" ? "1" : ""}" aria-label="Штук"${d && d.unit === "шт" ? "" : " disabled"}></td>
<td class="r v">${fm(c, 2)}</td><td class="r v">${s.cost > 0 && fin(c) ? fm(c / s.cost * 100, 0) + "%" : ""}</td>
<td><button type="button" class="icon" data-la="del" aria-label="Удалить строку">✕</button></td></tr>`; });
html += `</tbody></table></div><button type="button" class="ghost" data-pa="addLine">+ Строка меню</button>`;
$("pkgEdit").innerHTML = html;
}
$("pkgList").addEventListener("click", e => { const tr = e.target.closest("tr[data-p]"); if (tr) { selPkg = tr.dataset.p; delArm = null; renderPkgs(); } });
$("pkgList").addEventListener("keydown", e => { if (e.key === "Enter") { const tr = e.target.closest("tr[data-p]"); if (tr) { selPkg = tr.dataset.p; renderPkgs(); } } });
$("addPkg").onclick = () => { const p = { id: uid("p"), name: "Новый пакет", price: 0, kind: "custom", note: "", lines: [] }; DB.packages.push(p); selPkg = p.id; save(); renderPkgs(); };
$("pkgEdit").addEventListener("change", e => {
const p = DB.packages.find(x => x.id === selPkg); if (!p) return;
const pf = e.target.dataset.pf, lf = e.target.dataset.lf;
if (pf) p[pf] = pf === "price" ? num(e.target.value) : e.target.value;
if (lf) { const l = p.lines[+e.target.closest("tr").dataset.l];
if (lf === "dish") { const d = findDish(e.target.value); if (!d) { toast("Такого блюда нет в справочнике"); } else { l.dish = d.id; if (!l.title) l.title = d.name; if (d.unit === "шт" && !(l.pcs > 0)) l.pcs = 1; l.check = false; } }
else if (lf === "g" || lf === "pcs") l[lf] = num(e.target.value);
else l[lf] = e.target.value; }
save(); renderPkgs();
});
$("pkgEdit").addEventListener("click", e => {
const p = DB.packages.find(x => x.id === selPkg); if (!p) return;
const a = e.target.closest("[data-pa]"), la = e.target.closest("[data-la]");
if (la) { const i = +la.closest("tr").dataset.l; if (la.dataset.la === "del") p.lines.splice(i, 1); if (la.dataset.la === "ok") p.lines[i].check = false; save(); renderPkgs(); return; }
if (!a) return;
if (a.dataset.pa === "addLine") p.lines.push({ sec: "Закуски", title: "", dish: null, g: 50, pcs: null, check: false });
if (a.dataset.pa === "dup") { const n = clone(p); n.id = uid("p"); n.name = p.name + " (копия)"; n.kind = "custom"; DB.packages.push(n); selPkg = n.id; }
if (a.dataset.pa === "del") { if (delArm !== p.id) { delArm = p.id; renderPkgEdit(); return; } DB.packages = DB.packages.filter(x => x.id !== p.id); selPkg = null; delArm = null; if (B.pkg === p.id) B = newBanquet(DB.packages[0] && DB.packages[0].id); }
if (a.dataset.pa === "use") { B = newBanquet(p.id); save(); showTab("banq"); return; }
save(); renderPkgs();
});
/* ---------- СПРАВОЧНИК ---------- */
function usedIn(id) { return DB.packages.filter(p => p.lines.some(l => l.dish === id)).map(p => p.name); }
function renderDish() {
const groups = [...new Set(DB.dishes.map(d => d.group || ""))];
const gv = $("dGroup").value;
$("dGroup").innerHTML = `<option value="">все группы</option>` + groups.map(g => `<option${g === gv ? " selected" : ""}>${esc(g)}</option>`).join("");
const q = norm($("dSearch").value), only = $("dOnly").value;
const list = DB.dishes.filter(d => (!q || norm(d.name).includes(q)) && (!gv || d.group === gv) &&
(only !== "miss" || !fin(d.cost)) && (only !== "star" || d.star) && (only !== "pcs" || d.unit === "шт") && (only !== "used" || usedIn(d.id).length));
$("dishInfo").textContent = `${DB.dishes.length} блюд, без себестоимости: ${DB.dishes.filter(d => !fin(d.cost)).length}. Цены на ${fmtD(parseD(DB.pricesDate))}`;
$("dishBody").innerHTML = list.map(d => { const u = usedIn(d.id);
return `<tr data-d="${d.id}">
<td><input data-df="name" value="${esc(d.name)}" aria-label="Название"></td>
<td><input data-df="group" value="${esc(d.group || "")}" aria-label="Группа" style="min-width:120px"></td>
<td><select data-df="unit" aria-label="Единица" style="width:64px">${["кг", "шт", "л"].map(x => `<option${x === d.unit ? " selected" : ""}>${x}</option>`).join("")}</select>${d.unitGuess ? ' <button type="button" class="chip warn" data-da="unitok" style="cursor:pointer" title="Нажмите, если единица верная">проверить</button>' : ""}</td>
<td class="r"><div class="qty"><input class="num" style="width:100px" data-df="cost" value="${fin(d.cost) ? d.cost : ""}" aria-label="Себестоимость">${d.star ? '<span class="chip warn" title="В Айко цена со звёздочкой">*</span>' : '<span></span>'}</div></td>
<td class="small muted">${u.length ? esc(u.join(", ")) : "—"}</td>
<td>${u.length ? "" : '<button type="button" class="icon" data-da="del" aria-label="Удалить блюдо">✕</button>'}</td></tr>`; }).join("") || `<tr><td colspan="6" class="muted">Ничего не найдено.</td></tr>`;
["service", "prepay", "payDays", "changeDays", "roundTo", "fcWarn"].forEach(k => { const el = document.querySelector(`[data-st="${k}"]`); if (el !== document.activeElement) el.value = DB.settings[k]; });
$("svcPrice").innerHTML = DB.services.map((s, i) => `<tr data-sp="${i}"><td><input data-sf="name" value="${esc(s.name)}" aria-label="Услуга"></td>
<td class="r"><input class="num" style="width:100px" data-sf="price" value="${fin(s.price) ? s.price : ""}" aria-label="Цена"></td>
<td><select data-sf="unit" aria-label="Единица" style="width:84px">${["усл", "час", "шт"].map(x => `<option${x === s.unit ? " selected" : ""}>${x}</option>`).join("")}</select></td>
<td><button type="button" class="icon" data-sa="del" aria-label="Удалить услугу">✕</button></td></tr>`).join("");
}
["dSearch", "dGroup", "dOnly"].forEach(id => $(id).addEventListener("input", renderDish));
$("dishBody").addEventListener("change", e => {
const d = DB.dishes.find(x => x.id === e.target.closest("tr").dataset.d), k = e.target.dataset.df; if (!d || !k) return;
if (k === "cost") { d.cost = num(e.target.value); if (!fin(d.cost)) d.cost = null; d.star = false; }
else if (k === "unit") { d.unit = e.target.value; d.unitGuess = false; }
else d[k] = e.target.value.trim();
save(); renderDish();
});
$("dishBody").addEventListener("click", e => {
const b = e.target.closest("[data-da]"); if (!b) return; const id = b.closest("tr").dataset.d;
if (b.dataset.da === "del") DB.dishes = DB.dishes.filter(x => x.id !== id);
if (b.dataset.da === "unitok") DB.dishes.find(x => x.id === id).unitGuess = false;
save(); renderDish();
});
$("addDish").onclick = () => { DB.dishes.unshift({ id: uid("d"), name: "Новое блюдо", group: "Добавлено вручную", unit: "кг", cost: null, star: false }); $("dSearch").value = ""; $("dOnly").value = ""; $("dGroup").value = ""; save(); renderDish(); };
document.querySelectorAll("[data-st]").forEach(el => el.addEventListener("input", e => { DB.settings[e.target.dataset.st] = num(e.target.value); save(); }));
$("svcPrice").addEventListener("change", e => { const s = DB.services[+e.target.closest("tr").dataset.sp], k = e.target.dataset.sf; if (!s || !k) return; s[k] = k === "price" ? num(e.target.value) : e.target.value; save(); });
$("svcPrice").addEventListener("click", e => { const b = e.target.closest('[data-sa="del"]'); if (b) { DB.services.splice(+b.closest("tr").dataset.sp, 1); save(); renderDish(); } });
$("addSvcPrice").onclick = () => { DB.services.push({ id: uid("s"), grp: "Дополнительно", name: "Новая услуга", price: 0, unit: "усл" }); save(); renderDish(); };
/* ---------- импорт цен Айко ---------- */
const COST_RE = /^\d[\d\s ]*([.,]\d+)?\*?$/;
function parseRows(rows) { // rows: массив массивов ячеек
const out = []; let group = "";
rows.forEach(r => {
const cells = r.map(v => v == null ? "" : String(v).trim());
const ci = cells.findIndex(v => COST_RE.test(v.replace(/\s/g, "")) && v !== "");
const texts = cells.map((v, i) => ({ v, i })).filter(x => x.v && !COST_RE.test(x.v.replace(/\s/g, "")));
if (ci > 0) { const nm = texts.filter(x => x.i < ci).pop(); if (nm) { const raw = cells[ci].replace(/[\s ]/g, ""); out.push({ name: nm.v, cost: parseFloat(raw.replace("*", "").replace(",", ".")), star: raw.endsWith("*"), group }); } }
else if (texts.length === 1 && !/себестоимость|название/i.test(texts[0].v)) group = texts[0].v;
});
return out;
}
function applyAiko(items) {
if (!items.length) { $("aikoReport").innerHTML = `<p class="note bad">Не нашла строк «название — себестоимость». Проверьте файл или вставленный текст.</p>`; return; }
let upd = 0, added = 0; const jumps = [];
items.forEach(it => { const d = findDish(it.name);
if (d) { if (fin(d.cost) && it.cost > 0 && Math.abs(it.cost / d.cost - 1) >= 0.1) jumps.push({ name: d.name, from: d.cost, to: it.cost });
d.cost = it.cost; d.star = it.star; upd++; }
else { DB.dishes.push({ id: uid("d"), name: it.name, group: it.group || "Из Айко", unit: "кг", cost: it.cost, star: it.star, unitGuess: it.cost < 200 }); added++; } });
const seen = new Set(items.map(it => norm(it.name)));
const notIn = DB.dishes.filter(d => usedIn(d.id).length && !seen.has(norm(d.name)) && d.group !== "Нет в выгрузке Айко").map(d => d.name);
DB.pricesDate = today(); save(); renderDish();
$("aikoReport").innerHTML = `<p class="note ok">Обновлено цен: ${upd}. Новых блюд: ${added}${added ? " (у них проверьте единицу: кг или шт)" : ""}.</p>` +
(jumps.length ? `<p class="note warn">Цена изменилась на 10% и больше: ${jumps.map(j => `${esc(j.name)} ${fm(j.from, 2)} → ${fm(j.to, 2)} (${sgn((j.to / j.from - 1) * 100, 0)}%)`).join("; ")}.</p>` : "") +
(notIn.length ? `<p class="note warn">${notIn.length} блюд из пакетов нет в загруженных строках, их цена осталась прежней${notIn.length > 8 ? ", например" : ""}: ${esc(notIn.slice(0, 8).join(", "))}.</p>` : "");
}
$("aikoApply").onclick = () => applyAiko(parseRows($("aikoPaste").value.split(/\r?\n/).map(l => l.split(/\t|;/))));
$("aikoFile").addEventListener("change", async e => {
const f = e.target.files[0]; if (!f) return;
const go = () => { const rd = new FileReader(); rd.onload = () => { try { const wb = XLSX.read(rd.result, { type: "array" }); const ws = wb.Sheets[wb.SheetNames[0]];
applyAiko(parseRows(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }))); } catch (err) { $("aikoReport").innerHTML = `<p class="note bad">Не удалось прочитать файл. Скопируйте строки из Айко и вставьте в поле ниже.</p>`; } };
rd.readAsArrayBuffer(f); };
if (window.XLSX) return go();
const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
s.onload = go; s.onerror = () => { $("aikoReport").innerHTML = `<p class="note bad">Для чтения Excel нужен интернет. Без интернета скопируйте строки из Айко и вставьте их в поле ниже.</p>`; };
document.head.appendChild(s); e.target.value = "";
});
/* ---------- СОХРАНЁННЫЕ ---------- */
function renderSaved() {
const list = [...DB.banquets].sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
$("savedBody").innerHTML = list.map(b => `<tr data-b="${b.id}"><td class="v">${b.date ? fmtD(parseD(b.date)) : "—"}</td><td>${esc(b.client || "без имени")}</td><td>${esc(b.pkgName || "")}</td>
<td class="r v">${fm(num(b.guests))}</td><td class="r v">${fm(b.total)}</td><td class="r v int">${pct(b.fc)}</td>
<td class="r" style="white-space:nowrap"><button type="button" data-ba="open">Открыть</button> <button type="button" class="icon" data-ba="del" aria-label="Удалить">✕</button></td></tr>`).join("")
|| `<tr><td colspan="7" class="muted">Пока пусто. На вкладке «Банкет» нажмите «Сохранить банкет».</td></tr>`;
}
$("savedBody").addEventListener("click", e => {
const b = e.target.closest("[data-ba]"); if (!b) return; const id = b.closest("tr").dataset.b;
if (b.dataset.ba === "open") { const x = DB.banquets.find(y => y.id === id); B = clone(x); ["savedAt", "total", "fc", "pkgName"].forEach(k => delete B[k]); showTab("banq"); }
if (b.dataset.ba === "del") { if (b.dataset.arm) { DB.banquets = DB.banquets.filter(y => y.id !== id); save(); renderSaved(); } else { b.dataset.arm = 1; b.textContent = "Удалить?"; } }
});
/* ---------- файл данных ---------- */
$("exportAll").onclick = () => {
const blob = new Blob([JSON.stringify({ app: "rizzw-banquet-calc", db: DB, cur: B }, null, 1)], { type: "application/json" });
const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `RizzW_банкетный_калькулятор_${today()}.json`;
document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast("Файл с данными сохранён");
};
$("importAllBtn").onclick = () => $("importAll").click();
$("importAll").addEventListener("change", e => {
const f = e.target.files[0]; if (!f) return; const rd = new FileReader();
rd.onload = () => { try { const s = JSON.parse(rd.result); if (!s.db || !Array.isArray(s.db.dishes)) throw 0; DB = normDB(s.db); DB.rev = SEED.rev; B = s.cur || newBanquet(); save(); showTab("banq"); toast("Данные загружены"); }
catch (err) { toast("Это не файл калькулятора"); } };
rd.readAsText(f); e.target.value = "";
});
$("guestMode").addEventListener("change", e => { document.body.classList.toggle("guest", e.target.checked); });
$("mGo").onclick = () => document.querySelector("#tab-banq aside").scrollIntoView({ behavior: "smooth", block: "start" });
/* ---------- PIN-код (только для версии на сайте) ---------- */
(function gate() {
const H = window.RIZZW_PIN; if (!H) return;
try { if (localStorage.getItem(KEY + "-pin") === H) return; } catch (e) {}
document.body.classList.add("locked");
const d = document.createElement("div"); d.className = "gate";
d.innerHTML = '<form class="panel" id="gateForm"><h2>Банкетный калькулятор RizzW</h2><label class="f" for="gatePin">Введите PIN-код<input id="gatePin" type="password" inputmode="numeric" autocomplete="off"></label><p class="note bad" id="gateErr" hidden>Неверный код. Попробуйте ещё раз.</p><button class="pri" type="submit">Войти</button></form>';
document.body.appendChild(d); $("gatePin").focus();
$("gateForm").addEventListener("submit", async e => {
e.preventDefault();
const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("rizzw:" + $("gatePin").value.trim()));
const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
if (hex === H) { try { localStorage.setItem(KEY + "-pin", H); } catch (err) {} d.remove(); document.body.classList.remove("locked"); }
else { $("gateErr").hidden = false; $("gatePin").select(); }
});
})();
/* ---------- старт ---------- */
load();
let t0 = "banq"; try { t0 = localStorage.getItem(KEY + "-tab") || "banq"; } catch (e) {}
showTab(t0);
