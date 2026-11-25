/* Заявка на кухню: общий код для вкладок «Банкет», «Конструктор» и «Под ключ».
   Считает «сколько готовить» по составу меню и количеству гостей, печатает заявку (Печать / PDF).
   В заявке нет цен и себестоимости: её можно отдавать кухне. Подключается из patch.js перед ct.js и tk.js. */
(function () {
  try {
    document.head.insertAdjacentHTML("beforeend", "<style>.kitdoc{color:#000}.kitdoc h1{font-size:20pt;margin:0 0 3mm}.kitdoc .kitm{font-size:12pt;margin:0 0 6mm;line-height:1.5}.kitdoc table{width:100%;border-collapse:collapse}.kitdoc th{text-align:left;border-bottom:2px solid #000;padding:6px;font-size:11pt}.kitdoc td{border-bottom:1px solid #999;padding:7px 6px;font-size:13pt}.kitdoc td.r,.kitdoc th.r{text-align:right;white-space:nowrap}.kitdoc tr{page-break-inside:avoid}.kitdoc .kitf{margin-top:8mm;font-size:10pt;color:#555}.kitbar{margin-top:10px}</style>");

    /* Состав меню -> строки заявки. rows: [{dish, title, g, pcs, removed}], G: гостей.
       Одинаковые блюда складываются; количество считается так же, как в заявке вкладки «Банкет». */
    function lines(rows, G) {
      var kit = {}, order = [];
      (rows || []).forEach(function (r) {
        if (!r || r.removed) return;
        var d = r.dish ? dishById(r.dish) : null, k = r.dish || r.title;
        if (!k || (!d && !r.title)) return;
        if (!kit[k]) { kit[k] = { name: d ? d.name : r.title, unit: d ? d.unit : "кг", g: 0, pcs: 0 }; order.push(k); }
        kit[k].g += num(r.g) || 0; kit[k].pcs += num(r.pcs) || 0;
      });
      return order.map(function (k) {
        var x = kit[k];
        if (x.unit === "шт") return { name: x.name, per: fm(x.pcs, Number.isInteger(x.pcs) ? 0 : 2) + " шт", tot: G > 0 ? fm(x.pcs * G) + " шт" : "—" };
        return { name: x.name, per: fm(x.g, Number.isInteger(x.g) ? 0 : 2) + (x.unit === "л" ? " мл" : " г"), tot: G > 0 ? fm(x.g * G / 1000, 2) + (x.unit === "л" ? " л" : " кг") : "—" };
      });
    }
    function tbody(ls) {
      return ls.map(function (l) { return "<tr><td>" + esc(l.name) + '</td><td class="r v">' + esc(l.per) + '</td><td class="r v">' + esc(l.tot) + "</td></tr>"; }).join("");
    }
    function docHTML(meta, ls) {
      return '<div class="kitdoc"><h1>Заявка на кухню</h1><p class="kitm">' + meta.parts.map(esc).join("<br>") + "</p>" +
        '<table><thead><tr><th>Блюдо</th><th class="r">На гостя</th><th class="r">Всего</th></tr></thead><tbody>' + tbody(ls) + "</tbody></table>" +
        '<p class="kitf">Составлено ' + esc(new Date().toLocaleDateString("ru-RU")) + ". Количество на одного гостя умножено на число гостей.</p></div>";
    }
    /* meta: { parts: ["Клиент: …", …], G: гостей, file: "часть имени файла" } */
    function print(meta, ls) {
      if (!ls.length) { toast("В меню нет блюд: печатать нечего"); return false; }
      if (!(meta.G > 0)) { toast("Укажите количество гостей: без него «Всего» не посчитать"); return false; }
      $("printArea").innerHTML = docHTML(meta, ls);
      var old = document.title;
      document.title = "Заявка на кухню" + (meta.file ? " — " + meta.file : "");
      var back = function () { document.title = old; };
      window.addEventListener("afterprint", back, { once: true });
      setTimeout(back, 60000);
      window.print();
      return true;
    }
    async function download(meta, ls) {
      if (!ls.length) { toast("В меню нет блюд: сохранять нечего"); return false; }
      if (!(meta.G > 0)) { toast("Укажите количество гостей: без него «Всего» не посчитать"); return false; }
      try {
        if (!window.rzExport || !window.rzExport.pdfReady) throw new Error("Обновите страницу для сохранения PDF");
        toast("Готовлю заявку на кухню…");
        await window.rzExport.pdfReady();
        var body = [[{text:"Блюдо",bold:true,fillColor:"#E7EBE9"},{text:"На гостя",bold:true,fillColor:"#E7EBE9",alignment:"right"},{text:"Всего",bold:true,fillColor:"#E7EBE9",alignment:"right"}]];
        ls.forEach(function(l){body.push([l.name,{text:l.per,alignment:"right"},{text:l.tot,alignment:"right"}]);});
        var doc = {
          pageSize:"A4",pageMargins:[40,36,40,36],defaultStyle:{font:"Roboto",fontSize:10,color:"#17221E"},
          content:[
            {columns:[{text:"Заявка на кухню",fontSize:17,bold:true,width:"*"},{text:"RizzW",fontSize:25,bold:true,italics:true,color:"#244D40",alignment:"right",width:125}],margin:[0,0,0,14]},
            {text:meta.parts.join("\n"),margin:[0,0,0,14],lineHeight:1.3},
            {table:{headerRows:1,dontBreakRows:true,widths:["*",85,95],body:body},layout:{hLineWidth:function(){return .5;},vLineWidth:function(){return .5;},hLineColor:function(){return "#B8C2BE";},vLineColor:function(){return "#B8C2BE";},paddingTop:function(){return 5;},paddingBottom:function(){return 5;},paddingLeft:function(){return 7;},paddingRight:function(){return 7;}}}
          ],
          footer:function(p,pages){return {text:"RizzW · Заявка на кухню · "+p+" / "+pages,alignment:"right",fontSize:8,color:"#68756E",margin:[40,8,40,0]};},
          info:{title:"Заявка на кухню",author:"RizzW"}
        };
        var file=("Заявка на кухню"+(meta.file?" — "+meta.file:"")).replace(/[\\/:*?"<>|]/g," ");
        window.pdfMake.createPdf(doc).download(file+".pdf");
        return true;
      } catch(e) {toast(e.message||"Не удалось сохранить заявку");return false;}
    }
    window.rzKit = { lines: lines, tbody: tbody, docHTML: docHTML, print: print, download: download };

    /* ---------- вкладка «Банкет»: читаем заявку прямо с экрана (там уже учтён выбор по порциям в Люксе) ---------- */
    var box = $("kitchen");
    if (box) {
      box.insertAdjacentHTML("beforeend", '<div class="row kitbar"><button type="button" class="pri" id="kitPrint">Печать</button><button type="button" id="kitDownload">Скачать PDF</button><span class="small muted">Без цен: можно отдавать кухне</span></div>');
      function outputBanquet(downloadFile) {
        var ls = [].map.call($("kitBody").querySelectorAll("tr"), function (tr) {
          var td = tr.children; return { name: td[0].textContent, per: td[1].textContent, tot: td[2].textContent };
        });
        var G = num(B.guests), p = DB.packages.find(function (x) { return x.id === B.pkg; }), dt = parseD(B.date), parts = [];
        if ((B.client || "").trim()) parts.push("Клиент: " + B.client.trim());
        if (dt) parts.push("Дата мероприятия: " + fmtD(dt));
        parts.push("Гостей: " + (G > 0 ? fm(G) : "—"));
        if (p) parts.push("Меню: " + p.name);
        window.rzKit[downloadFile ? "download" : "print"]({ parts: parts, G: G, file: [(B.client || "").trim(), dt ? fmtD(dt) : ""].filter(Boolean).join(", ") }, ls);
      }
      $("kitPrint").addEventListener("click",function(){outputBanquet(false);});
      $("kitDownload").addEventListener("click",function(){outputBanquet(true);});
    }
  } catch (err) {
    if (window.console) console.error("kitchen.js", err);
  }
})();
