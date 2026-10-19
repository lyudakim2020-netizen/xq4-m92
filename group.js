/* Люкс: горячее и гарнир на выбор гостя. Гости делятся по блюдам: сколько порций чего. Себестоимость на гостя = средняя по выбранным порциям */
(function () {
  try {
    document.head.insertAdjacentHTML("beforeend", "<style>.grpbox{display:grid;gap:5px;margin-bottom:6px}.grow{display:grid;grid-template-columns:minmax(0,1fr) 72px auto;gap:8px;align-items:center;font-weight:400}.grow input{text-align:right}.grpbox .gs{font-size:.82rem}.grpbox .gs.bad{color:var(--bad)}.grpbox .gs.ok{color:var(--accent)}.grpbox .gb{display:flex;gap:6px;flex-wrap:wrap}.grpbox .gb button{padding:3px 9px;font-size:.8rem}</style>");
    function dist(r) {
      var m = {}, tot = 0;
      (r.grp.opts || []).forEach(function (o) { var n = num((r.dist || {})[o.dish]); if (fin(n) && n > 0) { m[o.dish] = n; tot += n; } });
      return { m: m, tot: tot };
    }
    function comp(r) {
      var d = dist(r);
      return r.grp.label.replace(/ \(.*\)$/, "") + ": " + r.grp.opts.filter(function (o) { return d.m[o.dish]; }).map(function (o) { return o.title + " — " + fm(d.m[o.dish]) + " порц."; }).join("; ");
    }
    function attach() {
      var p = DB.packages.find(function (x) { return x.id === B.pkg; }); if (!p) return;
      B.rows.forEach(function (r) {
        if (r.grp || !r.base) return;
        var l = p.lines.find(function (l) { return l.grp && l.dish === r.base.dish; });
        if (l) r.grp = l.grp;
      });
    }
    var _rfp = rowsFromPkg;
    rowsFromPkg = function (p) { var rows = _rfp(p); rows.forEach(function (r, i) { if (p.lines[i] && p.lines[i].grp) r.grp = p.lines[i].grp; }); return rows; };
    // старый банкет «Люкс», собранный до этого изменения: пересобрать по новому пакету
    try { var pp = DB.packages.find(function (x) { return x.id === B.pkg; }); if (pp && pp.lines.some(function (l) { return l.grp; }) && !B.rows.some(function (r) { return r.grp; })) B.rows = rowsFromPkg(pp); } catch (e) {}
    var _rs = rowState;
    rowState = function (r) {
      var s = _rs(r);
      if (!r.grp || !r.base || r.removed) return s;
      var d = dist(r); if (!(d.tot > 0)) return s;
      var cur = 0, bad = false;
      Object.keys(d.m).forEach(function (k) { var c = lineCost(k, r.g, null); if (!fin(c)) bad = true; else cur += c * d.m[k] / d.tot; });
      var base = s.base, qty = r.g !== r.base.g;
      var changed = bad || qty || Math.abs(cur - base) > 0.005, unknown = bad || !fin(base);
      return { base: base, cur: bad ? NaN : cur, delta: changed && !unknown ? cur - base : 0, swapped: false, qtyChanged: qty, added: false, changed: changed, unknown: unknown };
    };
    var _rm = renderMenu;
    renderMenu = function () {
      attach(); _rm();
      B.rows.forEach(function (r, i) {
        if (!r.grp) return;
        var tr = $("menuBody").querySelector('tr[data-i="' + i + '"]'); if (!tr) return;
        var td = tr.firstElementChild;
        [].forEach.call(td.querySelectorAll("input.dsel,select"), function (e) { e.style.display = "none"; });
        var w = document.createElement("div"); w.className = "grpbox"; w.dataset.gi = i;
        w.innerHTML = "<b>" + esc(r.grp.label) + '</b><div class="small muted">Граммовка порции справа. Укажите, сколько порций чего.</div>' +
          r.grp.opts.map(function (o) { var n = (r.dist || {})[o.dish];
            return '<div class="grow"><span>' + esc(o.title) + '</span><input class="num" inputmode="numeric" data-gk="cnt" data-dish="' + o.dish + '" value="' + (fin(num(n)) && num(n) > 0 ? n : "") + '" placeholder="0" aria-label="Порций: ' + esc(o.title) + '"><span class="small muted int" data-gc="' + o.dish + '"></span></div>'; }).join("") +
          '<div class="gs" data-gs></div><div class="gb"><button type="button" data-ga="equal">Раздать поровну</button><button type="button" data-ga="clear">Сбросить</button></div>';
        td.insertBefore(w, td.firstChild);
      });
    };
    function paint() {
      var G = num(B.guests), warn = [];
      B.rows.forEach(function (r, i) {
        if (!r.grp) return;
        var w = $("menuBody").querySelector('.grpbox[data-gi="' + i + '"]'); if (!w) return;
        var d = dist(r), st = w.querySelector("[data-gs]");
        r.grp.opts.forEach(function (o) { var el = w.querySelector('[data-gc="' + o.dish + '"]'); if (el) { var c = lineCost(o.dish, r.g, null); el.textContent = fin(c) ? "себест. порции " + fm(c, 2) + " ₽" : "нет себестоимости"; } });
        if (!(d.tot > 0)) { st.className = "gs"; st.textContent = "Пока не распределено: считаем как «" + (dishById(r.base.dish) || {}).name + "» для всех (самый дорогой вариант)."; return; }
        if (G > 0 && Math.abs(d.tot - G) > 0.001) { st.className = "gs bad"; st.textContent = "Распределено " + fm(d.tot) + " из " + fm(G) + " гостей" + (d.tot < G ? ": не хватает " + fm(G - d.tot) : ": лишних " + fm(d.tot - G)) + "."; warn.push(r.grp.label.replace(/ \(.*\)$/, "") + ": распределено " + fm(d.tot) + " из " + fm(G) + " гостей"); }
        else { st.className = "gs ok"; st.textContent = "Распределено " + fm(d.tot) + " из " + fm(G) + " гостей."; }
      });
      return warn;
    }
    function kitchen() {
      B.rows.forEach(function (r) {
        if (!r.grp || r.removed) return; var d = dist(r); if (!(d.tot > 0)) return;
        var base = dishById(r.dish), nm = base ? base.name : r.title;
        [].some.call($("kitBody").querySelectorAll("tr"), function (tr) { if (tr.firstElementChild && tr.firstElementChild.textContent === nm) { tr.remove(); return true; } return false; });
        r.grp.opts.forEach(function (o) {
          var n = d.m[o.dish]; if (!n) return; var dd = dishById(o.dish);
          $("kitBody").insertAdjacentHTML("beforeend", "<tr><td>" + esc(dd ? dd.name : o.title) + " (" + fm(n) + " порц.)</td><td class=\"r v\">" + fm(r.g) + " г</td><td class=\"r v\">" + fm(n * r.g / 1000, 2) + " кг</td></tr>");
        });
      });
    }
    var _rc = recalc;
    recalc = function () {
      var c = _rc(); var warn = paint(); kitchen();
      if (warn.length) { var el = $("iWarn"); el.innerHTML += '<p class="note warn">' + esc(warn.join("; ")) + ". Гостям считаем по средней себестоимости выбранных порций.</p>"; el.hidden = false; }
      return c;
    };
    $("menuBody").addEventListener("input", function (e) {
      if (e.target.dataset.gk !== "cnt") return;
      var tr = e.target.closest("tr[data-i]"), r = tr && B.rows[+tr.dataset.i]; if (!r) return;
      r.dist = r.dist || {}; r.dist[e.target.dataset.dish] = num(e.target.value); recalc();
    });
    $("menuBody").addEventListener("click", function (e) {
      var b = e.target.closest("[data-ga]"), tr = e.target.closest("tr[data-i]"), r = tr && B.rows[+tr.dataset.i];
      if (b && r && r.grp) {
        var G = num(B.guests), k = r.grp.opts.length;
        if (b.dataset.ga === "clear") r.dist = {};
        else if (G > 0) { r.dist = {}; r.grp.opts.forEach(function (o, j) { r.dist[o.dish] = Math.floor(G / k) + (j < G % k ? 1 : 0); }); }
        else { toast("Сначала укажите количество гостей"); return; }
        renderMenu(); recalc(); return;
      }
      var u = e.target.closest('button[data-act="undo"]'), tr2 = u && u.closest("tr[data-i]"), r2 = tr2 && B.rows[+tr2.dataset.i];
      if (r2 && r2.grp) { r2.dist = {}; renderMenu(); recalc(); }
    });
    // гостю: вместо одного блюда — список «блюдо — порций»
    var _st = smetaText;
    smetaText = function () {
      var t = _st();
      B.rows.forEach(function (r) { if (!r.grp || r.removed || !(dist(r).tot > 0)) return; var line = "• " + r.title + " — " + fm(r.g) + " г"; if (t.indexOf(line) >= 0) t = t.replace(line, "• " + comp(r) + " (порция " + fm(r.g) + " г)"); });
      return t;
    };
    var _bg = banqGuestRows;
    banqGuestRows = function (c) {
      var A = _bg(c);
      B.rows.forEach(function (r) { if (!r.grp || r.removed || !(dist(r).tot > 0)) return; A.forEach(function (row) { if (row[0] === r.sec && row[1] === r.title) row[1] = comp(r) + " (порция " + fm(r.g) + " г)"; }); });
      return A;
    };
    if (!$("tab-banq").hidden) { renderMenu(); recalc(); }
  } catch (err) { if (window.console) console.error("group.js", err); }
})();
