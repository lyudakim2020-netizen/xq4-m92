/* Выбор блюда из списка вариантов в строке меню (горячее и гарнир в Люксе) */
(function () {
  try {
    function attach() {
      var p = DB.packages.find(function (x) { return x.id === B.pkg; });
      if (!p) return;
      B.rows.forEach(function (r) {
        if (r.opts || !r.base) return;
        var l = p.lines.find(function (l) { return l.opts && l.dish === r.base.dish && l.g === r.base.g; });
        if (l) r.opts = l.opts;
      });
    }
    var _rowsFromPkg = rowsFromPkg;
    rowsFromPkg = function (p) {
      var rows = _rowsFromPkg(p);
      rows.forEach(function (r, i) { if (p.lines[i] && p.lines[i].opts) r.opts = p.lines[i].opts; });
      return rows;
    };
    var _renderMenu = renderMenu;
    renderMenu = function () {
      attach();
      _renderMenu();
      B.rows.forEach(function (r, i) {
        if (!r.opts) return;
        var tr = $("menuBody").querySelector('tr[data-i="' + i + '"]'); if (!tr) return;
        var inp = tr.querySelector("input.dsel"); if (!inp) return;
        var cur = r.opts.find(function (o) { return o.dish === r.dish; });
        var sel = document.createElement("select");
        sel.dataset.k = "opt"; sel.setAttribute("aria-label", "Выбор гостя");
        sel.style.marginBottom = "4px";
        sel.innerHTML = r.opts.map(function (o) { return '<option value="' + o.dish + '"' + (cur && cur.dish === o.dish ? " selected" : "") + ">" + esc(o.title) + "</option>"; }).join("") +
          (cur ? "" : '<option value="" selected>— другое блюдо (из поля ниже) —</option>');
        inp.parentNode.insertBefore(sel, inp);
      });
    };
    var _recalc2 = recalc;
    recalc = function () {
      var c = _recalc2();
      B.rows.forEach(function (r, i) {
        if (!r.opts) return;
        var tr = $("menuBody").querySelector('tr[data-i="' + i + '"]'); if (!tr) return;
        tr.querySelectorAll(".chip.swap").forEach(function (ch) { if (/^замена/.test(ch.textContent)) ch.textContent = "выбор гостя"; });
      });
      return c;
    };
    $("menuBody").addEventListener("change", function (e) {
      if (e.target.dataset.k !== "opt") return;
      var tr = e.target.closest("tr[data-i]"); if (!tr) return;
      var r = B.rows[+tr.dataset.i]; if (!r || !r.opts) return;
      var o = r.opts.find(function (x) { return x.dish === e.target.value; });
      if (!o) return;
      r.dish = o.dish; r.title = o.title; r.g = o.g; r.pcs = o.pcs; r.removed = false;
      renderMenu(); recalc();
    });
    // цена пакета, внесённая вручную, запоминается и переживает обновления калькулятора
    $("pkgEdit").addEventListener("change", function (e) {
      if (e.target.dataset.pf !== "price") return;
      var p = DB.packages.find(function (x) { return x.id === selPkg; });
      if (!p || !isFinite(p.price) || p.price < 0) return;
      var ov = {}; try { ov = JSON.parse(localStorage.getItem("rizzw-price-overrides") || "{}") || {}; } catch (x) {}
      ov[p.id] = p.price;
      try { localStorage.setItem("rizzw-price-overrides", JSON.stringify(ov)); } catch (x) {}
      if (p.price > 0) { p.name = p.name.replace(/\s*\(цена не задана\)/, ""); p.note = (p.note || "").replace(/\s*Цена пока не задана\./, ""); }
      save(); renderPkgs(); toast("Цена пакета сохранена");
    });
    if (!$("tab-banq").hidden) { renderMenu(); recalc(); }
  } catch (err) { if (window.console) console.error("choice.js", err); }
})();
