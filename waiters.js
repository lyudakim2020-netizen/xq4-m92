"use strict";

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

function updateWaiterTotal() {
  const seated = waiterMemo().tables.reduce((sum, table) => sum + waiterGuestCount(table.guests), 0);
  const guests = waiterGuestCount(B.guests);
  $("waiterTotal").textContent = guests ? `За столами ${fm(seated)} из ${fm(guests)} гостей` : `За столами ${fm(seated)} гостей`;
}

function renderWaiterTables() {
  $("waiterTables").innerHTML = waiterMemo().tables.map((table, index) => `
    <div class="memo-table" data-table-index="${index}">
      <label class="f">Стол или зона<input data-table-field="name" value="${esc(table.name)}" placeholder="Стол ${index + 1}"></label>
      <label class="f">Гостей<input data-table-field="guests" type="number" min="0" step="1" inputmode="numeric" value="${esc(table.guests)}"></label>
      <button type="button" class="icon" data-remove-table aria-label="Удалить стол ${index + 1}">✕</button>
      <label class="f memo-table-note">Что учесть за столом<textarea data-table-field="note" rows="2">${esc(table.note)}</textarea></label>
    </div>`).join("");
  updateWaiterTotal();
}

function renderWaiterMemo() {
  const memo = waiterMemo();
  $("waiterLayout").value = memo.layout || "";
  $("waiterServing").value = memo.serving || "";
  renderWaiterTables();
}

function printWaiterMemo() {
  if (document.body.matches(".guest, .locked")) return;
  const invalid = $("waiterTables").querySelector("input:invalid");
  if (invalid) {
    invalid.reportValidity();
    return;
  }
  const memo = waiterMemo();
  const date = parseD(B.date);
  const guests = waiterGuestCount(B.guests);
  const rows = memo.tables.map((table, index) => `<tr>
    <td>${esc(table.name.trim() || `Стол ${index + 1}`)}</td>
    <td class="r">${table.guests === "" ? "—" : fm(waiterGuestCount(table.guests))}</td>
    <td>${esc(table.note)}</td>
  </tr>`).join("");
  const area = $("waiterPrintArea");
  area.innerHTML = `
    <div class="row between"><h1>Памятка для официантов</h1><b>RizzW</b></div>
    <p>${[B.client, date && fmtD(date), guests && `Гостей: ${fm(guests)}`].filter(Boolean).map(esc).join(" · ")}</p>
    ${memo.layout.trim() ? `<h2>Расстановка столов</h2><p>${esc(memo.layout.trim())}</p>` : ""}
    ${rows ? `<h2>Посадка гостей</h2><table>
      <thead><tr><th>Стол или зона</th><th class="r">Гостей</th><th>Что учесть за столом</th></tr></thead>
      <tbody>${rows}</tbody></table><p>${esc($("waiterTotal").textContent)}</p>` : ""}
    ${memo.serving.trim() ? `<h2>Заметки по сервировке</h2><p>${esc(memo.serving.trim())}</p>` : ""}`;
  document.body.classList.add("print-waiters");
  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-waiters");
    area.replaceChildren();
  }, { once: true });
  window.print();
}

function initWaiterMemo() {
  $("waiterLayout").addEventListener("input", e => {
    waiterMemo().layout = e.target.value;
    save();
  });
  $("waiterServing").addEventListener("input", e => {
    waiterMemo().serving = e.target.value;
    save();
  });
  $("bGuests").addEventListener("input", updateWaiterTotal);
  $("addWaiterTable").addEventListener("click", () => {
    waiterMemo().tables.push({ name: "", guests: "", note: "" });
    renderWaiterTables();
    $("waiterTables").lastElementChild.querySelector("input").focus();
    save();
  });
  $("waiterTables").addEventListener("input", e => {
    const field = e.target.dataset.tableField;
    if (!field) return;
    if (field === "guests" && !e.target.validity.valid) return;
    const row = e.target.closest("[data-table-index]");
    waiterMemo().tables[row.dataset.tableIndex][field] = e.target.value;
    updateWaiterTotal();
    save();
  });
  $("waiterTables").addEventListener("click", e => {
    const button = e.target.closest("[data-remove-table]");
    if (!button) return;
    waiterMemo().tables.splice(Number(button.closest("[data-table-index]").dataset.tableIndex), 1);
    renderWaiterTables();
    $("addWaiterTable").focus();
    save();
  });
  $("printWaiterMemo").addEventListener("click", printWaiterMemo);
}
