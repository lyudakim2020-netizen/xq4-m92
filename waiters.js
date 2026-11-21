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
  marker.dataset.noteEdge = table.x < 40 ? "left" : table.x + w > waiterRoom.width - 40 ? "right" : "";
  if (Number(marker.dataset.index) === selectedWaiterTable) positionWaiterGrips(table, height);
}

function positionWaiterGrips(table, height) {
  const { w, h } = waiterTableSize(table);
  $("waiterPlan").querySelectorAll("[data-resize]").forEach(grip => {
    const horizontal = grip.dataset.resize === "x";
    grip.style.left = ((table.x + w * (horizontal ? 1 : .5)) / waiterRoom.width * 100) + "%";
    grip.style.top = ((table.y + h * (horizontal ? .5 : 1)) / height * 100) + "%";
  });
}

function updateWaiterMarker(marker, table, index) {
  const name = waiterName(table, index);
  const count = table.shape === "landmark" || table.guests === "" ? "" : fm(waiterGuestCount(table.guests)) + " чел.";
  marker.dataset.shape = table.shape || "rect";
  marker.querySelector("span").textContent = name;
  const guests = marker.querySelector("small");
  guests.textContent = count;
  guests.hidden = !count;
  const note = marker.querySelector(".waiter-table-note");
  note.textContent = waiterPreviewNote(table);
  note.hidden = !note.textContent;
  marker.setAttribute("aria-label", [name, count].filter(Boolean).join(", "));
  marker.title = [marker.getAttribute("aria-label"), table.note].filter(Boolean).join("\n");
}

function waiterPreviewNote(table) {
  return (table.note || "").trim().replace(/\s+/g, " ");
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
    marker.setAttribute("aria-haspopup", "dialog");
    marker.setAttribute("aria-pressed", String(index === selectedWaiterTable));
    marker.innerHTML = '<span></span><small></small><small class="waiter-table-note"></small>';
    positionWaiterMarker(marker, table, height);
    updateWaiterMarker(marker, table, index);
    plan.appendChild(marker);
  });
  [["x", "Изменить размер стола по горизонтали"], ["y", "Изменить размер стола по вертикали"]].forEach(([axis, label]) => {
    const grip = document.createElement("button");
    grip.type = "button";
    grip.className = "waiter-grip";
    grip.dataset.resize = axis;
    grip.setAttribute("aria-label", label);
    grip.title = label;
    grip.hidden = true;
    plan.appendChild(grip);
  });
  updateWaiterTotal();
}

function waiterMarker(index = selectedWaiterTable) {
  return $("waiterPlan").querySelector('[data-index="' + index + '"]');
}

function positionWaiterEditor() {
  const editor = $("waiterEditor");
  if (editor.hidden) return;
  const marker = waiterMarker();
  const anchor = marker?.getBoundingClientRect();
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft || 0;
  const top = viewport?.offsetTop || 0;
  const right = left + (viewport?.width || window.innerWidth);
  const bottom = top + (viewport?.height || window.innerHeight);
  const gap = 10;
  if (!anchor || anchor.bottom < top || anchor.top > bottom) {
    editor.hidden = true;
    return;
  }
  editor.style.maxHeight = Math.max(0, bottom - top - gap * 2) + "px";
  const w = editor.offsetWidth, h = editor.offsetHeight;
  let x = anchor.right + gap, y = anchor.top;
  if (x + w > right - gap) {
    x = anchor.left - w - gap;
    if (x < left + gap) {
      x = anchor.left + (anchor.width - w) / 2;
      y = anchor.bottom + gap;
      if (y + h > bottom - gap && anchor.top - h - gap >= top + gap) y = anchor.top - h - gap;
    }
  }
  editor.style.left = Math.max(left + gap, Math.min(right - w - gap, x)) + "px";
  editor.style.top = Math.max(top + gap, Math.min(bottom - h - gap, y)) + "px";
}

function selectWaiterTable(index, edit = false) {
  selectedWaiterTable = index;
  const tables = waiterMemo().tables;
  const table = tables[index];
  $("waiterEditor").hidden = !table || !edit;
  $("waiterPlan").querySelectorAll("[data-index]").forEach(marker => {
    marker.setAttribute("aria-pressed", String(Number(marker.dataset.index) === index));
  });
  $("waiterPlan").querySelectorAll("[data-resize]").forEach(grip => { grip.hidden = !table || table.shape === "landmark"; });
  if (!table) return;
  positionWaiterGrips(table, waiterPlanHeight(tables));
  if (!edit) return;
  const landmark = table.shape === "landmark";
  $("waiterShapeField").hidden = landmark;
  $("waiterGuestsField").hidden = landmark;
  $("rotateWaiterTable").hidden = landmark;
  $("waiterEditorTitle").textContent = waiterName(table, index);
  $("waiterShape").value = table.shape === "round" ? "round" : "rect";
  $("waiterName").placeholder = waiterName({ shape: table.shape }, index);
  $("waiterName").value = table.name || "";
  $("waiterGuests").value = table.guests ?? "";
  $("waiterNote").value = table.note || "";
  positionWaiterEditor();
  const first = landmark ? $("waiterName") : $("waiterGuests");
  if (!$("waiterEditor").hidden) {
    first.focus({ preventScroll: true });
    first.select();
  }
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

function rotateWaiterTable() {
  const tables = waiterMemo().tables;
  const table = tables[selectedWaiterTable];
  if (!table || table.shape === "landmark") return;
  const before = waiterTableSize(table);
  const height = waiterPlanHeight(tables);
  table.turned = !table.turned;
  const after = waiterTableSize(table);
  const marker = waiterMarker();
  moveWaiterTable(table, marker, table.x + (before.w - after.w) / 2, table.y + (before.h - after.h) / 2, height);
  saveNow();
  positionWaiterEditor();
}

function stretchWaiterTable(table, marker, w, h, height) {
  const { width, grid, gap } = waiterRoom;
  const across = Math.round(Math.max(grid * 2, Math.min(width - table.x, height - gap, w)));
  const down = Math.round(Math.max(grid * 2, Math.min(height - gap - table.y, width, h)));
  table.length = (table.turned ? down : across) / grid;
  table.width = (table.turned ? across : down) / grid;
  positionWaiterMarker(marker, table, height);
}

function initWaiterDrag(plan) {
  let drag = null;
  let suppressClick = false;
  plan.addEventListener("pointerdown", event => {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick = false;
    const grip = event.target.closest("[data-resize]");
    const marker = grip ? waiterMarker() : event.target.closest("[data-index]");
    if (!marker) return;
    const tables = waiterMemo().tables;
    const table = tables[marker.dataset.index];
    drag = { marker, table, axis: grip?.dataset.resize, size: waiterTableSize(table), height: waiterPlanHeight(tables), x: table.x, y: table.y,
      pointer: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    (grip || marker).setPointerCapture(event.pointerId);
  });
  plan.addEventListener("pointermove", event => {
    if (drag?.pointer !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      selectWaiterTable(Number(drag.marker.dataset.index));
    }
    const x = dx * waiterRoom.width / plan.clientWidth;
    const y = dy * drag.height / plan.clientHeight;
    if (drag.axis) {
      stretchWaiterTable(drag.table, drag.marker, drag.size.w + (drag.axis === "x" ? x : 0),
        drag.size.h + (drag.axis === "y" ? y : 0), drag.height);
    } else {
      moveWaiterTable(drag.table, drag.marker, drag.x + x, drag.y + y, drag.height);
    }
  });
  plan.addEventListener("lostpointercapture", event => {
    if (drag?.pointer !== event.pointerId) return;
    if (drag.moved) {
      suppressClick = true;
      saveNow();
    }
    drag = null;
  });
  plan.addEventListener("pointerup", event => {
    if (event.pointerType !== "touch" || drag?.pointer !== event.pointerId || drag.moved || drag.axis) return;
    suppressClick = true;
    selectWaiterTable(Number(drag.marker.dataset.index), true);
  });
  plan.addEventListener("click", event => {
    if (suppressClick && event.detail) return;
    const marker = event.target.closest("[data-index]");
    if (marker) selectWaiterTable(Number(marker.dataset.index), true);
    else if (!event.target.closest("[data-resize]")) selectWaiterTable(-1);
  });
  plan.addEventListener("keydown", event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    const grip = event.target.closest("[data-resize]");
    const marker = grip ? waiterMarker() : event.target.closest("[data-index]");
    if (!direction || !marker) return;
    event.preventDefault();
    const tables = waiterMemo().tables;
    const table = tables[marker.dataset.index];
    const height = waiterPlanHeight(tables);
    if (grip) {
      const { w, h } = waiterTableSize(table);
      stretchWaiterTable(table, marker, w + (grip.dataset.resize === "x" ? direction[0] * 8 : 0),
        h + (grip.dataset.resize === "y" ? direction[1] * 8 : 0), height);
    } else {
      moveWaiterTable(table, marker, table.x + direction[0] * 8, table.y + direction[1] * 8, height);
    }
    positionWaiterEditor();
    save();
  });
}

function waiterNoteLines(ctx, note, width) {
  if (!note) return [];
  const words = note.split(" ");
  let first = words.shift();
  while (words.length && ctx.measureText(first + " " + words[0]).width <= width) first += " " + words.shift();
  return [first, words.join(" ")].filter(Boolean);
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
    const count = shape !== "landmark" && table.guests !== "" ? fm(waiterGuestCount(table.guests)) + " чел." : "";
    const labelWidth = shape === "round" ? w * .8 : w - 10;
    const noteWidth = Math.max(50, labelWidth);
    const noteFont = "600 11px Arial, sans-serif";
    ctx.font = noteFont;
    const notes = waiterNoteLines(ctx, waiterPreviewNote(table), noteWidth);
    const noteCenter = Math.max(noteWidth / 2, Math.min(width - noteWidth / 2, center));
    const lines = [
      [waiterName(table, index), "600 13px Arial, sans-serif", labelWidth, center],
      [count, "11px Arial, sans-serif", labelWidth, center],
      ...notes.map(note => [note, noteFont, noteWidth, noteCenter])
    ].filter(([label]) => label);
    lines.forEach(([label, font, available, lineCenter], line) => {
      ctx.font = font;
      if (ctx.measureText(label).width > available) {
        const characters = Array.from(label).slice(0, Math.ceil(available / 3));
        while (characters.length > 1 && ctx.measureText(characters.join("") + "…").width > available) characters.pop();
        label = characters.join("") + "…";
      }
      ctx.fillText(label, lineCenter, middle + 4 + (line - (lines.length - 1) / 2) * 10, available);
    });
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
  const editor = $("waiterEditor");
  const done = $("closeWaiterEditor");
  if (!plan || !done) return;
  initWaiterDrag(plan);
  const close = () => {
    if (!editor.hidden && !$("waiterGuestsField").hidden && !$("waiterGuests").reportValidity()) return;
    editor.hidden = true;
    waiterMarker()?.focus({ preventScroll: true });
  };
  done.onclick = close;
  $("waiterMemo").addEventListener("toggle", event => {
    if (!event.target.open) selectWaiterTable(-1);
  });
  document.addEventListener("click", event => {
    if (!event.target.closest("#waiterEditor, #waiterPlan, #addWaiterTable, #addWaiterLandmark")) editor.hidden = true;
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !editor.hidden) close();
  });
  window.addEventListener("scroll", positionWaiterEditor, { passive: true });
  window.addEventListener("resize", positionWaiterEditor);
  window.visualViewport?.addEventListener("resize", positionWaiterEditor);
  window.visualViewport?.addEventListener("scroll", positionWaiterEditor);
  const add = shape => {
    const tables = waiterMemo().tables;
    tables.push({ name: "", guests: "", note: "", shape });
    renderWaiterPlan();
    waiterMarker(tables.length - 1).scrollIntoView({ block: "nearest" });
    selectWaiterTable(tables.length - 1, true);
    save();
  };
  $("addWaiterTable").onclick = () => add("rect");
  $("addWaiterLandmark").onclick = () => add("landmark");
  $("rotateWaiterTable").onclick = rotateWaiterTable;
  const fields = { waiterName: "name", waiterGuests: "guests", waiterShape: "shape", waiterNote: "note" };
  Object.entries(fields).forEach(([id, field]) => {
    $(id).addEventListener("input", event => {
      const table = waiterMemo().tables[selectedWaiterTable];
      if (!table || !event.target.validity.valid) return;
      table[field] = event.target.value;
      updateWaiterMarker(waiterMarker(), table, selectedWaiterTable);
      if (field === "name") $("waiterEditorTitle").textContent = waiterName(table, selectedWaiterTable);
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
    if (!editor.hidden && !$("waiterGuestsField").hidden && !$("waiterGuests").reportValidity()) return;
    $("saveBanq").click();
    saveNow();
  };
  $("printWaiterMemo").onclick = printWaiterMemo;
  $("downloadWaiterMemo").onclick = downloadWaiterMemo;
}
