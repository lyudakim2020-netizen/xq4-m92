/* ---------- правки вида ---------- */
document.head.insertAdjacentHTML("beforeend", `<style>
.layout{grid-template-columns:minmax(0,1fr) 380px}
@media (max-width:980px){.layout{grid-template-columns:1fr}}
.kv>span:first-child{min-width:0}
.fur-tbl{min-width:560px}
@media (max-width:640px){
.fur-tbl,.fur-tbl tbody{display:block;min-width:0}
.fur-tbl thead{display:none}
.fur-tbl tr[data-f]{display:grid;grid-template-columns:1fr auto auto auto;align-items:center;border-bottom:1px solid var(--line);padding-block:4px}
.fur-tbl tr[data-f] td{border-bottom:none}
.fur-tbl tr[data-f] td:first-child{grid-column:1/-1}
.fur-tbl tr[data-f] .qty{justify-content:flex-start}
}
body.tab-fur .mbar{display:none!important}
@media (max-width:640px){
.svc-tbl{min-width:0!important}
.svc-tbl,.svc-tbl tbody,.svc-tbl tfoot{display:block}
.svc-tbl thead{display:none}
.svc-tbl tr.sec,.svc-tbl tr.sec td{display:block}
.svc-tbl tr[data-s],.svc-tbl tr[data-c]{display:grid;grid-template-columns:auto auto 1fr auto;gap:4px 10px;align-items:center;border-bottom:1px solid var(--line);padding-block:6px}
.svc-tbl tr[data-s] td,.svc-tbl tr[data-c] td{border-bottom:none;padding:0 4px}
.svc-tbl tr[data-s] td:first-child,.svc-tbl tr[data-c] td:first-child{grid-column:1/-1}
.svc-tbl tr[data-s] td:nth-child(2),.svc-tbl tr[data-c] td:nth-child(2){text-align:left}
.svc-tbl tfoot tr{display:flex;justify-content:space-between}
.svc-tbl tfoot td{border-bottom:none}
}
</style>`);
$("svcBody").closest("table").classList.add("svc-tbl");
(function () {
const lbl = $("guestMode").parentNode; lbl.lastChild.textContent = " Режим для гостя (скрыть себестоимость)";
$("xlsSmeta").title = "Смета без себестоимости, её можно отправлять гостю";
$("iGpG").closest(".panel").insertAdjacentHTML("beforeend", '<div class="row"><button type="button" id="xlsInt">Расчёт для нас в Excel</button></div>');
})();
// потолок: короткая надпись, чтобы панель не обрезалась
const _recalc = recalc;
recalc = function () { const c = _recalc(); if (!fin(c.cap)) $("sCap").textContent = "нет"; return c; };

/* ---------- Excel ---------- */
function loadXLSX(cb) {
if (window.XLSX) return cb();
const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
s.onload = cb; s.onerror = () => toast("Нет интернета: Excel не сформировать"); document.head.appendChild(s);
}
const r2 = v => fin(v) ? Math.round(v * 100) / 100 : "";
const pc1 = v => fin(v) ? Math.round(v * 1000) / 10 + "%" : "";
const xSheet = (rows, widths) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = widths.map(w => ({ wch: w })); return ws; };
const safeName = s => String(s).replace(/[\[\]:*?\/\\]/g, " ").slice(0, 31);
const fileSafe = s => String(s).replace(/[\\/:*?"<>|]/g, " ");
function banqGuestRows(c) {
const dt = parseD(B.date);
const A = [["Смета банкета" + (B.client ? " — " + B.client : "")], ["Дата мероприятия", dt ? fmtD(dt) : ""], ["Пакет", c.p ? c.p.name : ""], ["Гостей", fin(c.G) ? c.G : ""], [],
["Раздел", "Блюдо", "На гостя", "Ед.", "Всего на банкет", "Ед."]];
B.rows.forEach(r => { if (r.removed) return; const d = dishById(r.dish), pcs = d && d.unit === "шт", liq = d && d.unit === "л";
const per = pcs ? num(r.pcs) : num(r.g);
A.push([r.sec, r.title, fin(per) ? per : "", pcs ? "шт" : liq ? "мл" : "г", c.G > 0 && fin(per) ? r2(pcs ? per * c.G : per * c.G / 1000) : "", pcs ? "шт" : liq ? "л" : "кг"]); });
A.push([]);
A.push(["", "Меню на гостя, ₽", r2(c.perGuest)]);
if (c.use > 0) A.push(["", "в т.ч. доплата за изменения меню, ₽", r2(c.use)]);
A.push(["", "Меню всего, ₽", r2(c.menu)]);
if (c.disc > 0) A.push(["", "Скидка " + fm(c.disc * 100) + "%, ₽", -r2(c.menu * c.disc)]);
if (B.svcOn) A.push(["", "Обслуживание " + fm(c.svcPct * 100) + "%, ₽", r2(c.svc)]);
DB.services.forEach(s => { const q = num(B.svc[s.id]); if (q > 0) A.push(["", s.name + " (" + fm(q) + " × " + fm(s.price) + "), ₽", r2(q * s.price)]); });
B.custom.forEach(x => { const v = num(x.price) * num(x.qty); if (fin(v) && x.name) A.push(["", x.name + ", ₽", r2(v)]); });
A.push(["", "ИТОГО, ₽", r2(c.total)]);
A.push(["", "Предоплата " + fm(num(DB.settings.prepay)) + "%, ₽", r2(c.pre)]);
A.push(["", "Остаток, ₽", r2(c.total - c.pre)]);
if (dt) A.push(["", "Оплатить остаток до", fmtD(minusDays(dt, num(DB.settings.payDays) || 0))]);
return A;
}
function smetaXlsx() { // для гостя: без себестоимости
const c = calc(), wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, xSheet(banqGuestRows(c), [16, 46, 12, 6, 16, 6]), "Смета");
XLSX.writeFile(wb, `Смета_${fileSafe(B.client || "банкет")}_${B.date || today()}.xlsx`);
toast("Смета для гостя сохранена в Excel");
}
function internalXlsx() { // для нас: смета + себестоимость
const c = calc(), wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, xSheet(banqGuestRows(c), [16, 46, 12, 6, 16, 6]), "Смета");
const S = [["Блюдо", "Блюдо в Айко", "Себестоимость на гостя, ₽", "Разница к пакету, ₽", "Изменение"]];
B.rows.forEach((r, i) => { const s = c.rs[i], d = dishById(r.dish);
S.push([r.title, d ? d.name : "", r.removed ? 0 : r2(s.cur), s.changed && !s.unknown ? r2(s.delta) : "", r.removed ? "убрано" : s.added ? "сверх пакета" : s.swapped ? "замена" : s.qtyChanged ? "граммовка" : ""]); });
S.push([]);
[["Себестоимость пакета на гостя, ₽", r2(c.st.cost)], ["Фудкост пакета", pc1(c.F)], ["Разница себестоимости на гостя, ₽", r2(c.D)],
["Минимум доплаты, ₽", r2(c.min)], ["Норма доплаты, ₽", r2(c.nrm)], ["Потолок доплаты, ₽", fin(c.cap) ? r2(c.cap) : "нет"], ["Рекомендуемая доплата, ₽", r2(c.rec)], ["Взяли доплату, ₽", r2(c.use)],
["Себестоимость еды на банкет, ₽", r2(c.foodCost)], ["Фудкост банкета", pc1(c.fcB)], ["Валовая прибыль по еде, ₽", r2(c.gp)]].forEach(x => S.push(x));
if (c.st.miss.length) S.push(["Нет себестоимости: " + c.st.miss.join(", ")]);
XLSX.utils.book_append_sheet(wb, xSheet(S, [44, 44, 22, 18, 14]), "Себестоимость");
XLSX.writeFile(wb, `Расчёт_для_нас_${fileSafe(B.client || "банкет")}_${B.date || today()}.xlsx`);
toast("Расчёт для нас сохранён в Excel");
}
function allXlsx() {
const wb = XLSX.utils.book_new();
const sum = [["Пакет", "Цена на гостя, ₽", "Себестоимость на гостя, ₽", "Фудкост", "Наценка ×", "Нет цены"]];
DB.packages.forEach(p => { const s = pkgStats(p); sum.push([p.name, p.price, r2(s.cost), pc1(s.fc), s.cost > 0 ? Math.round(p.price / s.cost * 10) / 10 : "", s.miss.join(", ")]); });
XLSX.utils.book_append_sheet(wb, xSheet(sum, [30, 16, 22, 10, 10, 50]), "Сводка");
DB.packages.forEach(p => { const s = pkgStats(p);
const R = [[p.name + " — " + fm(p.price) + " ₽ на гостя"], [], ["Раздел", "Название в меню", "Блюдо в Айко", "г/мл на гостя", "шт на гостя", "Себестоимость за ед., ₽", "Ед.", "Себестоимость на гостя, ₽", "Доля"]];
p.lines.forEach(l => { const d = dishById(l.dish), c = lineCost(l.dish, l.g, l.pcs);
R.push([l.sec, l.title, d ? d.name : "", fin(l.g) ? l.g : "", fin(l.pcs) ? l.pcs : "", d && fin(d.cost) ? d.cost : "нет цены", d ? d.unit : "", r2(c), s.cost > 0 && fin(c) ? pc1(c / s.cost) : ""]); });
R.push([], ["", "Итого себестоимость на гостя, ₽", "", "", "", "", "", r2(s.cost)], ["", "Фудкост", "", "", "", "", "", pc1(s.fc)]);
XLSX.utils.book_append_sheet(wb, xSheet(R, [16, 44, 44, 12, 10, 18, 6, 20, 8]), safeName(p.name)); });
const D = [["Блюдо (как в Айко)", "Группа", "Ед.", "Себестоимость за ед., ₽", "Цена со * в Айко"]];
DB.dishes.forEach(d => D.push([d.name, d.group || "", d.unit, fin(d.cost) ? d.cost : "", d.star ? "да" : ""]));
XLSX.utils.book_append_sheet(wb, xSheet(D, [50, 24, 6, 20, 14]), "Справочник блюд");
XLSX.writeFile(wb, `RizzW_пакеты_и_себестоимость_${today()}.xlsx`);
toast("Пакеты и цены сохранены в Excel");
}
$("xlsSmeta").onclick = () => loadXLSX(smetaXlsx);
$("xlsInt").onclick = () => loadXLSX(internalXlsx);
$("xlsAll").onclick = () => loadXLSX(allXlsx);

/* ---------- ФУРШЕТ ---------- */
document.querySelector("nav.tabs").insertAdjacentHTML("beforeend", '<button type="button" role="tab" data-tab="fur" aria-selected="false">Фуршет</button>');
$("tab-saved").insertAdjacentHTML("afterend", `<section id="tab-fur" class="layout" hidden>
<div class="col">
<div class="panel">
<div class="row between"><h2>Фуршет</h2><div class="row"><button type="button" id="fNew">Новый фуршет</button><button type="button" id="fExample">Пример набора</button></div></div>
<div class="grid-params">
<label class="f" for="fClient">Клиент<input id="fClient" placeholder="Например, компания"></label>
<label class="f" for="fDate">Дата мероприятия<input id="fDate" type="date"></label>
<label class="f" for="fGuests">Гостей<input id="fGuests" class="num" inputmode="numeric"></label>
</div>
<p class="why int">Цена фуршета договорная. Соберите набор на одного гостя: калькулятор покажет, какую цену назвать, чтобы фудкост не превышал заданный процент.</p>
</div>
<div class="panel">
<div class="row between"><h2>Набор на одного гостя</h2><span class="small muted">Лишнее уберите крестиком, количество поправьте</span></div>
<div class="tw"><table class="fur-tbl">
<thead><tr><th>Позиция</th><th class="r">На гостя</th><th class="r">Всего</th><th class="r int">Себест., ₽</th><th></th></tr></thead>
<tbody id="fBody"></tbody>
<tfoot class="int"><tr><td colspan="3"><b>Себестоимость набора на гостя</b></td><td class="r v" id="fCostTot"></td><td></td></tr></tfoot>
</table></div>
<button type="button" class="ghost" id="fAdd">+ Добавить позицию</button>
</div>
</div>
<aside class="col sticky" aria-live="polite">
<div class="panel int">
<h2>Цена фуршета (для нас)</h2>
<div class="big"><span class="lbl">Цена на гостя при целевом фудкосте</span><span class="val" id="fTarget">—</span><span class="sub" id="fTargetTot"></span></div>
<div class="blk">
<div class="kv sm"><span>Себестоимость на гостя</span><span id="fC"></span></div>
<div class="kv"><span id="fFloorL">Нижняя граница</span><span id="fFloor"></span></div>
<div class="kv"><span>Минимальный чек</span><span id="fMinV"></span></div>
</div>
<div class="grid-params">
<label class="f" for="fT">Цель, фудкост %<input id="fT" class="num" data-fs="furTarget"></label>
<label class="f" for="fF">Предел, фудкост %<input id="fF" class="num" data-fs="furFloor"></label>
<label class="f" for="fM">Минимальный чек, ₽<input id="fM" class="num" data-fs="furMin" placeholder="не задан"></label>
</div>
<label class="f" for="fBudget">Бюджет гостя на человека, если назвал<input id="fBudget" class="num" inputmode="decimal" placeholder="—"></label>
<div id="fBudgetBox" class="blk" hidden>
<div class="kv"><span>Можно потратить на продукты</span><span id="fMaxCost"></span></div>
<div class="kv"><span id="fLeftL">Осталось</span><span id="fLeft"></span></div>
</div>
<p class="note" id="fNote" hidden></p>
<div class="row"><button type="button" id="fXlsInt">Расчёт для нас в Excel</button></div>
</div>
<div class="panel">
<h2>Смета для гостя</h2>
<label class="f" for="fPrice">Цена на гостя, ₽<input id="fPrice" class="num" inputmode="decimal"></label>
<div class="kv"><span id="fLMenu">Фуршет</span><span id="fMenu"></span></div>
<label class="switch" for="fSvcOn"><input type="checkbox" id="fSvcOn"> <span id="fLSvcOn">Обслуживание</span></label>
<div class="kv" id="fRowSvc"><span id="fLSvc">Обслуживание</span><span id="fSvc"></span></div>
<div class="kv em"><span>Итого</span><span id="fTotal"></span></div>
<div class="kv"><span id="fLPre">Предоплата</span><span id="fPre"></span></div>
<div class="kv"><span id="fLRest">Остаток</span><span id="fRest"></span></div>
<div class="row"><button type="button" id="fXls">Смета в Excel</button><button type="button" id="fCopy">Скопировать смету</button><button type="button" id="fPrint">Печать / PDF</button></div>
</div>
</aside>
</section>`);

const FKEY = KEY + "-fur";
const F_EXAMPLE = [["Канапе \"Мини Капрезе\"", 1], ["Канапе \"Рафаэлло\" из снежного краба", 2], ["Канапе блин-ролл с твор. сыром и лососем", 1], ["Канапе мини-сэндвич с курицей и соусом блю-чиз", 2],
["Брускетта с ростбифом RizzW", 1], ["Брускетта с чатни \"Помодорро\"", 1], ["Канапе ролл Тортилья с курицей и сливочным сыром", 1], ["Сувлаки мини шашлычки из курицы", 1],
["Мини шашлычки овощные", 1], ["Салат \"Цезарь\" с курицей RW", 30], ["Салат с говядиной Терияки RW", 30], ["Картофель мини пряный", 50], ["Фруктовая ваза RW", 100]];
// шаблон нового фуршета: все фуршетные позиции из справочника по 1 шт
function furAllRows() { return DB.dishes.filter(d => d.group === "Легкие закуски/фуршет").map(d => ({ dish: d.id, title: clean(d.name), qty: d.unit === "шт" ? 1 : 50 })); }
function furExampleRows() { return F_EXAMPLE.map(([n, q]) => { const d = DB.dishes.find(x => x.name === n); return d ? { dish: d.id, title: clean(d.name), qty: q } : null; }).filter(Boolean); }
let FS;
try { FS = JSON.parse(localStorage.getItem(FKEY) || "null"); } catch (e) {}
if (!FS || !Array.isArray(FS.rows)) FS = { client: "", date: "", guests: 50, rows: furAllRows(), price: NaN, budget: NaN, svcOn: true };
const fsave = () => { try { localStorage.setItem(FKEY, JSON.stringify(FS)); } catch (e) {} };
const fUnit = d => d && d.unit === "шт" ? "шт" : d && d.unit === "л" ? "мл" : "г";
const fRowCost = r => lineCost(r.dish, r.qty, r.qty);

function furRender() {
fillDishList();
$("fClient").value = FS.client || ""; $("fDate").value = FS.date || ""; $("fGuests").value = fin(num(FS.guests)) ? FS.guests : "";
$("fPrice").value = fin(num(FS.price)) ? FS.price : ""; $("fBudget").value = fin(num(FS.budget)) ? FS.budget : ""; $("fSvcOn").checked = !!FS.svcOn;
["furTarget", "furFloor", "furMin"].forEach(k => { const el = document.querySelector(`[data-fs="${k}"]`); el.value = fin(num(DB.settings[k])) && num(DB.settings[k]) > 0 ? DB.settings[k] : ""; });
$("fBody").innerHTML = FS.rows.map((r, i) => { const d = dishById(r.dish);
return `<tr data-f="${i}">
<td><input class="dsel" list="dishList" data-k="dish" value="${esc(r.title)}" aria-label="Позиция" style="background:transparent;border-color:transparent;font-weight:500"><div class="aiko"><span data-o="chips"></span> <span class="int" data-o="aiko"></span></div></td>
<td class="r"><div class="qty"><input class="num" data-k="qty" inputmode="decimal" value="${fin(num(r.qty)) ? r.qty : ""}" aria-label="Количество на гостя"><span>${fUnit(d)}</span></div></td>
<td class="r v" data-o="tot"></td>
<td class="r v int" data-o="cost"></td>
<td class="r"><button type="button" class="icon" data-act="del" aria-label="Убрать позицию">✕</button></td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">Добавьте позиции фуршета.</td></tr>`;
furCalc();
}
function furCalc() {
const G = num(FS.guests), S = DB.settings;
const T = (num(S.furTarget) || 16) / 100, FL = (num(S.furFloor) || 17) / 100, M = num(S.furMin) > 0 ? num(S.furMin) : 0;
const R = Math.max(1, num(S.roundTo) || 50), up = v => Math.ceil(v / R - 1e-9) * R;
let C = 0; const miss = [];
[...$("fBody").querySelectorAll("tr[data-f]")].forEach(tr => {
const r = FS.rows[+tr.dataset.f], d = dishById(r.dish), c = fRowCost(r), q = num(r.qty);
if (fin(c)) C += c; else miss.push(r.title || "без названия");
let chips = "";
if (!d) chips += `<span class="chip bad">нет в справочнике</span>`;
else if (!fin(d.cost)) chips += `<span class="chip bad int">нет себестоимости</span>`;
else if (d.star) chips += `<span class="chip warn int">цена со * в Айко</span>`;
if (d && d.unitGuess) chips += `<span class="chip warn int">проверьте единицу: ${esc(d.unit)}</span>`;
tr.querySelector('[data-o="chips"]').innerHTML = chips;
tr.querySelector('[data-o="aiko"]').textContent = d ? `Айко: ${d.name}${fin(d.cost) ? " · " + fm(d.cost, 2) + " ₽/" + d.unit : ""}` : "";
tr.querySelector('[data-o="cost"]').textContent = fm(c, 2);
tr.querySelector('[data-o="tot"]').textContent = G > 0 && fin(q) ? (d && d.unit === "шт" ? fm(q * G) + " шт" : fm(q * G / 1000, 2) + (d && d.unit === "л" ? " л" : " кг")) : "";
});
$("fCostTot").textContent = fm(C, 2);
const target = C > 0 ? up(C / T) : NaN, floorP = C > 0 ? up(C / FL) : NaN, rec = fin(target) ? Math.max(target, M) : NaN;
const own = num(FS.price), price = fin(own) ? own : rec;
$("fPrice").placeholder = fin(rec) ? fm(rec) : "";
$("fTarget").textContent = rub(rec);
$("fTargetTot").textContent = fin(rec) && G > 0 ? `× ${fm(G)} гостей = ${rub(rec * G)}` : "";
$("fC").textContent = rub(C, 2);
$("fFloorL").textContent = `Нижняя граница (фудкост ${fm(FL * 100)}%)`; $("fFloor").textContent = rub(floorP);
$("fMinV").textContent = M > 0 ? rub(M) : "не задан";
const bud = num(FS.budget);
$("fBudgetBox").hidden = !(bud > 0);
if (bud > 0) { const mx = bud * T, left = mx - C; $("fMaxCost").textContent = rub(mx, 2);
$("fLeftL").textContent = left >= 0 ? "Осталось на продукты" : "Перерасход: убрать позиции"; $("fLeft").textContent = rub(Math.abs(left), 2);
$("fLeft").style.color = left >= 0 ? "var(--accent)" : "var(--bad)"; }
const n = $("fNote"), msgs = [];
let cls = "ok";
if (miss.length) { msgs.push(`Нет себестоимости: ${miss.join(", ")}. Цена посчитана без них.`); cls = "bad"; }
if (fin(own) && C > 0) {
const fc = C / own;
if (own < floorP) { msgs.push(`При цене ${rub(own)} фудкост ${pct(fc)}, выше предела ${fm(FL * 100)}%. Такую цену согласовать с владелицей.`); cls = "bad"; }
else if (own < target) { msgs.push(`Фудкост ${pct(fc)}: в пределах допустимого, но ниже цели ${fm(T * 100)}%.`); if (cls !== "bad") cls = "warn"; }
else msgs.push(`Фудкост ${pct(fc)}: не выше цели.`);
if (M > 0 && own < M) { msgs.push(`Цена ниже минимального чека ${rub(M)}.`); cls = "bad"; }
}
n.hidden = !msgs.length; n.className = "note " + cls; n.textContent = msgs.join(" ");
const menu = fin(price) && G > 0 ? price * G : NaN;
const svcPct = (num(S.service) || 0) / 100, svc = FS.svcOn && fin(menu) ? menu * svcPct : 0;
const total = fin(menu) ? menu + svc : NaN, pre = fin(total) ? total * (num(S.prepay) || 0) / 100 : NaN;
$("fLMenu").textContent = fin(price) && G > 0 ? `Фуршет: ${fm(price)} ₽ × ${fm(G)} гостей` : "Фуршет";
$("fMenu").textContent = rub(menu);
$("fLSvcOn").textContent = `Обслуживание ${fm(svcPct * 100)}%`; $("fLSvc").textContent = `Обслуживание ${fm(svcPct * 100)}%`;
$("fRowSvc").hidden = !FS.svcOn; $("fSvc").textContent = rub(svc);
$("fTotal").textContent = rub(total);
$("fLPre").textContent = `Предоплата ${fm(num(S.prepay))}% при договоре`; $("fPre").textContent = rub(pre);
const dt = parseD(FS.date);
$("fLRest").textContent = dt ? `Остаток до ${fmtD(minusDays(dt, num(S.payDays) || 0))}` : "Остаток";
$("fRest").textContent = fin(total) ? rub(total - pre) : "—";
fsave(); save();
return { C, T, FL, M, target, floorP, rec, price, G, menu, svc, svcPct, total, pre, dt, miss };
}
["fClient", "fDate"].forEach(id => $(id).addEventListener("input", e => { FS[id === "fClient" ? "client" : "date"] = e.target.value; furCalc(); }));
$("fGuests").addEventListener("input", e => { FS.guests = num(e.target.value); furCalc(); });
$("fPrice").addEventListener("input", e => { FS.price = num(e.target.value); furCalc(); });
$("fBudget").addEventListener("input", e => { FS.budget = num(e.target.value); furCalc(); });
$("fSvcOn").addEventListener("change", e => { FS.svcOn = e.target.checked; furCalc(); });
document.querySelectorAll("[data-fs]").forEach(el => el.addEventListener("input", e => { DB.settings[e.target.dataset.fs] = num(e.target.value); furCalc(); }));
$("fBody").addEventListener("input", e => { const tr = e.target.closest("tr[data-f]"); if (!tr || e.target.dataset.k !== "qty") return; FS.rows[+tr.dataset.f].qty = num(e.target.value); furCalc(); });
$("fBody").addEventListener("change", e => {
const tr = e.target.closest("tr[data-f]"); if (!tr || e.target.dataset.k !== "dish") return;
const r = FS.rows[+tr.dataset.f], d = findDish(e.target.value.trim());
if (!d) { toast("Такой позиции нет в справочнике"); e.target.value = r.title; return; }
const was = dishById(r.dish); r.dish = d.id; r.title = clean(d.name);
if (!was || was.unit !== d.unit) r.qty = d.unit === "шт" ? 1 : 50;
furRender();
});
$("fBody").addEventListener("click", e => { const b = e.target.closest('[data-act="del"]'); if (b) { FS.rows.splice(+b.closest("tr").dataset.f, 1); furRender(); } });
$("fAdd").onclick = () => { FS.rows.push({ dish: null, title: "", qty: 1 }); furRender(); const ins = $("fBody").querySelectorAll("input.dsel"); if (ins.length) ins[ins.length - 1].focus(); };
$("fNew").onclick = () => { FS = { client: "", date: "", guests: 50, rows: furAllRows(), price: NaN, budget: NaN, svcOn: true }; furRender(); toast("Все позиции подставлены: уберите лишнее крестиком"); };
$("fExample").onclick = () => { FS.rows = furExampleRows(); furRender(); toast("Загружен пример набора"); };

function furGuestRows(c) {
const A = [["Фуршет" + (FS.client ? " — " + FS.client : "")], ["Дата мероприятия", c.dt ? fmtD(c.dt) : ""], ["Гостей", fin(c.G) ? c.G : ""], [], ["Позиция", "На гостя", "Ед.", "Всего", "Ед."]];
FS.rows.forEach(r => { const d = dishById(r.dish), q = num(r.qty), pcs = d && d.unit === "шт", liq = d && d.unit === "л";
A.push([r.title, fin(q) ? q : "", pcs ? "шт" : liq ? "мл" : "г", c.G > 0 && fin(q) ? r2(pcs ? q * c.G : q * c.G / 1000) : "", pcs ? "шт" : liq ? "л" : "кг"]); });
A.push([], ["Цена на гостя, ₽", r2(c.price)], ["Фуршет всего, ₽", r2(c.menu)]);
if (FS.svcOn) A.push(["Обслуживание " + fm(c.svcPct * 100) + "%, ₽", r2(c.svc)]);
A.push(["ИТОГО, ₽", r2(c.total)], ["Предоплата " + fm(num(DB.settings.prepay)) + "%, ₽", r2(c.pre)], ["Остаток, ₽", r2(c.total - c.pre)]);
if (c.dt) A.push(["Оплатить остаток до", fmtD(minusDays(c.dt, num(DB.settings.payDays) || 0))]);
return A;
}
function furText() {
const c = furCalc(), L = [`Фуршет${FS.client ? " — " + FS.client : ""}${c.dt ? ", " + fmtD(c.dt) : ""}`, `Гостей: ${fm(c.G)}`, "", "Набор на гостя:"];
FS.rows.forEach(r => { const d = dishById(r.dish); L.push(`• ${r.title} — ${fm(num(r.qty))} ${fUnit(d)}`); });
L.push("", `Цена на гостя: ${rub(c.price)}`, `Фуршет: ${rub(c.menu)}`);
if (FS.svcOn) L.push(`Обслуживание ${fm(c.svcPct * 100)}%: ${rub(c.svc)}`);
L.push(`ИТОГО: ${rub(c.total)}`, `Предоплата ${fm(num(DB.settings.prepay))}%: ${rub(c.pre)}`, `Остаток ${rub(c.total - c.pre)}${c.dt ? " — до " + fmtD(minusDays(c.dt, num(DB.settings.payDays) || 0)) : ""}`);
return L.join("\n");
}
$("fXls").onclick = () => loadXLSX(() => { const c = furCalc(), wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, xSheet(furGuestRows(c), [48, 12, 6, 12, 6]), "Фуршет");
XLSX.writeFile(wb, `Фуршет_${fileSafe(FS.client || "смета")}_${FS.date || today()}.xlsx`); toast("Смета фуршета сохранена в Excel"); });
$("fXlsInt").onclick = () => loadXLSX(() => { const c = furCalc(), wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, xSheet(furGuestRows(c), [48, 12, 6, 12, 6]), "Смета");
const S = [["Позиция", "Позиция в Айко", "На гостя", "Ед.", "Себестоимость за ед., ₽", "Себестоимость на гостя, ₽"]];
FS.rows.forEach(r => { const d = dishById(r.dish); S.push([r.title, d ? d.name : "", num(r.qty), fUnit(d), d && fin(d.cost) ? d.cost : "нет цены", r2(fRowCost(r))]); });
S.push([], ["Себестоимость набора на гостя, ₽", "", "", "", "", r2(c.C)], ["Цена на гостя, ₽", "", "", "", "", r2(c.price)], ["Фудкост", "", "", "", "", c.price > 0 ? pc1(c.C / c.price) : ""],
["Целевая цена (фудкост " + fm(c.T * 100) + "%), ₽", "", "", "", "", r2(c.rec)], ["Нижняя граница (фудкост " + fm(c.FL * 100) + "%), ₽", "", "", "", "", r2(c.floorP)],
["Себестоимость на фуршет, ₽", "", "", "", "", c.G > 0 ? r2(c.C * c.G) : ""], ["Валовая прибыль по еде, ₽", "", "", "", "", fin(c.menu) && c.G > 0 ? r2(c.menu - c.C * c.G) : ""]);
if (c.miss.length) S.push(["Нет себестоимости: " + c.miss.join(", ")]);
XLSX.utils.book_append_sheet(wb, xSheet(S, [44, 44, 10, 6, 20, 22]), "Себестоимость");
XLSX.writeFile(wb, `Фуршет_расчёт_для_нас_${fileSafe(FS.client || "")}_${FS.date || today()}.xlsx`); toast("Расчёт для нас сохранён в Excel"); });
$("fCopy").onclick = () => { const t = furText();
const fb = () => { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); toast("Смета скопирована"); } catch (e) { toast("Не удалось скопировать"); } ta.remove(); };
if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(() => toast("Смета скопирована"), fb); else fb(); };
$("fPrint").onclick = () => { $("printArea").innerHTML = `<pre style="font-family:inherit;font-size:12pt;white-space:pre-wrap">${esc(furText())}</pre>`; window.print(); };

// вкладка «Фуршет» в общей навигации
const _showTab = showTab;
showTab = function (t) {
if (t === "fur") {
document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === "fur"));
["banq", "pkgs", "dish", "saved"].forEach(k => { $("tab-" + k).hidden = true; document.body.classList.remove("tab-" + k); });
$("tab-fur").hidden = false; document.body.classList.add("tab-fur");
furRender();
try { localStorage.setItem(KEY + "-tab", "fur"); } catch (e) {}
return;
}
$("tab-fur").hidden = true; document.body.classList.remove("tab-fur");
_showTab(t);
};
try { if (localStorage.getItem(KEY + "-tab") === "fur") showTab("fur"); } catch (e) {}
