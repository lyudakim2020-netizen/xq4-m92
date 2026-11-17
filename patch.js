// оставляем только типовые пакеты; настройки фуршета по умолчанию
window.RIZZW_SEED.packages = window.RIZZW_SEED.packages.filter(p => p.kind === "package");
window.RIZZW_SEED.rev = "2026-11-17-lux-cost-v2";
// 22.10: цены пакетов по решению Люды: Гриль 5 300, Дорадо 6 400, Лосось 7 700 (19.10 временно были 4 800 / 5 980 / 7 200)
(function () {
  var P = { p1: 5300, p2: 6400, p3: 7700 };
  window.RIZZW_SEED.packages.forEach(function (p) { if (P[p.id]) p.price = P[p.id]; });
  var G = window.RIZZW_SEED.groupPrice || {};
  G["Банкет 1300"] = 5300; G["Банкет 1500"] = 6400; G["Банкет 1700"] = 7700;
  window.RIZZW_SEED.groupPrice = G;
  // один раз сбрасываем ручные цены пакетов из браузера, чтобы они не перебили новые
  try {
    if (!localStorage.getItem("rizzw-prices-reset-1022")) {
      var ov0 = JSON.parse(localStorage.getItem("rizzw-price-overrides") || "null");
      if (ov0) { delete ov0.p1; delete ov0.p2; delete ov0.p3; localStorage.setItem("rizzw-price-overrides", JSON.stringify(ov0)); }
      localStorage.setItem("rizzw-prices-reset-1022", "1");
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
// 13.11.2026: «Фуршет ноябрь», состав и порции с фото Люды.
// Уточнение Люды: себестоимость только из первого числового столбца фото.
// Брускетта с ростбифом: уточнено в чате 46,60 руб. за штуку.
(function () {
  var S = window.RIZZW_SEED;
  var menu = [
  {
    "dish": "d79",
    "title": "Канапе блин-ролл с лососем",
    "sec": "Закуски",
    "pcs": 1,
    "g": 0,
    "photo": 31.14
  },
  {
    "dish": "d81",
    "title": "Канапе тортилья с курицей",
    "sec": "Закуски",
    "pcs": 1,
    "g": 0,
    "photo": 18.14
  },
  {
    "dish": "fn-camembert-grape",
    "title": "Канапе камамбер с виноградом",
    "sec": "Закуски",
    "pcs": 1,
    "g": 0,
    "photo": 42.15,
    "newDish": true
  },
  {
    "dish": "d71",
    "title": "Брускетта с ростбифом",
    "sec": "Закуски",
    "pcs": 2,
    "g": 0,
    "photo": 46.6
  },
  {
    "dish": "d72",
    "title": "Брускетта с чатни помодорро",
    "sec": "Закуски",
    "pcs": 2,
    "g": 0,
    "photo": 11.89
  },
  {
    "dish": "d75",
    "title": "Канапе мини капрезе",
    "sec": "Закуски",
    "pcs": 1,
    "g": 0,
    "photo": 37.26
  },
  {
    "dish": "d5",
    "title": "Маслины / оливки",
    "sec": "Закуски",
    "g": 30,
    "photo": 43.74
  },
  {
    "dish": "d17",
    "title": "Фруктовая ваза",
    "sec": "Фрукты",
    "g": 100,
    "photo": 40.1
  },
  {
    "dish": "d18",
    "title": "Шашлык куриный",
    "sec": "Основное блюдо",
    "g": 100,
    "photo": 41.5
  },
  {
    "dish": "fn-turkey-sausages",
    "title": "Колбаски из индейки",
    "sec": "Основное блюдо",
    "g": 100,
    "photo": 48,
    "newDish": true
  },
  {
    "dish": "d38",
    "title": "Овощи на гриле",
    "sec": "Гарнир",
    "g": 75,
    "photo": 25.35
  },
  {
    "dish": "d2",
    "title": "Картофель мини пряный",
    "sec": "Гарнир",
    "g": 75,
    "photo": 5.5
  },
  {
    "dish": "d29",
    "title": "Салат Цезарь с курицей",
    "sec": "Салаты",
    "g": 50,
    "photo": 26
  },
  {
    "dish": "d9",
    "title": "Салат Греческий",
    "sec": "Салаты",
    "g": 50,
    "photo": 33.17
  }
];
  menu.push({dish:"fn-shrimp-canape",title:"Канапе с креветкой",sec:"Закуски",pcs:1,g:0,photo:18,newDish:true});
  menu.forEach(function (l) {
    var d = S.dishes.find(function (x) { return x.id === l.dish; });
    var unitCost = l.pcs ? l.photo : l.photo * 1000 / l.g;
    if (!d) {
      d = { id: l.dish, name: l.title, group: "Легкие закуски/фуршет", unit: l.pcs ? "шт" : "кг", cost: unitCost };
      S.dishes.push(d);
    } else {
      d.cost = unitCost;
      delete d.star;
      if (l.pcs) delete d.unitGuess;
    }
  });
  // Напитки: стоимость одной порции из сообщения; объём не указан.
  [
    ["fn-lemon", "Лимон", 9], ["fn-coffee", "Кофе", 22],
    ["fn-tea", "Чай", 2], ["fn-water", "Вода газ / без газа", 50]
  ].forEach(function (x) {
    S.dishes.push({ id: x[0], name: x[1] + " (порция)", group: "Напитки — Фуршет ноябрь", unit: "шт", cost: x[2] });
    menu.push({ dish: x[0], title: x[1], sec: "Напитки", g: 0, pcs: 1 });
  });
  S.dishes.push({ id: "fn-milk", name: "Молоко", group: "Напитки — Фуршет ноябрь", unit: "л", cost: 100 });
  menu.push({ dish: "fn-milk", title: "Молоко", sec: "Напитки", g: 30 });
  // Соусы: по 30 мл; себестоимость порции 8 и 12 рублей по сообщению Люды.
  [["fn-ketchup", "Кетчуп", "Дополнительно", 8], ["fn-cheese-sauce", "Соус сырный", "Дополнительно", 12]].forEach(function (x) {
    S.dishes.push({ id: x[0], name: x[1], group: "Фуршет ноябрь", unit: "л", cost: x[3] * 1000 / 30 });
    menu.push({ dish: x[0], title: x[1], sec: x[2], g: 30 });
  });
  S.packages.push({
    id: "p-furshet-november", name: "Фуршет ноябрь", price: 0, kind: "package", buffet: true,
    note: "Порции на одного гостя. Брускетты с ростбифом и с чатни — по 2 штуки. Напитки — по одной порции на гостя. Молоко и каждый соус — по 30 мл. Цена договорная.",
    lines: menu.map(function (l) { var row = { sec: l.sec, title: l.title, dish: l.dish, g: l.g }; if (l.pcs) row.pcs = l.pcs; return row; })
  });
})();
// 17.11: сверка Люкса с «Меню люкс.docx». Новые стоимости не подменяем нулём.
(function () {
  var S = window.RIZZW_SEED, p = S.packages.find(function (x) { return x.id === "p6"; });
  if (!p) return;
  // Люда: жюльен 89 руб. за порцию 100 г; пунш 422 руб/л; морс 86 руб/л.
  S.dishes.push({id:"lux-julienne-shrimp",name:"Жюльен с креветками и грибами",group:"Банкет LUX 1650",unit:"кг",cost:890});
  S.dishes.push({id:"lux-cherry-mors",name:"Морс вишнёвый",group:"Банкет LUX 1650",unit:"л",cost:86});
  S.dishes.find(function(d){return d.id === "d54";}).cost = 422;
  var grams = {d47:130,d64:130,d50:60,d49:60,d48:50,d52:40,d67:200};
  p.lines = p.lines.filter(function(l){return l.dish !== "d59";});
  p.lines.forEach(function(l){
    if (grams[l.dish] !== undefined) l.g = grams[l.dish];
    if (l.grp) l.g = l.grp.id === "salad" ? 220 : 120;
    // Самое дорогое горячее по действующему справочнику — утка, не рибай.
    if (l.grp && l.grp.id === "hot") l.dish = "d65";
    if (l.dish === "d54") { l.title = "Пунш «Лесные ягоды»"; l.g = 400; }
  });
  p.lines.splice(1,0,{sec:"Закуски",title:"Жюльен с креветками и грибами",dish:"lux-julienne-shrimp",g:100});
  p.lines.push({sec:"Напитки",title:"Морс вишнёвый",dish:"lux-cherry-mors",g:400});
  p.lines.push({sec:"Напитки",title:"Чай",dish:"fn-tea",g:0,pcs:1});
  p.lines.push({sec:"Напитки",title:"Кофе",dish:"fn-coffee",g:0,pcs:1});
  p.name = "Люкс";
  p.price = 10000;
  p.note = "Каждый гость выбирает один салат (220 г), одно горячее (120 г) и один гарнир (120 г). Морс и пунш — по 400 мл каждого на гостя. Чай и кофе — по одной порции. Для базовой себестоимости выбраны самые дорогие варианты по справочнику: салат с ростбифом, утка, спаржа.";
})();
// Добавляем новую позицию в открытый расчёт этого пакета, сохраняя остальные правки.
// Сохранённые исторические банкеты не меняем. После ручного удаления повторно не добавляем.
try {
  var shrimpFlag = "rizzw-shrimp-added-20261113";
  if (!localStorage.getItem(shrimpFlag)) {
    var shrimpState = JSON.parse(localStorage.getItem("rizzw-banquet-calc-v1") || "null");
    if (shrimpState && shrimpState.cur && shrimpState.cur.pkg === "p-furshet-november" && Array.isArray(shrimpState.cur.rows) && !shrimpState.cur.rows.some(function(r){return r.dish === "fn-shrimp-canape";})) {
      shrimpState.cur.rows.push({sec:"Закуски",title:"Канапе с креветкой",dish:"fn-shrimp-canape",g:0,pcs:1,base:{dish:"fn-shrimp-canape",g:0,pcs:1},removed:false});
      localStorage.setItem("rizzw-banquet-calc-v1",JSON.stringify(shrimpState));
    }
    var shrimpFur = JSON.parse(localStorage.getItem("rizzw-banquet-calc-v1-fur") || "null");
    if (shrimpFur && shrimpFur.packageId === "p-furshet-november" && Array.isArray(shrimpFur.rows) && !shrimpFur.rows.some(function(r){return r.dish === "fn-shrimp-canape";})) {
      shrimpFur.rows.push({dish:"fn-shrimp-canape",title:"Канапе с креветкой",qty:1});
      localStorage.setItem("rizzw-banquet-calc-v1-fur",JSON.stringify(shrimpFur));
    }
    localStorage.setItem(shrimpFlag,"1");
  }
} catch (e) {}
// 13.11: аренда мармитов — внутренний расход 13 000 руб. на открытое мероприятие.
try {
  if (!localStorage.getItem("rizzw-marmite-added-20261113")) {
    var rentalState=JSON.parse(localStorage.getItem("rizzw-banquet-calc-v1")||"null");
    if(rentalState && rentalState.cur && rentalState.cur.pkg==="p-furshet-november" && rentalState.cur.marmiteRent==null){rentalState.cur.marmiteRent=13000;rentalState.cur.suppliesOn=true;localStorage.setItem("rizzw-banquet-calc-v1",JSON.stringify(rentalState));}
    var rentalFur=JSON.parse(localStorage.getItem("rizzw-banquet-calc-v1-fur")||"null");
    if(rentalFur && rentalFur.packageId==="p-furshet-november" && rentalFur.marmiteRent==null){rentalFur.marmiteRent=13000;rentalFur.suppliesOn=true;localStorage.setItem("rizzw-banquet-calc-v1-fur",JSON.stringify(rentalFur));}
    localStorage.setItem("rizzw-marmite-added-20261113","1");
  }
} catch(e) {}
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
// собранные в конструкторе меню (индивидуальные пакеты) тоже не теряем при смене версии данных
try {
  var _s2 = JSON.parse(localStorage.getItem("rizzw-banquet-calc-v1") || "null");
  if (_s2 && _s2.db && _s2.db.rev !== window.RIZZW_SEED.rev && Array.isArray(_s2.db.packages)) {
    var _keep = _s2.db.packages.filter(function (p) { return p && p.kind === "custom"; });
    if (_keep.length) window.RIZZW_SEED.packages = window.RIZZW_SEED.packages.concat(_keep);
  }
} catch (e) {}
// выбор блюда в строке меню подключается после основных скриптов
document.addEventListener("DOMContentLoaded", function () {
  ["choice.js", "group.js", "ref.js", "kitchen.js", "ct.js", "tk.js"].forEach(function (f) { var s = document.createElement("script"); s.src = f; s.async = false; document.body.appendChild(s); });
});
