// оставляем только типовые пакеты; настройки фуршета по умолчанию
window.RIZZW_SEED.packages = window.RIZZW_SEED.packages.filter(p => p.kind === "package");
window.RIZZW_SEED.rev = "2026-10-19T14:45:00Z";
// 19.10: вернули прежние цены пакетов (как в банкетном меню 2026): Гриль 4 800, Дорадо 5 980, Лосось 7 200
(function () {
  var P = { p1: 4800, p2: 5980, p3: 7200 };
  window.RIZZW_SEED.packages.forEach(function (p) { if (P[p.id]) p.price = P[p.id]; });
  var G = window.RIZZW_SEED.groupPrice || {};
  G["Банкет 1300"] = 4800; G["Банкет 1500"] = 5980; G["Банкет 1700"] = 7200;
  window.RIZZW_SEED.groupPrice = G;
  // один раз сбрасываем старые «ручные» цены из браузера, чтобы они не вернули 5 300 / 6 400 / 7 700
  try {
    if (!localStorage.getItem("rizzw-prices-reset-1019")) {
      var ov0 = JSON.parse(localStorage.getItem("rizzw-price-overrides") || "null");
      if (ov0) { delete ov0.p1; delete ov0.p2; delete ov0.p3; localStorage.setItem("rizzw-price-overrides", JSON.stringify(ov0)); }
      localStorage.setItem("rizzw-prices-reset-1019", "1");
    }
  } catch (e) {}
})();
// себестоимость фуршетных позиций по свежей выгрузке Айко от 17.10 (вечер)
(function () {
  var f = { d68: 47.86, d69: 29.94, d70: 133.37, d71: 136.52, d72: 13.51, d73: 134.31, d74: 58.32, d75: 46.51, d76: 26.83, d77: 17.92, d78: 15.00, d79: 29.41, d80: 19.08, d81: 17.51, d82: 155.27, d83: 30.31, d84: 98.82, d85: 66.41, d86: 89.98, d87: 54.25, d88: 30.14, d89: 133.11, d90: 36.36, d91: 21.43, d92: 28.22, d93: 10.07 };
  window.RIZZW_SEED.dishes.forEach(function (d) { if (f[d.id] !== undefined) d.cost = f[d.id]; });
})();
// себестоимость хлеба и напитков по техкарте «Меню Гриль 4800» из Айко (19.10): багет 220 ₽/кг (в Айко со *), дарницкий 86,75 ₽/кг,
// булочки = хлеб дарницкий 86,75 ₽/кг, морс «Ягодный» = вишня + брусника (17,07 + 30,13 за 0,4 л) = 118 ₽/л, вода 0,5 л = 31,28 ₽ (62,56 ₽/л)
(function () {
  var c = { d94: [220, true], d95: [86.75, false], d96: [86.75, false], d97: [118, false], d98: [62.56, false] };
  window.RIZZW_SEED.dishes.forEach(function (d) { var x = c[d.id]; if (x) { d.cost = x[0]; d.star = x[1]; if (d.group === "Нет в выгрузке Айко") d.group = "Хлеб и напитки (техкарта Айко)"; } });
})();
Object.assign(window.RIZZW_SEED.settings, { furTarget: 16, furFloor: 17, furMin: 0 });
// Люкс: пять горячих блюд на выбор (Рибай, ягнёнок, лосось, тунец, утка): каждый гость выбирает ОДНО; три гарнира: каждый гость выбирает ОДИН.
// Гости делятся по блюдам (например 10 рибаев, 10 лососей, 10 уток). В цене пакета заложены самые дорогие варианты (Рибай и спаржа).
(function () {
  var p = window.RIZZW_SEED.packages.find(function (x) { return x.id === "p6"; });
  if (!p) return;
  var hot = [
    { dish: "d61", title: "Стейк «Рибай»" },
    { dish: "d66", title: "Филе ягнёнка на мангале" },
    { dish: "d62", title: "Стейк лосося в сливочно-икорном соусе" },
    { dish: "d63", title: "Стейк тунца с кунжутом" },
    { dish: "d65", title: "Утиное филе «Магре» с ягодным соусом" } ];
  var side = [
    { dish: "d53", title: "Молодая спаржа с цветной капустой, томатами черри и болгарским перцем" },
    { dish: "d55", title: "Рис «Жасмин» с овощным миксом" },
    { dish: "d51", title: "Картофель «По-далматински» со шпинатом и специями" } ];
  var salad = [
    { dish: "d58", title: "Салат с ростбифом, нектарином и грецким орехом" },
    { dish: "d57", title: "Салат с креветками и карамелизированной грушей" },
    { dish: "d56", title: "Салат из хрустящих баклажанов и спелых томатов" } ];
  var out = [];
  p.lines.forEach(function (l) {
    if (l.sec === "Салаты") { if (l.dish === "d58") { l.title = "Салат на выбор гостя"; l.g = 150; l.grp = { id: "salad", label: "Салат на выбор гостя (один на гостя)", opts: salad }; out.push(l); } return; }
    if (l.sec === "Основное блюдо") { if (l.dish === "d61") { l.title = "Горячее на выбор гостя"; l.check = false; l.grp = { id: "hot", label: "Горячее на выбор гостя (одно блюдо на гостя)", opts: hot }; out.push(l); } return; }
    if (l.sec === "Гарнир") { if (l.dish === "d53") { l.title = "Гарнир на выбор гостя"; l.grp = { id: "side", label: "Гарнир на выбор гостя (один на гостя)", opts: side }; out.push(l); } return; }
    out.push(l);
  });
  p.lines = out;
  p.note = "Меню 1650 г заявлено. Каждый гость выбирает одно горячее из пяти (Рибай, ягнёнок, лосось, тунец, утка) и один гарнир из трёх. Салат тоже на выбор: один из трёх на гостя (порция 150 г, уточняется: 150 или 200). Во вкладке «Банкет» укажите, сколько порций чего. В цене пакета заложены самые дорогие варианты (Рибай, салат с ростбифом, спаржа). Граммовку порций проверьте. Цена пока не задана.";
})();
Object.assign(window.RIZZW_SEED.settings, { furTarget: 16, furFloor: 17, furMin: 0 });
// цены пакетов, которые вы задали сами (вкладка «Пакеты»), не пропадают при обновлении калькулятора
try {
  var _ov = JSON.parse(localStorage.getItem("rizzw-price-overrides") || "null");
  if (_ov) window.RIZZW_SEED.packages.forEach(function (p) {
    if (typeof _ov[p.id] === "number" && isFinite(_ov[p.id]) && _ov[p.id] >= 0) {
      p.price = _ov[p.id];
      if (p.price > 0) { p.name = p.name.replace(/\s*\(цена не задана\)/, ""); p.note = (p.note || "").replace(/\s*Цена пока не задана\./, ""); }
    }
  });
} catch (e) {}
// при смене версии данных не теряем сохранённые банкеты из этого браузера
try {
  var _s = JSON.parse(localStorage.getItem("rizzw-banquet-calc-v1") || "null");
  if (_s && _s.db && _s.db.rev !== window.RIZZW_SEED.rev && Array.isArray(_s.db.banquets) && _s.db.banquets.length) window.RIZZW_SEED.banquets = _s.db.banquets;
} catch (e) {}
// выбор блюда в строке меню подключается после основных скриптов
document.addEventListener("DOMContentLoaded", function () {
  ["choice.js", "group.js", "ref.js", "tk.js"].forEach(function (f) { var s = document.createElement("script"); s.src = f; s.async = false; document.body.appendChild(s); });
});
