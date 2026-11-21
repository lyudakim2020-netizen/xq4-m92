"use strict";

const waiterRoom = { width: 600, minHeight: 360, tileWidth: 96, tileHeight: 48, grid: 24, gap: 8 };
let selectedWaiterTable = -1;

function waiterMemo() {
  const memo = B.waiterMemo;
  if (!memo || !Array.isArray(memo.tables)) {
    B.waiterMemo = { layout: "", serving: "", tables: [] };
  }
  return B.waiterMemo;
}

function waiterGuestCount(value) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

function waiterTotalText() {
  const seated = waiterMemo().tables.reduce((sum, table) => sum + (table.shape === "landmark" ? 0 : waiterGuestCount(table.guests)), 0);
  const guests = waiterGuestCount(B.guests);
  return guests ? `За столами ${fm(seated)} из ${fm(guests)} гостей` : `За столами ${fm(seated)} гостей`;
}

function updateWaiterTotal() {
  $("waiterTotal").textContent = waiterTotalText();
}

function waiterName(table, index) {
  return (table.name || "").trim() || (table.shape === "landmark" ? "Ориентир" : "Стол " + (index + 1));
}

function hasWaiterPosition(table) {
  return Number.isFinite(table.x) && Number.isFinite(table.y);
}

function waiterTableSize(table) {
  const { grid, tileWidth, tileHeight } = waiterRoom;
  const length = table.length ? table.length * grid : tileWidth;
  const width = table.width ? table.width * grid : tileHeight;
  return table.turned ? { w: width, h: length } : { w: length, h: width };
}

function placeWaiterTable(table, tables) {
  const { width, tileWidth, tileHeight, gap } = waiterRoom;
  const occupied = tables.filter(item => item !== table && hasWaiterPosition(item));
  for (let y = gap; ; y += tileHeight + gap * 2) {
    for (let x = gap; x + tileWidth <= width - gap; x += tileWidth + gap * 2) {
      if (occupied.some(item => {
        const { w, h } = waiterTableSize(item);
        return x < item.x + w + gap && x + tileWidth + gap > item.x &&
          y < item.y + h + gap && y + tileHeight + gap > item.y;
      })) continue;
      Object.assign(table, { x, y });
      return;
    }
  }
}

function waiterPlanHeight(tables) {
  const { minHeight, gap, grid } = waiterRoom;
  const bottom = tables.reduce((max, table) => Math.max(max, table.y + waiterTableSize(table).h + gap), Math.max(minHeight, waiterMemo().planHeight || 0));
  return Math.ceil(bottom / grid) * grid;
}

function positionWaiterMarker(marker, table, height) {
  const { w, h } = waiterTableSize(table);
  marker.style.left = (table.x / waiterRoom.width * 100) + "%";
  marker.style.top = (table.y / height * 100) + "%";
  marker.style.width = (w / waiterRoom.width * 100) + "%";
  marker.style.height = (h / height * 100) + "%";
}

function updateWaiterMarker(marker, table, index) {
  const name = waiterName(table, index);
  const count = table.shape === "landmark" || table.guests === "" ? "" : fm(waiterGuestCount(table.guests)) + " чел.";
  marker.dataset.shape = table.shape || "rect";
  marker.querySelector("span").textContent = name;
  marker.querySelector("small").textContent = count;
  marker.setAttribute("aria-label", [name, count].filter(Boolean).join(", "));
  marker.title = [marker.getAttribute("aria-label"), table.note].filter(Boolean).join("\n");
}

function renderWaiterPlan() {
  const tables = waiterMemo().tables;
  tables.forEach(table => {
    if (!hasWaiterPosition(table)) placeWaiterTable(table, tables);
  });
  const plan = $("waiterPlan");
  const height = waiterPlanHeight(tables);
  waiterMemo().planHeight = height;
  plan.style.aspectRatio = waiterRoom.width + " / " + height;
  plan.style.backgroundSize = (waiterRoom.grid / waiterRoom.width * 100) + "% " + (waiterRoom.grid / height * 100) + "%";
  plan.replaceChildren();
  if (!tables.length) {
    const empty = document.createElement("span");
    empty.id = "waiterPlanEmpty";
    empty.className = "small muted";
    empty.textContent = "Добавьте первый стол на схему";
    plan.appendChild(empty);
  }
  tables.forEach((table, index) => {
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "waiter-marker";
    marker.dataset.index = index;
    marker.setAttribute("aria-pressed", String(index === selectedWaiterTable));
    marker.innerHTML = "<span></span><small></small>";
    positionWaiterMarker(marker, table, height);
    updateWaiterMarker(marker, table, index);
    plan.appendChild(marker);
  });
  updateWaiterTotal();
}

function selectWaiterTable(index) {
  selectedWaiterTable = index;
  const table = waiterMemo().tables[index];
  $("waiterEditor").hidden = !table;
  $("waiterPlan").querySelectorAll("[data-index]").forEach(marker => {
    marker.setAttribute("aria-pressed", String(Number(marker.dataset.index) === index));
  });
  if (!table) return;
  const landmark = table.shape === "landmark";
  $("waiterShapeField").hidden = landmark;
  $("waiterGuestsField").hidden = landmark;
  if ($("waiterSizeFields")) {
    $("waiterSizeFields").hidden = landmark;
    $("waiterLength").value = table.length || waiterRoom.tileWidth / waiterRoom.grid;
    $("waiterWidth").value = table.width || waiterRoom.tileHeight / waiterRoom.grid;
  }
  $("waiterShape").value = table.shape === "round" ? "round" : "rect";
  $("waiterName").placeholder = waiterName({ shape: table.shape }, index);
  $("waiterName").value = table.name || "";
  $("waiterGuests").value = table.guests ?? "";
  $("waiterNote").value = table.note || "";
}

function renderWaiterMemo() {
  if (!$("waiterPlan")) return;
  const memo = waiterMemo();
  $("waiterLayout").value = memo.layout || "";
  $("waiterServing").value = memo.serving || "";
  selectedWaiterTable = -1;
  renderWaiterPlan();
  selectWaiterTable(-1);
}

function moveWaiterTable(table, marker, x, y, height) {
  const { w, h } = waiterTableSize(table);
  table.x = Math.round(Math.max(0, Math.min(waiterRoom.width - w, x)));
  table.y = Math.round(Math.max(0, Math.min(height - h - waiterRoom.gap, y)));
  positionWaiterMarker(marker, table, height);
}

function resizeWaiterTable(change) {
  const tables = waiterMemo().tables;
  const table = tables[selectedWaiterTable];
  if (!table || table.shape === "landmark") return;
  const before = waiterTableSize(table);
  const height = waiterPlanHeight(tables);
  Object.assign(table, change);
  const after = waiterTableSize(table);
  const marker = $("waiterPlan").querySelector('[data-index="' + selectedWaiterTable + '"]');
  moveWaiterTable(table, marker, table.x + (before.w - after.w) / 2, table.y + (before.h - after.h) / 2, height);
  saveNow();
}

function initWaiterDrag(plan) {
  let drag = null;
  plan.addEventListener("pointerdown", event => {
    const marker = event.target.closest("[data-index]");
    if (!marker || event.button !== 0 || !event.isPrimary) return;
    const tables = waiterMemo().tables;
    const table = tables[marker.dataset.index];
    drag = { marker, table, height: waiterPlanHeight(tables), x: table.x, y: table.y,
      pointer: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    marker.setPointerCapture(event.pointerId);
  });
  plan.addEventListener("pointermove", event => {
    if (drag?.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    moveWaiterTable(drag.table, drag.marker, drag.x + dx * waiterRoom.width / plan.clientWidth,
      drag.y + dy * drag.height / plan.clientHeight, drag.height);
  });
  plan.addEventListener("lostpointercapture", event => {
    if (drag?.pointer !== event.pointerId) return;
    if (drag.moved) saveNow();
    drag = null;
  });
  plan.addEventListener("click", event => {
    const marker = event.target.closest("[data-index]");
    if (marker) selectWaiterTable(Number(marker.dataset.index));
  });
  plan.addEventListener("keydown", event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    const marker = event.target.closest("[data-index]");
    if (!direction || !marker) return;
    event.preventDefault();
    const tables = waiterMemo().tables;
    const table = tables[marker.dataset.index];
    moveWaiterTable(table, marker, table.x + direction[0] * 8, table.y + direction[1] * 8, waiterPlanHeight(tables));
    save();
  });
}

function waiterPlanImage(tables) {
  const { width, grid } = waiterRoom;
  const height = waiterPlanHeight(tables);
  const scale = Math.min(3, 6000 / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale);
  canvas.height = Math.ceil(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f7f8f6";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#e0e5df";
  ctx.beginPath();
  for (let x = grid; x < width; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
  for (let y = grid; y < height; y += grid) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
  ctx.stroke();
  ctx.strokeStyle = "#74857e";
  ctx.strokeRect(.5, .5, width - 1, height - 1);
  ctx.textAlign = "center";
  tables.forEach((table, index) => {
    const { x, y, shape } = table;
    const { w, h } = waiterTableSize(table);
    const center = x + w / 2;
    const middle = y + h / 2;
    ctx.beginPath();
    if (shape === "round") ctx.ellipse(center, middle, w / 2, h / 2, 0, 0, 2 * Math.PI);
    else ctx.roundRect(x, y, w, h, 5);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#416456";
    ctx.setLineDash(shape === "landmark" ? [4, 3] : []);
    ctx.stroke();
    ctx.fillStyle = "#17221e";
    ctx.font = "600 13px Arial, sans-serif";
    const name = waiterName(table, index);
    let label = name;
    if (ctx.measureText(label).width > w - 12) {
      const characters = Array.from(name).slice(0, 24);
      while (characters.length > 1 && ctx.measureText(characters.join("") + "…").width > w - 12) characters.pop();
      label = characters.join("") + "…";
    }
    const hasCount = shape !== "landmark" && table.guests !== "";
    ctx.fillText(label, center, middle + (hasCount ? -4 : 4));
    if (hasCount) {
      ctx.font = "11px Arial, sans-serif";
      ctx.fillText(fm(waiterGuestCount(table.guests)) + " чел.", center, middle + 11, w - 6);
    }
  });
  return canvas.toDataURL("image/png");
}

function waiterDocument() {
  if (document.body.matches(".guest, .locked")) return null;
  const guestsInput = $("waiterGuests");
  if (!$("waiterGuestsField").hidden && !$("waiterEditor").hidden && !guestsInput.reportValidity()) return null;
  const memo = waiterMemo();
  const date = parseD(B.date);
  const guests = waiterGuestCount(B.guests);
  const meta = [B.client, date && fmtD(date), guests && "Гостей: " + fm(guests)].filter(Boolean).join(" · ");
  const rows = memo.tables.map((table, index) => [waiterName(table, index),
    table.shape === "landmark" || table.guests === "" ? "—" : fm(waiterGuestCount(table.guests)), table.note || ""]);
  return { meta, rows, layout: memo.layout.trim(), serving: memo.serving.trim(),
    plan: rows.length ? waiterPlanImage(memo.tables) : "", total: waiterTotalText(),
    file: ["Памятка для официантов", B.client, date && fmtD(date)].filter(Boolean).join(" — ").replace(/[\\/:*?"<>|]/g, " ") };
}

async function printWaiterMemo() {
  const doc = waiterDocument();
  if (!doc) return;
  const rows = doc.rows.map(row => "<tr>" + row.map(cell => "<td>" + esc(cell) + "</td>").join("") + "</tr>").join("");
  const area = $("waiterPrintArea");
  area.innerHTML = `<div class="row between"><h1>Памятка для официантов</h1><b>RizzW</b></div>
    <p>${esc(doc.meta)}</p>
    ${doc.plan ? `<h2>Схема зала</h2><img src="${doc.plan}" alt="Схема зала">
      <h2>Посадка и указания по столам</h2><table>
      <thead><tr><th>Стол или зона</th><th>Гостей</th><th>Что учесть</th></tr></thead>
      <tbody>${rows}</tbody></table><p>${esc(doc.total)}</p>` : ""}
    ${doc.layout ? `<h2>Заметки по расстановке</h2><p>${esc(doc.layout)}</p>` : ""}
    ${doc.serving ? `<h2>Заметки по сервировке</h2><p>${esc(doc.serving)}</p>` : ""}`;
  try {
    await area.querySelector("img")?.decode();
  } catch {
    area.replaceChildren();
    toast("Не удалось подготовить схему к печати.");
    return;
  }
  if (document.body.matches(".guest, .locked")) {
    area.replaceChildren();
    return;
  }
  document.body.classList.add("print-waiters");
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-waiters");
    area.replaceChildren();
  }, { once: true });
  window.print();
}

async function downloadWaiterMemo() {
  const button = $("downloadWaiterMemo");
  try {
    const doc = waiterDocument();
    if (!doc) return;
    button.disabled = true;
    await window.rzExport.pdfReady();
    if (document.body.matches(".guest, .locked")) return;
    const content = [
      { columns: [{ text: "Памятка для официантов", style: "title" },
        { text: "RizzW", width: 72, alignment: "right", color: "#244d40", fontSize: 21, bold: true }], margin: [0, 0, 0, 8] },
      { text: doc.meta, margin: [0, 0, 0, 10] }
    ];
    if (doc.plan) {
      const headings = ["Стол или зона", "Гостей", "Что учесть"].map(text => ({ text, bold: true, fillColor: "#e7ebe9" }));
      content.push({ text: "Схема зала", style: "heading" }, { image: doc.plan, fit: [510, 340] },
        { text: "Посадка и указания по столам", style: "heading" },
        { table: { headerRows: 1, widths: [122, 46, "*"], body: [headings, ...doc.rows] }, layout: "lightHorizontalLines" },
        { text: doc.total, margin: [0, 6, 0, 0] });
    }
    if (doc.layout) content.push({ text: "Заметки по расстановке", style: "heading" }, { text: doc.layout });
    if (doc.serving) content.push({ text: "Заметки по сервировке", style: "heading" }, { text: doc.serving });
    window.pdfMake.createPdf({
      pageSize: "A4", pageMargins: [40, 36, 40, 36],
      defaultStyle: { font: "Roboto", fontSize: 10, color: "#17221e" },
      styles: { title: { fontSize: 19, bold: true }, heading: { fontSize: 12, bold: true, margin: [0, 12, 0, 5] } },
      footer: (page, count) => ({ text: "RizzW · " + page + " / " + count, alignment: "right", fontSize: 8, margin: [40, 8, 40, 0] }),
      info: { title: "Памятка для официантов", author: "RizzW" }, content
    }).download(doc.file + ".pdf");
  } catch (error) {
    toast("Не удалось скачать памятку. Попробуйте ещё раз.");
  } finally {
    button.disabled = false;
  }
}

function initWaiterMemo() {
  const plan = $("waiterPlan");
  if (!plan) return;
  initWaiterDrag(plan);
  const add = shape => {
    const tables = waiterMemo().tables;
    tables.push({ name: "", guests: "", note: "", shape });
    renderWaiterPlan();
    selectWaiterTable(tables.length - 1);
    $("waiterName").focus();
    save();
  };
  $("addWaiterTable").onclick = () => add("rect");
  $("addWaiterLandmark").onclick = () => add("landmark");
  if ($("waiterSizeFields")) {
    [["waiterLength", "length", 12], ["waiterWidth", "width", 8]].forEach(([id, field, max]) => {
      const select = $(id);
      for (let size = 2; size <= max; size++) select.add(new Option(size, size));
      select.onchange = () => resizeWaiterTable({ [field]: Number(select.value) });
    });
    $("rotateWaiterTable").onclick = () => {
      const table = waiterMemo().tables[selectedWaiterTable];
      if (table) resizeWaiterTable({ turned: !table.turned });
    };
  }
  const fields = { waiterName: "name", waiterGuests: "guests", waiterShape: "shape", waiterNote: "note" };
  Object.entries(fields).forEach(([id, field]) => {
    $(id).addEventListener("input", event => {
      const table = waiterMemo().tables[selectedWaiterTable];
      if (!table || !event.target.validity.valid) return;
      table[field] = event.target.value;
      updateWaiterMarker(plan.querySelector('[data-index="' + selectedWaiterTable + '"]'), table, selectedWaiterTable);
      updateWaiterTotal();
      save();
    });
  });
  $("removeWaiterTable").onclick = () => {
    if (selectedWaiterTable < 0) return;
    waiterMemo().tables.splice(selectedWaiterTable, 1);
    selectedWaiterTable = -1;
    renderWaiterPlan();
    selectWaiterTable(-1);
    $("addWaiterTable").focus();
    save();
  };
  $("waiterLayout").addEventListener("input", event => { waiterMemo().layout = event.target.value; save(); });
  $("waiterServing").addEventListener("input", event => { waiterMemo().serving = event.target.value; save(); });
  $("bGuests").addEventListener("input", updateWaiterTotal);
  $("saveWaiterBanquet").onclick = () => {
    if (!$("waiterEditor").hidden && !$("waiterGuests").reportValidity()) return;
    $("saveBanq").click();
    saveNow();
  };
  $("printWaiterMemo").onclick = printWaiterMemo;
  $("downloadWaiterMemo").onclick = downloadWaiterMemo;
}
