/* Справка по заменам: сколько гость доплачивает за каждую замену/добавку и на сколько можно снизить цену за убранное блюдо. Только для сотрудников (класс int прячется в режиме «гость») */
(function () {
  try {
    document.head.insertAdjacentHTML("beforeend", "<style>.gst{font-size:.74rem;font-weight:400;opacity:.85;white-space:nowrap}#sRef .kv.hint{display:block;font-size:.78rem;opacity:.8}</style>");
    var _calc = calc;
    calc = function () {
      var c = _calc.apply(this, arguments);
      try {
        var F = c.F, add = 0, rem = 0;
        (c.rs || []).forEach(function (s) {
          s.gst = NaN;
          if (!s.changed || s.unknown || !(F > 0)) return;
          var g = s.delta / F;
          if (s.capFrom && fin(c.P) && s.delta > 0) g = Math.min(g, s.capFrom - c.P);
          s.gst = g;
          if (g > 0.005) add += g; else if (g < -0.005) rem += -g;
        });
        c.addG = add; c.remG = rem;
        var cheaper = c.p && !(c.unknown && c.unknown.length) && c.D < -0.005;
        c.safeRed = cheaper ? -c.D : 0;
        c.normRed = cheaper && F > 0 ? -c.D / F : 0;
      } catch (e) {}
      return c;
    };
    window.rzGstHtml = function (s) {
      if (!s || !s.changed || s.unknown || !fin(s.gst) || Math.abs(s.gst) < 0.005) return "";
      return '<div class="gst">гостю ' + (s.gst > 0 ? "+" : "−") + fm(Math.abs(s.gst)) + " ₽</div>";
    };
    function ensureBox() {
      if ($("sRef")) return $("sRef");
      var anchor = $("bManual") && $("bManual").closest("label"); if (!anchor) return null;
      anchor.insertAdjacentHTML("beforebegin",
        '<div class="blk int" id="sRef" hidden><div class="kv sm"><span>Для справки: гость доплачивает за замены и добавки</span><span id="sRefAdd"></span></div>' +
        '<div class="kv sm"><span>Скидка за убранное и более дешёвое (по норме)</span><span id="sRefRem"></span></div>' +
        '<div class="kv"><span id="sRefLbl"></span><span id="sRefNet"></span></div>' +
        '<div class="kv" id="sRefSafeRow" hidden><span>Снижать не больше (прибыль в рублях не падает)</span><span id="sRefSafe"></span></div></div>');
      return $("sRef");
    }
    function tot(v, G) { return fm(v) + " ₽" + (G > 0 ? " · на всех " + fm(v * G) + " ₽" : ""); }
    var _rc = recalc;
    recalc = function () {
      var c = _rc.apply(this, arguments);
      try {
        [].forEach.call($("menuBody").querySelectorAll("tr[data-i]"), function (tr) {
          var s = c.rs[+tr.dataset.i], del = tr.querySelector('[data-o="delta"]'); if (!s || !del) return;
          del.insertAdjacentHTML("beforeend", window.rzGstHtml(s));
        });
        var box = ensureBox(); if (!box) return c;
        var changed = c.rs.some(function (s) { return s.changed; });
        box.hidden = !(changed && c.p && c.F > 0);
        if (!box.hidden) {
          var G = c.G;
          $("sRefAdd").textContent = c.addG > 0 ? "+" + tot(c.addG, G) : "—";
          $("sRefRem").textContent = c.remG > 0 ? "−" + tot(c.remG, G) : "—";
          var cheaper = c.safeRed > 0;
          $("sRefLbl").textContent = cheaper ? "Можно снизить цену на (по норме)" : "Итого доплата на гостя";
          $("sRefNet").textContent = cheaper ? tot(c.normRed, G) : (fin(c.rec) ? tot(c.rec, G) : "—");
          $("sRefSafeRow").hidden = !cheaper;
          if (cheaper) { $("sRefSafe").textContent = tot(c.safeRed, G); $("sWhy").textContent = c.why + " Если гость просит скидку: не больше " + rub(c.safeRed) + " на гостя (подробности в «Для справки»), впишите её со знаком минус в поле «Своя доплата»."; }
        }
        var mn = $("sManualNote");
        if (fin(c.man) && c.man < 0 && c.safeRed > 0) {
          mn.hidden = false;
          if (c.man < -c.safeRed - 0.005) { mn.className = "note bad"; mn.textContent = "Скидка больше, чем экономия на блюдах: прибыль в рублях падает на " + rub(-c.man - c.safeRed) + " на гостя" + (c.G > 0 ? ", " + rub((-c.man - c.safeRed) * c.G) + " за банкет" : "") + "."; }
          else { mn.className = "note ok"; mn.textContent = "Скидка не больше экономии на блюдах: прибыль в рублях не падает."; }
        }
      } catch (e) {}
      return c;
    };
    if (!$("tab-banq").hidden) { renderMenu(); recalc(); }
  } catch (e) {}
})();
