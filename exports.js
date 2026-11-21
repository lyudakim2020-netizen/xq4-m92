/* Единый гостевой бланк: печать, PDF и Excel. Данные берутся из текущего расчёта. */
(function () {
  "use strict";
  const INK="243D36", GREY="E7EBE9", LINE="B8C2BE";
  const money=v=>fin(v)?rub(v,2):"—";
  const safe=s=>String(s||"").replace(/[\\/:*?"<>|]/g," ").trim();
  const count=(v,u)=>fin(num(v))?fm(num(v),num(v)%1?2:0)+" "+u:"—";
  const titleCase=s=>String(s||"").replace(/^./,c=>c.toUpperCase());
  function model(kind) {
    const fur=kind==="fur", s=fur?FS:B, c=fur?furCalc():calc();
    c.dt=c.dt||parseD(s.date);
    const rows=fur?s.rows:B.rows.filter(r=>!r.removed);
    const sections=[];
    rows.forEach(r=>{
      const d=dishById(r.dish), qty=fur?r.qty:d&&d.unit==="шт"?r.pcs:r.g;
      const sec=fur?((DB.packages.find(p=>p.id===s.packageId)||{}).lines||[]).find(l=>l.dish===r.dish)?.sec||"Меню":r.sec||"Меню";
      let section=sections.find(g=>g.name===sec);if(!section){section={name:sec,rows:[]};sections.push(section);}
      section.rows.push({name:r.title||d?.name||"Позиция",qty:count(qty,d?.unit==="шт"?"шт.":d?.unit==="л"?"мл":"г")});
    });
    sections.sort((a,b)=>{const ai=SECS.indexOf(a.name),bi=SECS.indexOf(b.name);return (ai<0?99:ai)-(bi<0?99:bi);});
    const extras=[];
    function extra(group,row){let g=extras.find(x=>x.name===group);if(!g){g={name:group,rows:[]};extras.push(g);}g.rows.push(row);}
    if(!fur){DB.services.forEach(x=>{const q=num(s.svc[x.id]);if(q>0)extra(x.grp,{name:x.name,qty:count(q,x.unit==="час"?"ч":x.unit==="шт"?"шт.":"усл."),price:x.price,amount:q*x.price});});
      s.custom.forEach(x=>{const q=num(x.qty),p=num(x.price);if(x.name&&fin(q)&&fin(p))extra("Дополнительные услуги",{name:x.name,qty:count(q,"усл."),price:p,amount:q*p});});}
    if(c.beer.qty>0)extra("Напитки отдельно",{name:BEER.name+", "+BEER.portionMl+" мл · "+fm(BEER.price)+" ₽/порц.",qty:count(c.beer.qty,"порц."),price:BEER.price,amount:c.beer.revenue});
    const per=fur?c.price:c.perGuest, menu=c.menu, disc=fur?0:c.menu*c.disc;
    const summary=[{label:"Меню на одного гостя",value:per},{label:"Стоимость меню",value:menu}];
    if(disc>0)summary.push({label:"Скидка на меню",value:-disc});
    if(s.svcOn)summary.push({label:"Обслуживание "+fm(c.svcPct*100)+"%",value:c.svc});
    const extrasTotal=extras.reduce((a,g)=>a+g.rows.reduce((b,r)=>b+r.amount,0),0);
    if(extrasTotal)summary.push({label:"Напитки отдельно, аренда и услуги",value:extrasTotal});
    summary.push({label:"ИТОГО",value:c.total,total:true},{label:"Предоплата "+fm(num(DB.settings.prepay))+"%",value:c.pre},{label:"Остаток к оплате",value:c.total-c.pre});
    return {kind,title:fur?"Фуршетное меню":"Банкетное меню",client:s.client||"",date:s.date?fmtD(parseD(s.date)):"не указана",guests:c.G,sections,extras,summary,per,c,state:s,
      filename:safe((fur?"Фуршет":"Банкет")+(s.client?" — "+s.client:"")+(s.date?" — "+s.date:""))||"Смета"};
  }
  function headerHtml(m,internal) {return `<div class="estimate-head"><div><h1>${esc(internal?"Расчёт для нас":m.title)}</h1>${m.client?`<p>${esc(m.client)}</p>`:""}</div><div class="estimate-logo">RizzW<small>БАНКЕТНЫЙ ЗАЛ</small></div></div><div class="estimate-meta"><span>Дата мероприятия: <b>${esc(m.date)}</b></span><span>Гостей: <b>${fm(m.guests)}</b></span></div>`;}
  function internalRows(m) {
    const c=m.c,fur=m.kind==="fur",G=c.G;
    const food=fur?(c.C-suppliesCost(FS))*G:c.foodOnlyCost;
    const supplies=G>0?suppliesCost(m.state)*G:NaN;
    const total=fur?c.directCost:c.foodCost,revenue=fur?c.directRevenue:c.directRevenue;
    const rows=[{section:"Сводный расчёт"},
      {name:"Еда и напитки пакета",per:G>0?food/G:NaN,total:food},
      {name:"Посуда и аренда мармитов",per:suppliesCost(m.state),total:supplies},
      {name:"В том числе аренда мармитов",per:G>0?marmiteCost(m.state)/G:NaN,total:marmiteCost(m.state)},
      {name:"Пиво — себестоимость",per:G>0?c.beer.cost/G:NaN,total:c.beer.cost},
      {name:"ВСЕГО ПРЯМЫЕ ЗАТРАТЫ",per:G>0?total/G:NaN,total,totalRow:true},
      {name:"Выручка меню и пива",per:G>0?revenue/G:NaN,total:revenue},
      {name:"Остаток после прямых затрат",per:G>0?(revenue-total)/G:NaN,total:revenue-total,totalRow:true},
      {section:"Посуда — детализация"}];
    suppliesLines(m.state).forEach(r=>rows.push({name:r.name+" · "+count(r.qty,"шт./гость")+" × "+money(r.cost),per:r.qty*r.cost,total:G>0?r.qty*r.cost*G:NaN}));
    if(marmiteCost(m.state)>0)rows.push({name:"Аренда мармитов — на мероприятие",per:G>0?marmiteCost(m.state)/G:NaN,total:marmiteCost(m.state)});
    rows.push({section:"Еда и напитки пакета — детализация"});
    (fur?FS.rows:B.rows.filter(r=>!r.removed)).forEach(r=>{const per=fur?fRowCost(r):lineCost(r.dish,r.g,r.pcs);rows.push({name:r.title,per,total:G>0?per*G:NaN});});
    return rows;
  }
  function documentHtml(m,internal) {
    const menu=m.sections.map(g=>`<tbody><tr class="section"><th colspan="2">${esc(g.name)}</th></tr>${g.rows.map(r=>`<tr><td>${esc(r.name)}</td><td class="qty">${esc(r.qty)}</td></tr>`).join("")}</tbody>`).join("");
    const extras=m.extras.map(g=>`<tbody><tr class="section"><th colspan="3">${esc(g.name)}</th></tr>${g.rows.map(r=>`<tr><td>${esc(r.name)}</td><td class="qty">${esc(r.qty)}</td><td class="amount">${money(r.amount)}</td></tr>`).join("")}</tbody>`).join("");
    const totals=`<table class="estimate-totals"><tbody>${m.summary.map(r=>`<tr class="${r.total?"grand":""}"><td>${esc(r.label)}</td><td class="amount">${money(r.value)}</td></tr>`).join("")}</tbody></table>`;
    let html=headerHtml(m,internal);
    if(internal)html+=`<p class="estimate-private">ВНУТРЕННИЙ РАСЧЁТ · НЕ ДЛЯ ГОСТЯ</p><table><thead><tr><th>Позиция</th><th>На гостя, ₽</th><th>Всего, ₽</th></tr></thead><tbody>${internalRows(m).map(r=>r.section?`<tr class="section"><th colspan="3">${esc(r.section)}</th></tr>`:`<tr class="${r.totalRow?"grand":""}"><td>${esc(r.name)}</td><td class="amount">${money(r.per)}</td><td class="amount">${money(r.total)}</td></tr>`).join("")}</tbody></table>`;
    else {html+=`<div class="estimate-price">Меню на гостя: <b>${money(m.per)}</b></div><h2>1. Меню</h2><table><colgroup><col style="width:77%"><col style="width:23%"></colgroup><thead><tr><th>Наименование блюда</th><th>Выход на человека<br>(г / мл / шт.)</th></tr></thead>${menu}</table>`;
      if(m.extras.length)html+=`<div class="estimate-break"></div><h2>2. Дополнительные услуги и напитки</h2><table><thead><tr><th>Наименование</th><th>Количество</th><th>Стоимость, ₽</th></tr></thead>${extras}</table>`;
      html+=`<h2>Итоговая стоимость</h2>${totals}`;
      if(m.c.dt)html+=`<p class="estimate-foot">Остаток к оплате до ${fmtD(minusDays(m.c.dt,num(DB.settings.payDays)||0))}.</p>`;
    }
    return `<article class="estimate">${html}</article>`;
  }
  document.head.insertAdjacentHTML("beforeend",`<style>
  .estimate{font:11pt Arial,sans-serif;color:#17221e;line-height:1.3}.estimate h1{font:700 17pt Georgia,serif;margin:0 0 6mm}.estimate h2{font-size:12pt;margin:7mm 0 3mm}.estimate-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;border-bottom:2px solid #344f44;padding-bottom:3mm;margin-bottom:5mm}.estimate-head p{margin:0}.estimate-logo{font:bold italic 28pt Georgia,serif;color:#244d40;white-space:nowrap}.estimate-logo small{display:block;font:7pt Arial;letter-spacing:1px;text-align:center}.estimate-meta{display:flex;justify-content:space-between;gap:10mm;margin-bottom:3mm}.estimate-price{margin-bottom:5mm}.estimate table{width:100%;border-collapse:collapse;font-size:10pt;table-layout:fixed}.estimate th,.estimate td{border:1px solid #abb6af;padding:2mm 2.5mm;vertical-align:top;overflow-wrap:anywhere}.estimate thead th{background:#e7ebe9;font-weight:700;text-align:center}.estimate tr.section th{background:#edf0ee;text-align:left;font-weight:700}.estimate .qty{text-align:center;width:23%;white-space:nowrap}.estimate .amount{text-align:right;white-space:nowrap}.estimate .grand td{background:#e5ece7;font-weight:700;border-top:2px solid #647d6d}.estimate-totals td:first-child{width:72%}.estimate-private{font-weight:bold;color:#6b342a}.estimate-foot{font-size:9pt}.estimate tr{break-inside:avoid}.estimate tr.section{break-after:avoid}
  .estimate td.qty{display:table-cell!important}.estimate th{text-transform:none;letter-spacing:normal}
  @media print{@page{size:A4;margin:14mm}body>:not(#printArea):not(#waiterPrintArea){display:none!important}body:not(.print-waiters) #printArea{display:block!important;padding:0!important}.estimate{font-size:10pt}.estimate table{font-size:9.5pt;line-height:1.15}.estimate th,.estimate td{padding:1.1mm 2.3mm!important}.estimate h1{margin-bottom:3mm}.estimate h2{margin:5mm 0 3mm}.estimate thead{display:table-header-group}.estimate-break{break-before:page}.estimate *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>`);
  function printDoc(kind,internal) {const m=model(kind);$("printArea").innerHTML=documentHtml(m,internal);const prev=document.title;document.title=m.filename+(internal?" — для нас":"");window.addEventListener("afterprint",()=>{document.title=prev;},{once:true});window.print();}
  const loaders={};
  function script(src) {if(loaders[src])return loaders[src];return loaders[src]=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=()=>{delete loaders[src];s.remove();reject(Error("Не удалось загрузить компонент выгрузки"));};document.head.appendChild(s);});}
  async function pdfReady(){if(!window.pdfMake)await script("vendor/pdfmake.min.js");if(!window.pdfMake.vfs)await script("vendor/vfs_fonts.js");}
  function pdfTable(body,widths){return {table:{headerRows:1,keepWithHeaderRows:1,dontBreakRows:true,widths,body},layout:{hLineWidth:()=>0.5,vLineWidth:()=>0.5,hLineColor:()=>"#B8C2BE",vLineColor:()=>"#B8C2BE",paddingLeft:()=>7,paddingRight:()=>7,paddingTop:()=>4,paddingBottom:()=>4}};}
  const pHead=t=>({text:t,bold:true,fillColor:"#E7EBE9",alignment:"center"});
  const band=(t,n)=>[{text:t,bold:true,fillColor:"#E7EBE9",colSpan:n},...Array.from({length:n-1},()=>({}))];
  function pdfDefinition(m,internal) {
    const content=[{columns:[{text:internal?"Расчёт для нас":m.title,fontSize:17,bold:true,width:"*"},{stack:[{text:"RizzW",fontSize:25,bold:true,italics:true,color:"#244D40",alignment:"right"},{text:"БАНКЕТНЫЙ ЗАЛ",fontSize:7,alignment:"right",color:"#244D40"}],width:125}],margin:[0,0,0,14]}];
    if(m.client)content.push({text:m.client,bold:true,margin:[0,0,0,7]});
    content.push({columns:[{text:"Дата мероприятия: "+m.date},{text:"Гостей: "+fm(m.guests),alignment:"right"}],margin:[0,0,0,8]});
    if(internal){content.push({text:"ВНУТРЕННИЙ РАСЧЁТ · НЕ ДЛЯ ГОСТЯ",bold:true,color:"#6B342A",margin:[0,0,0,12]});const body=[[pHead("Позиция"),pHead("На гостя, ₽"),pHead("Всего, ₽")]];
      internalRows(m).forEach(r=>body.push(r.section?band(r.section,3):[{text:r.name,bold:!!r.totalRow},{text:money(r.per),alignment:"right",bold:!!r.totalRow},{text:money(r.total),alignment:"right",bold:!!r.totalRow}]));content.push(pdfTable(body,["*",85,95]));
    }else{
      content.push({text:["Меню на гостя: ",{text:money(m.per),bold:true}],margin:[0,0,0,12]},{text:"1. Меню",bold:true,fontSize:12,margin:[0,0,0,8]});
      const body=[[pHead("Наименование блюда"),pHead("Выход на человека\n(г / мл / шт.)")]];
      m.sections.forEach(g=>{body.push(band(g.name,2));g.rows.forEach(r=>body.push([r.name,{text:r.qty,alignment:"center"}]));});
      content.push(pdfTable(body,["*",110]));
      if(m.extras.length){content.push({text:"2. Дополнительные услуги и напитки",bold:true,fontSize:12,pageBreak:"before",margin:[0,0,0,12]});const extra=[[pHead("Наименование"),pHead("Количество"),pHead("Стоимость, ₽")]];
        m.extras.forEach(g=>{extra.push(band(g.name,3));g.rows.forEach(r=>extra.push([r.name,{text:r.qty,alignment:"center"},{text:money(r.amount),alignment:"right"}]));});content.push(pdfTable(extra,["*",80,100]));}
      content.push({text:"Итоговая стоимость",bold:true,fontSize:12,margin:[0,16,0,8]});
      const totals=m.summary.map(r=>[{text:r.label,bold:!!r.total,fillColor:r.total?"#E7EBE9":null},{text:money(r.value),alignment:"right",bold:!!r.total,fillColor:r.total?"#E7EBE9":null}]);
      content.push({unbreakable:true,stack:[pdfTable(totals,["*",130])]});
      if(m.c.dt)content.push({text:"Остаток к оплате до "+fmtD(minusDays(m.c.dt,num(DB.settings.payDays)||0))+".",fontSize:9,margin:[0,10,0,0]});
    }
    return {pageSize:"A4",pageMargins:[40,36,40,36],defaultStyle:{font:"Roboto",fontSize:10,color:"#17221E"},content,footer:(page,pages)=>({text:"RizzW  ·  "+page+" / "+pages,alignment:"right",fontSize:8,color:"#68756E",margin:[40,8,40,0]}),info:{title:internal?"Внутренний расчёт RizzW":m.title,author:"RizzW"}};
  }
  async function savePdf(kind,internal){try{const m=model(kind);toast("Готовлю PDF…");await pdfReady();pdfMake.createPdf(pdfDefinition(m,internal)).download(m.filename+(internal?" — для нас":"")+".pdf");}catch(e){toast(e.message||"Не удалось сохранить PDF");}}
  function baseCell(value,style){return {v:value==null?"":value,t:typeof value==="number"?"n":"s",s:Object.assign({font:{name:"Arial",sz:10,color:{rgb:INK}},alignment:{vertical:"center",wrapText:true},border:{bottom:{style:"thin",color:{rgb:LINE}}}},style||{})};}
  function guestSheet(kind) {
    const m=model(kind),rows=[],merges=[],heights=[];let extrasBreak=null;
    function row(values,height){rows.push(values);heights.push({hpt:height||18});return rows.length-1;}
    function merge(r,a,b){merges.push({s:{r,c:a},e:{r,c:b}});}
    function wide(text,style,height){const r=row([baseCell(text,style),"","","","",""],height);merge(r,0,5);return r;}
    function pair(label,value,bold){const r=row([baseCell(label,{font:{name:"Arial",sz:10,bold:!!bold}}),"","","",baseCell(value,{font:{name:"Arial",sz:10,bold:!!bold},alignment:{horizontal:"right",vertical:"center"},numFmt:typeof value==="number"?(label==="Количество гостей"?'#,##0':'#,##0.00 "₽"'):undefined}),""]);merge(r,0,3);merge(r,4,5);return r;}
    const first=row([baseCell(m.title,{font:{name:"Arial",sz:16,bold:true,color:{rgb:INK}}}),"","","",baseCell("RizzW",{font:{name:"Georgia",sz:24,bold:true,italic:true,color:{rgb:"244D40"}},alignment:{horizontal:"right",vertical:"center"}}),""],34);merge(first,0,3);merge(first,4,5);
    if(m.client)wide(m.client,{font:{name:"Arial",sz:11,bold:true}},25);
    pair("Дата мероприятия",m.date);pair("Количество гостей",m.guests);pair("Меню на одного гостя",m.per);
    wide("1. Меню",{font:{name:"Arial",sz:12,bold:true}},24);
    let r=row([baseCell("Наименование блюда"),"","","",baseCell("Выход на человека\n(г / мл / шт.)"),""],30);merge(r,0,3);merge(r,4,5);
    const headers=[r],bands=[];
    m.sections.forEach(g=>{bands.push(wide(g.name,{fill:{fgColor:{rgb:GREY}},font:{name:"Arial",sz:10,bold:true}},18));g.rows.forEach(x=>{const rr=row([baseCell(x.name),"","","",baseCell(x.qty,{alignment:{horizontal:"center",vertical:"center"}}),""],x.name.length>62?30:18);merge(rr,0,3);merge(rr,4,5);});});
    if(m.extras.length){extrasBreak=wide("2. Дополнительные услуги и напитки",{font:{name:"Arial",sz:12,bold:true}},30);r=row([baseCell("Наименование"),"","","",baseCell("Количество"),baseCell("Стоимость, ₽")],30);merge(r,0,3);headers.push(r);
      m.extras.forEach(g=>{bands.push(wide(g.name,{fill:{fgColor:{rgb:GREY}},font:{name:"Arial",sz:10,bold:true}},22));g.rows.forEach(x=>{const rr=row([baseCell(x.name),"","","",baseCell(x.qty,{alignment:{horizontal:"center",vertical:"center"}}),baseCell(x.amount,{alignment:{horizontal:"right",vertical:"center"},numFmt:'#,##0.00 "₽"'})],x.name.length>62?34:24);merge(rr,0,3);});});}
    wide("Итоговая стоимость",{font:{name:"Arial",sz:12,bold:true}},30);
    m.summary.forEach(x=>{const rr=pair(x.label,x.value,x.total);if(x.total)bands.push(rr);});
    if(m.c.dt)wide("Остаток к оплате до "+fmtD(minusDays(m.c.dt,num(DB.settings.payDays)||0))+".",{},24);
    const ws={};rows.forEach((a,ri)=>a.forEach((cell,ci)=>{ws[XLSX.utils.encode_cell({r:ri,c:ci})]=typeof cell==="object"?cell:baseCell(cell);}));
    ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:5}});ws["!merges"]=merges;ws["!rows"]=heights;ws["!cols"]=[14,14,14,14,14,18].map(wch=>({wch}));
    headers.forEach(rr=>{for(let c=0;c<6;c++){const cell=ws[XLSX.utils.encode_cell({r:rr,c})];cell.s.fill={fgColor:{rgb:GREY}};cell.s.font={name:"Arial",sz:10,bold:true};cell.s.alignment={horizontal:"center",vertical:"center",wrapText:true};}});
    bands.forEach(rr=>{for(let c=0;c<6;c++)ws[XLSX.utils.encode_cell({r:rr,c})].s.fill={fgColor:{rgb:GREY}};});
    ws["!margins"]={left:.4,right:.4,top:.5,bottom:.5,header:.2,footer:.2};
    if(extrasBreak!==null)ws["!rizzwBreaks"]=[extrasBreak];
    return ws;
  }
  window.rzGuestSheet=guestSheet;
  window.rzPrepareXlsx=async function(){
    if(!window.fflate)await script("vendor/fflate.min.js");
    if(XLSX.rizzwPrepared)return;
    XLSX.rizzwPrepared=true;
    XLSX.writeFile=function(wb,filename){
      if(wb.SheetNames[1]==="Себестоимость"){wb.Workbook=wb.Workbook||{};wb.Workbook.Names=(wb.Workbook.Names||[]).filter(n=>n.Name!=="_xlnm.Print_Titles");wb.Workbook.Names.push({Name:"_xlnm.Print_Titles",Ref:"'Себестоимость'!$1:$1",Sheet:1});}
      const bytes=new Uint8Array(XLSX.write(wb,{bookType:"xlsx",type:"array",cellStyles:true}));
      const files=fflate.unzipSync(bytes);
      Object.keys(files).filter(p=>/^xl\/worksheets\/sheet\d+\.xml$/.test(p)).forEach(p=>{
        let xml=fflate.strFromU8(files[p]);
        xml=xml.replace(/<sheetView\b([^>]*?)(\/?)>/,(_,attrs,slash)=>'<sheetView'+attrs.replace(/ showGridLines="[^"]*"/g,"")+' showGridLines="0"'+slash+'>');
        if(!xml.includes("<sheetPr"))xml=xml.replace(/(<worksheet\b[^>]*>)/,'$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
        const internal=/sheet2\.xml$/.test(p);
        xml=xml.replace(/<pageSetup\b[^>]*\/>/g,"");
        const printOptions='<printOptions horizontalCentered="1"/>',pageSetup='<pageSetup paperSize="9" orientation="'+(internal?'landscape':'portrait')+'" fitToWidth="1" fitToHeight="0"/>';
        if(/<pageMargins\b/.test(xml))xml=xml.replace(/<pageMargins\b[^>]*\/>/,m=>printOptions+m+pageSetup);
        else xml=xml.replace(/(<ignoredErrors\b|<\/worksheet>)/,printOptions+pageSetup+'$1');
        const sheet=wb.Sheets[wb.SheetNames[Number(p.match(/sheet(\d+)\.xml$/)[1])-1]],breaks=sheet["!rizzwBreaks"]||[];
        if(breaks.length){const tag='<rowBreaks count="'+breaks.length+'" manualBreakCount="'+breaks.length+'">'+breaks.map(id=>'<brk id="'+id+'" max="16383" man="1"/>').join("")+'</rowBreaks>';xml=xml.replace(/(<ignoredErrors\b|<\/worksheet>)/,tag+'$1');}
        files[p]=fflate.strToU8(xml);
      });
      const blob=new Blob([fflate.zipSync(files,{level:6})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    };
  };
  window.rzStyleSheet=function(ws,rows){if(!XLSX.utils.decode_range||!ws["!ref"])return ws;const range=XLSX.utils.decode_range(ws["!ref"]);ws["!rows"]=[];
    for(let r=range.s.r;r<=range.e.r;r++){let lines=1;for(let c=range.s.c;c<=range.e.c;c++){const addr=XLSX.utils.encode_cell({r,c}),cell=ws[addr];if(!cell)continue;const width=ws["!cols"]?.[c]?.wch||22;lines=Math.max(lines,...String(cell.v??"").split("\n").map(t=>Math.ceil(t.length/Math.max(8,width*.95))));cell.s=baseCell(cell.v).s;if(cell.t==="n"){cell.s.alignment.horizontal="right";cell.z=Number.isInteger(cell.v)?"#,##0":"#,##0.00";}if(r===0){cell.s.font={name:"Arial",sz:12,bold:true,color:{rgb:INK}};}else if((rows[r]||[]).some(x=>typeof x==="string"&&/^(Позиция|Блюдо|Раздел|Пакет|На гостя|Себестоимость за ед.)$/.test(x))){cell.s.fill={fgColor:{rgb:GREY}};cell.s.font.bold=true;}if((rows[r]||[]).some(x=>typeof x==="string"&&/^(ИТОГО|Всего прямые затраты|Остаток от меню)/.test(x))){cell.s.fill={fgColor:{rgb:GREY}};cell.s.font.bold=true;}}
      ws["!rows"][r]={hpt:Math.max(r===0?34:22,lines*13+6)};}ws["!margins"]={left:.4,right:.4,top:.5,bottom:.5,header:.2,footer:.2};return ws;};
  function excel(kind){loadXLSX(()=>{const wb=XLSX.utils.book_new(),m=model(kind);XLSX.utils.book_append_sheet(wb,guestSheet(kind),"Смета");XLSX.writeFile(wb,m.filename+".xlsx");toast("Оформленная смета сохранена в Excel");});}
  [["banq","printSmeta","xlsSmeta","xlsInt"],["fur","fPrint","fXls","fXlsInt"]].forEach(([kind,printId,xlsId,intId])=>{
    $(printId).textContent="Печать";$(printId).onclick=()=>printDoc(kind,false);$(xlsId).onclick=()=>excel(kind);
    $(printId).insertAdjacentHTML("afterend",`<button type="button" id="${kind}DownloadPdf">Скачать PDF</button>`);$(kind+"DownloadPdf").onclick=()=>savePdf(kind,false);
    $(intId).insertAdjacentHTML("afterend",`<button type="button" id="${kind}InternalPdf">PDF для нас</button>`);$(kind+"InternalPdf").onclick=()=>savePdf(kind,true);
  });
  window.rzExport={model,html:documentHtml,pdfDefinition,pdfReady,savePdf,internalRows,guestSheet};
})();
