// ---------- Config ----------
// Change this if your FastAPI server runs somewhere else.
const API = "http://127.0.0.1:8000";

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const money = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n) || 0);
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail)) msg = body.detail.map((d) => d.msg).join(", ");
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

let toastTimer;
function toast(message, isError = false) {
  const t = $("toast");
  t.textContent = message;
  t.className = "toast" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 3000);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const svg = (paths) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON_EDIT = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
const ICON_TRASH = svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>');


// ---------- State ----------
let expenses = [];
let sort = { key: "date", dir: "desc" };
const today = new Date();

// ---------- Rendering ----------
function renderRows() {
  const sorted = [...expenses].sort((a, b) => {
    const x = a[sort.key] ?? "", y = b[sort.key] ?? "";
    const cmp = sort.key === "amount" ? Number(x) - Number(y) : String(x).localeCompare(String(y));
    return sort.dir === "asc" ? cmp : -cmp;
  });

  $("rows").innerHTML = sorted.map((e) => `
    <tr>
      <td>${escapeHtml(e.date)}</td>
      <td><span class="tag">${escapeHtml(e.category)}</span></td>
      <td class="muted">${escapeHtml(e.description ?? e.title ?? "")}</td>
      <td class="num">${money(e.amount)}</td>
      <td class="row-actions">
        <button class="icon-btn" title="Edit" aria-label="Edit expense" data-edit="${e.id}">${ICON_EDIT}</button>
        <button class="icon-btn del" title="Delete" aria-label="Delete expense" data-del="${e.id}">${ICON_TRASH}</button>
      </td>
    </tr>`).join("");

  $("empty").classList.toggle("hidden", sorted.length > 0);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  $("listTotal").textContent = money(total);
  $("listCount").textContent = `${expenses.length} expense${expenses.length === 1 ? "" : "s"}`;
}

function renderBars(el, entries, labelFn = (k) => k) {
  if (!entries.length) {
    el.innerHTML = '<div class="muted">No data yet.</div>';
    return;
  }
  const max = Math.max(...entries.map(([, v]) => Number(v)), 1);
  el.innerHTML = entries.map(([k, v]) => `
    <div class="bar-row">
      <span class="bar-label" title="${escapeHtml(labelFn(k))}">${escapeHtml(labelFn(k))}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(Number(v) / max) * 100}%"></div></div>
      <span class="bar-val">${money(v)}</span>
    </div>`).join("");
}

// ---------- Data loading ----------
async function loadExpenses() {
  const cat = $("fCategory").value.trim();
  const start = $("fStart").value;
  const end = $("fEnd").value;

  try {
    if (start && end) {
      expenses = await api(`/expenses/filterbydate?start_date=${start}&end_date=${end}`);
      if (cat) expenses = expenses.filter((e) => e.category.toLowerCase() === cat.toLowerCase());
    } else if (cat) {
      expenses = await api(`/expenses/filter?category=${encodeURIComponent(cat)}`);
    } else {
      expenses = await api("/expenses");
    }
    renderRows();
  } catch (err) {
    toast(err.message, true);
  }
}

async function loadCategories() {
  try {
    const data = await api("/expenses/summary_by_all_categories");
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    renderBars($("catChart"), entries);
    $("categoryList").innerHTML = entries.map(([c]) => `<option value="${escapeHtml(c)}">`).join("");
  } catch (err) {
    toast(err.message, true);
  }
}

async function loadMonthTotal() {
  const year = $("sumYear").value, month = $("sumMonth").value;
  try {
    const data = await api(`/expenses/summary/monthly?year=${year}&month=${month}`);
    $("monthTotal").textContent = money(data.total_expense);
  } catch (err) {
    toast(err.message, true);
  }
}

async function loadYear() {
  const year = $("yearInput").value;
  try {
    const data = await api(`/expenses/summary_by_year?year=${year}`);
    const entries = Object.entries(data.monthly_totals).sort((a, b) => a[0] - b[0]);
    renderBars($("yearChart"), entries, (m) => MONTHS[Number(m) - 1]);
  } catch (err) {
    toast(err.message, true);
  }
}

async function refreshAll() {
  await Promise.all([loadExpenses(), loadCategories(), loadMonthTotal(), loadYear()]);
}

// ---------- Events ----------
$("addForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = {
    amount: parseFloat(fd.get("amount")),
    category: fd.get("category").trim(),
    date: fd.get("date"),
  };
  const desc = fd.get("description").trim();
  if (desc) body.description = desc;

  try {
    await api("/expenses", { method: "POST", body: JSON.stringify(body) });
    ev.target.reset();
    ev.target.date.value = today.toISOString().slice(0, 10);
    toast("Expense added");
    refreshAll();
  } catch (err) {
    toast(err.message, true);
  }
});

$("filterForm").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const s = $("fStart").value, e = $("fEnd").value;
  if ((s && !e) || (!s && e)) return toast("Pick both a start and end date", true);
  loadExpenses();
});

$("resetBtn").addEventListener("click", () => {
  $("filterForm").reset();
  loadExpenses();
});

document.querySelector("thead").addEventListener("click", (ev) => {
  const key = ev.target.dataset.sort;
  if (!key) return;
  sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" };
  renderRows();
});

$("rows").addEventListener("click", async (ev) => {
  // const editId = ev.target.dataset.edit;
  // const delId = ev.target.dataset.del;
  const editId = ev.target.closest("[data-edit]")?.dataset.edit;
  const delId = ev.target.closest("[data-del]")?.dataset.del;

  if (editId) {
    const e = expenses.find((x) => x.id == editId);
    const f = $("editForm");
    f.id.value = e.id;
    f.amount.value = e.amount;
    f.category.value = e.category;
    $("editDialog").showModal();
  }

  if (delId) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api(`/expenses/${delId}`, { method: "DELETE" });
      toast("Expense deleted");
      refreshAll();
    } catch (err) {
      toast(err.message, true);
    }
  }
});

$("editCancel").addEventListener("click", () => $("editDialog").close());

$("editForm").addEventListener("submit", async (ev) => {
  const f = ev.target;
  try {
    await api(`/expenses/${f.id.value}`, {
      method: "PUT",
      body: JSON.stringify({ amount: parseFloat(f.amount.value), category: f.category.value.trim() }),
    });
    toast("Expense updated");
    refreshAll();
  } catch (err) {
    toast(err.message, true);
  }
});

$("catBtn").addEventListener("click", async () => {
  const c = $("catName").value.trim();
  if (!c) return;
  try {
    const data = await api(`/expenses/summary_by_category?category=${encodeURIComponent(c)}`);
    $("catTotal").textContent = money(data.total_expense);
  } catch (err) {
    toast(err.message, true);
  }
});

$("sumYear").addEventListener("change", loadMonthTotal);
$("sumMonth").addEventListener("change", loadMonthTotal);
$("yearInput").addEventListener("change", loadYear);

// ---------- Init ----------
(async function init() {
  $("sumMonth").innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join("");
  $("sumMonth").value = today.getMonth() + 1;
  $("sumYear").value = today.getFullYear();
  $("yearInput").value = today.getFullYear();
  $("addForm").date.value = today.toISOString().slice(0, 10);
  $("catTotal").textContent = "–";

  try {
    await fetch(API + "/docs", { method: "HEAD" });
    $("apiStatus").textContent = "API connected";
    $("apiStatus").classList.add("ok");
  } catch (_) {
    $("apiStatus").textContent = "API unreachable";
    $("apiStatus").classList.add("err");
  }
  refreshAll();
})();
