/* Конструктор банкета: собрать меню из любых блюд справочника, увидеть себестоимость, фудкост и цену, затем посчитать банкет (смета, услуги, скидка) как по обычному пакету.
   Собранное меню сохраняется как «индивидуальный пакет» и видно во вкладке «Пакеты». Только для сотрудников: вкладка с себестоимостью. */
(function () {
  try {
    var LS = KEY + "-ct";
    var S = load();
    function load() {
      var d = { rows: [], name: "Своё меню", target: 18, price: null, guests: 30, pkgId: null, q: "", grp: "" };
      try { var x = JSON.parse(localStorage.getItem(LS) || "null"); if (x && Array.isArray(x.rows)) return Object.assign(d, x); } catch (e) {}
      return d;
    }
    function persist() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) {} }
    var GRP_SEC = { "Легкие закуски/фуршет": "Закуски" };

    document.head.insertAdjacentHTML("beforeend", "<style>.ctl{max-height:300px;overflow:auto;border:1px solid var(--line);border-radius:8px}.ctl button{display:flex;width:100%;justify-content:space-between;gap:10px;align-items:center;text-align:left;border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent;padding:8px 10px;font-weight:400}.ctl button:hover{background:var(--sunk)}.ctl .cc{font-size:.78rem;color:var(--muted);white-space:nowrap}.ct-tbl select{font-size:.78rem;padding:2px 4px;margin-top:3px;max-width:100%}.ct-cmp{font-size:.82rem;color:var(--muted);display:grid;gap:2px}</style>");
    document.querySelector('nav.tabs button[data-tab="pkgs"]').insertAdjacentHTML("beforebegin", '<button type="button" role="tab" data-tab="ct" aria-selected="false">Конструктор</button>');
    $("tab-saved").insertAdjacentHTML("afterend", `<section id="tab-ct" class="layout" hidden>
<div class="col">
<div class="panel">
<h2>Конструктор банкета</h2>
<p class="why" style="margin-top:6px">Соберите меню из любых блюд справочника: найдите блюдо, нажмите, при необходимости поправьте граммовку. Справа сразу себестоимость, фудкост и цена. Потом «Посчитать банкет» откроет смету с услугами и скидкой.</p>
<div class="grid-params">
<label class="f" for="ctBase">Начать с готового меню<select id="ctBase"></select></label>
<div class="f" style="align-self:end"><button type="button" id="ctLoad">Взять состав пакета</button></div>
</div>
</div>
<div class="panel">
<h2>Найти блюдо</h2>
<div class="grid-params">
<label class="f" for="ctQ">Поиск<input id="ctQ" placeholder="Например, дорада, салат, канапе"></label>
<label class="f" for="ctG">Группа<select id="ctG"></select></label>
</div>
<div class="ctl" id="ctList" role="list"></div>
<p class="small muted" id="ctCnt" style="margin:6px 0 0"></p>
</div>
<div class="panel">
<div class="row between"><h2>Состав меню на одного гостя</h2><button type="button" id="ctClear">Очистить</button></div>
<div class="tw"><table class="ct-tbl" style="min-width:420px">
<thead><tr><th>Блюдо</th><th class="r">На гостя</th><th class="r int">Себест., ₽</th><th></th></tr></thead>
<tbody id="ctBody"></tbody></table></div>
</div>
</div>
<aside class="col sticky" aria-live="polite">
<div class="panel int">
<h2>Цена и фудкост</h2>
<div class="big"><span class="lbl">Рекомендуемая цена на гостя</span><span class="val" id="ctRec">—</span><span class="sub" id="ctRecSub"></span></div>
<p class="why" id="ctWhy"></p>
<div class="kv"><span>Себестоимость на гостя</span><span id="ctCost"></span></div>
<div class="kv"><span>Выход еды на гостя</span><span id="ctGr"></span></div>
<label class="f" for="ctTarget">Целевой фудкост, %<input id="ctTarget" class="num" inputmode="decimal"></label>
<label class="f" for="ctPrice">Своя цена на гостя, ₽ (если не рекомендованная)<input id="ctPrice" class="num" inputmode="decimal" placeholder="по расчёту"></label>
<div class="kv em"><span>Цена на гостя в расчёте</span><span id="ctUse"></span></div>
<div class="kv"><span>Фудкост по этой цене</span><span id="ctFc"></span></div>
<div class="kv"><span>Прибыль с блюд на гостя</span><span id="ctGp"></span></div>
<div class="kv"><span>Наценка ×</span><span id="ctMk"></span></div>
<div class="kv"><span id="ctLTot">Меню на всех гостей</span><span id="ctTot"></span></div>
<p class="note warn" id="ctWarn" hidden></p>
<div class="ct-cmp" id="ctCmp"></div>
</div>
<div class="panel">
<h2>Посчитать банкет</h2>
<label class="f" for="ctName">Название меню<input id="ctName"></label>
<label class="f" for="ctGuests">Гостей<input id="ctGuests" class="num" inputmode="numeric"></label>
<div class="row"><button type="button" class="pri" id="ctGo">Посчитать банкет по этому меню</button></div>
<p class="small muted" id="ctGoNote" style="margin:6px 0 0">Меню сохранится как индивидуальный пакет (вкладка «Пакеты»), в банкете можно будет менять блюда, добавлять услуги и скидку.</p>
</div>
</aside>
</section>`);

    function R() { return Math.max(1, num(DB.settings.roundTo) || 50); }
    function typical(id) {
      for (var i = 0; i < DB.packages.length; i++) { var l = DB.packages[i].lines.find(function (x) { return x.dish === id; }); if (l) return l; }
      return null;
    }
    function addDish(d) {
      var t = typical(d.id), unitPcs = d.unit === "шт";
      S.rows.push({ id: uid("r"), sec: t ? t.sec : (GRP_SEC[d.group] || "Дополнительно"), title: t ? t.title : clean(d.name), dish: d.id,
        g: unitPcs ? null : (t && t.g > 0 ? t.g : 100), pcs: unitPcs ? (t && t.pcs > 0 ? t.pcs : 1) : null });
    }
    function stats() {
      var cost = 0, grams = 0, miss = [];
      S.rows.forEach(function (r) {
        var v = lineCost(r.dish, r.g, r.pcs), d = dishById(r.dish);
        if (fin(v)) cost += v; else miss.push(r.title);
        if (d && d.unit !== "шт" && d.unit !== "л") grams += num(r.g) || 0;
      });
      var tg = (num(S.target) || 0) / 100;
      var rec = cost > 0 && tg > 0 ? Math.ceil(cost / tg / R() - 1e-9) * R() : NaN;
      var own = num(S.price), use = own > 0 ? own : rec;
      return { cost: cost, grams: grams, miss: miss, rec: rec, use: use, own: own > 0 };
    }

    function renderBase() {
      $("ctBase").innerHTML = '<option value="">— выберите —</option>' + DB.packages.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + (p.price > 0 ? " — " + fm(p.price) + " ₽" : "") + "</option>"; }).join("");
    }
    function renderGroups() {
      var gs = [];
      DB.dishes.forEach(function (d) { if (gs.indexOf(d.group || "") < 0) gs.push(d.group || ""); });
      $("ctG").innerHTML = '<option value="">все группы</option>' + gs.map(function (g) { return "<option" + (g === S.grp ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("");
    }
    function renderList() {
      var q = norm(S.q), res = DB.dishes.filter(function (d) { return (!q || norm(d.name).indexOf(q) >= 0) && (!S.grp || d.group === S.grp); });
      var shown = res.slice(0, 60);
      $("ctList").innerHTML = shown.map(function (d) {
        return '<button type="button" data-add="' + esc(d.id) + '"><span>' + esc(d.name) + '</span><span class="cc int">' + (fin(d.cost) ? fm(d.cost, 2) + " ₽/" + d.unit : "нет себестоимости") + " · +</span></button>";
      }).join("") || '<p class="muted" style="padding:10px;margin:0">Ничего не найдено.</p>';
      $("ctCnt").textContent = res.length > shown.length ? "Показано " + shown.length + " из " + res.length + ". Уточните поиск." : "Найдено блюд: " + res.length + ".";
    }
    function renderRows() {
      var order = S.rows.map(function (r, i) { return { r: r, i: i, k: SECS.indexOf(r.sec) < 0 ? 99 : SECS.indexOf(r.sec) }; });
      order.sort(function (a, b) { return a.k - b.k || a.i - b.i; });
      var h = "", last = null;
      order.forEach(function (o) {
        var r = o.r, d = dishById(r.dish), isPcs = d && d.unit === "шт";
        if (r.sec !== last) { h += '<tr class="sec"><td colspan="4">' + esc(r.sec) + "</td></tr>"; last = r.sec; }
        var q = isPcs
          ? '<div class="qty"><input class="num" data-k="pcs" inputmode="decimal" value="' + (fin(r.pcs) ? r.pcs : "") + '" aria-label="Штук на гостя"><span>шт</span></div>'
          : '<div class="qty"><input class="num" data-k="g" inputmode="decimal" value="' + (fin(r.g) ? r.g : "") + '" aria-label="Граммов на гостя"><span>' + (d && d.unit === "л" ? "мл" : "г") + "</span></div>";
        h += '<tr data-i="' + o.i + '"><td><input data-k="title" value="' + esc(r.title) + '" aria-label="Название в меню"><div class="aiko">' + esc(d ? d.name : "") + (d && !fin(d.cost) ? ' <span class="chip bad int">нет себестоимости</span>' : "") + (d && d.star ? ' <span class="chip warn int">цена со *</span>' : "") +
          '</div><select data-k="sec" aria-label="Раздел">' + SECS.map(function (x) { return "<option" + (x === r.sec ? " selected" : "") + ">" + x + "</option>"; }).join("") + '</select></td>' +
          '<td class="r">' + q + '</td><td class="r v int" data-o="cost"></td><td class="r"><button type="button" class="icon" data-act="del" aria-label="Убрать блюдо">✕</button></td></tr>';
      });
      $("ctBody").innerHTML = h || '<tr><td colspan="4" class="muted">Меню пустое. Найдите блюдо выше и нажмите на него.</td></tr>';
      paint();
    }
    function paint() {
      var st = stats(), G = num(S.guests);
      [].forEach.call($("ctBody").querySelectorAll("tr[data-i]"), function (tr) {
        var r = S.rows[+tr.dataset.i]; if (!r) return;
        tr.querySelector('[data-o="cost"]').textContent = fm(lineCost(r.dish, r.g, r.pcs), 2);
      });
      $("ctRec").textContent = fin(st.rec) ? rub(st.rec) : "—";
      $("ctRecSub").textContent = fin(st.rec) && G > 0 ? "× " + fm(G) + " гостей = " + rub(st.rec * G) : "";
      $("ctWhy").textContent = S.rows.length ? "Рекомендуемая цена = себестоимость ÷ целевой фудкост, округлено вверх до " + fm(R()) + " ₽." : "Добавьте блюда, и здесь появится цена.";
      $("ctCost").textContent = rub(st.cost, 2);
      $("ctGr").textContent = fm(st.grams) + " г";
      $("ctUse").textContent = fin(st.use) ? rub(st.use) : "—";
      var fc = fin(st.use) && st.use > 0 ? st.cost / st.use : NaN;
      $("ctFc").textContent = pct(fc);
      $("ctGp").textContent = fin(st.use) ? rub(st.use - st.cost, 2) : "—";
      $("ctMk").textContent = st.cost > 0 && fin(st.use) ? fm(st.use / st.cost, 2) : "—";
      $("ctLTot").textContent = G > 0 ? "Меню на " + fm(G) + " гостей" : "Меню на всех гостей";
      $("ctTot").textContent = fin(st.use) && G > 0 ? rub(st.use * G) : "—";
      var w = [], fw = (num(DB.settings.fcWarn) || 0) / 100;
      if (st.miss.length) w.push("Нет себестоимости: " + st.miss.join(", ") + ". Себестоимость и цена занижены.");
      if (fw > 0 && fc > fw) w.push("Фудкост " + pct(fc) + " выше порога " + pct(fw) + ".");
      if (st.own && fin(st.rec) && st.own < st.rec) w.push("Своя цена ниже рекомендованной на " + rub(st.rec - st.own) + " на гостя.");
      $("ctWarn").hidden = !w.length; $("ctWarn").textContent = w.join(" ");
      $("ctCmp").innerHTML = '<b style="font-weight:600">Для сравнения</b>' + DB.packages.filter(function (p) { return p.kind === "package" && p.price > 0; }).map(function (p) {
        var s = pkgStats(p); return "<span>" + esc(p.name) + ": " + fm(p.price) + " ₽, фудкост " + pct(s.fc) + "</span>"; }).join("");
      $("ctGo").disabled = !S.rows.length || !(st.use > 0);
    }
    function renderAll() {
      renderBase(); renderGroups(); renderList(); renderRows();
      $("ctQ").value = S.q || ""; $("ctTarget").value = S.target; $("ctPrice").value = num(S.price) > 0 ? S.price : "";
      $("ctName").value = S.name; $("ctGuests").value = fin(num(S.guests)) ? S.guests : "";
    }

    $("ctQ").addEventListener("input", function (e) { S.q = e.target.value; persist(); renderList(); });
    $("ctG").addEventListener("change", function (e) { S.grp = e.target.value; persist(); renderList(); });
    $("ctList").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-add]"); if (!b) return;
      var d = dishById(b.dataset.add); if (!d) return;
      addDish(d); persist(); renderRows(); toast("Добавлено: " + clean(d.name));
    });
    $("ctBody").addEventListener("input", function (e) {
      var tr = e.target.closest("tr[data-i]"), r = tr && S.rows[+tr.dataset.i], k = e.target.dataset.k; if (!r) return;
      if (k === "g" || k === "pcs") { r[k] = num(e.target.value); if (!fin(r[k])) r[k] = 0; persist(); paint(); }
      if (k === "title") { r.title = e.target.value; persist(); }
    });
    $("ctBody").addEventListener("change", function (e) {
      var tr = e.target.closest("tr[data-i]"), r = tr && S.rows[+tr.dataset.i]; if (!r) return;
      if (e.target.dataset.k === "sec") { r.sec = e.target.value; persist(); renderRows(); }
    });
    $("ctBody").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]"); if (!b) return;
      S.rows.splice(+b.closest("tr").dataset.i, 1); persist(); renderRows();
    });
    $("ctClear").addEventListener("click", function () { S.rows = []; S.pkgId = null; persist(); renderRows(); });
    $("ctLoad").addEventListener("click", function () {
      var p = DB.packages.find(function (x) { return x.id === $("ctBase").value; });
      if (!p) { toast("Выберите меню из списка"); return; }
      S.rows = p.lines.filter(function (l) { return l.dish && dishById(l.dish); }).map(function (l) { return { id: uid("r"), sec: l.sec, title: l.title, dish: l.dish, g: l.g, pcs: l.pcs }; });
      S.name = p.name + " (своё)"; S.pkgId = null; S.price = null;
      persist(); renderAll(); toast("Состав пакета «" + p.name + "» загружен: меняйте блюда как нужно");
    });
    $("ctTarget").addEventListener("input", function (e) { S.target = num(e.target.value); persist(); paint(); });
    $("ctPrice").addEventListener("input", function (e) { S.price = num(e.target.value); persist(); paint(); });
    $("ctName").addEventListener("input", function (e) { S.name = e.target.value; persist(); });
    $("ctGuests").addEventListener("input", function (e) { S.guests = num(e.target.value); persist(); paint(); });
    $("ctGo").addEventListener("click", function () {
      var st = stats(); if (!S.rows.length || !(st.use > 0)) return;
      var p = DB.packages.find(function (x) { return x.id === S.pkgId; });
      if (!p) { p = { id: uid("p"), kind: "custom" }; DB.packages.push(p); S.pkgId = p.id; }
      p.name = (S.name || "").trim() || "Своё меню"; p.price = st.use; p.kind = "custom";
      p.note = "Собрано в конструкторе. Цена и состав можно менять во вкладке «Пакеты».";
      p.lines = S.rows.map(function (r) { return { sec: r.sec, title: r.title || clean((dishById(r.dish) || {}).name), dish: r.dish, g: r.g, pcs: r.pcs, check: false }; });
      B = newBanquet(p.id); if (num(S.guests) > 0) B.guests = num(S.guests);
      persist(); save(); showTab("banq"); toast("Банкет по меню «" + p.name + "»: " + fm(p.price) + " ₽ на гостя");
    });

    var _show = showTab;
    showTab = function (t) {
      if (t === "ct") {
        document.querySelectorAll("nav.tabs button").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.tab === "ct"); });
        ["banq", "pkgs", "dish", "saved", "fur", "tk"].forEach(function (k) { var el = $("tab-" + k); if (el) el.hidden = true; document.body.classList.remove("tab-" + k); });
        $("tab-ct").hidden = false; document.body.classList.add("tab-ct");
        renderAll();
        try { localStorage.setItem(KEY + "-tab", "ct"); } catch (e) {}
        return;
      }
      $("tab-ct").hidden = true; document.body.classList.remove("tab-ct");
      _show(t);
    };
    try { if (localStorage.getItem(KEY + "-tab") === "ct") showTab("ct"); } catch (e) {}
  } catch (err) {
    if (window.console) console.error("ct.js", err);
    try { if (localStorage.getItem(KEY + "-tab") === "ct") { localStorage.setItem(KEY + "-tab", "banq"); showTab("banq"); } } catch (e) {}
  }
})();
