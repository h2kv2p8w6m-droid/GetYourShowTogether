// ---- Nav / view switching ----
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("is-active", v.dataset.view === name);
  });
  document.querySelectorAll(".nav-item, .bottom-item").forEach((btn) => {
    if (btn.dataset.view) btn.classList.toggle("is-active", btn.dataset.view === name);
  });
}

document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", () => {
    showView(el.dataset.view);
    closeMoreSheet();
  });
});

const moreBtn = document.getElementById("moreBtn");
const moreSheetBackdrop = document.getElementById("moreSheetBackdrop");
const closeMoreBtn = document.getElementById("closeMoreBtn");

function openMoreSheet() { moreSheetBackdrop.hidden = false; }
function closeMoreSheet() { moreSheetBackdrop.hidden = true; }

moreBtn.addEventListener("click", openMoreSheet);
closeMoreBtn.addEventListener("click", closeMoreSheet);
moreSheetBackdrop.addEventListener("click", (e) => {
  if (e.target === moreSheetBackdrop) closeMoreSheet();
});
moreSheetBackdrop.hidden = true;

// ---- Quick actions (stubbed for now) ----
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "view-events") { showView("shows"); return; }
    alert("This action is coming in the next build pass.");
  });
});

// ---- Formatting helpers ----
function money(n) {
  return "$" + Math.round(n || 0).toLocaleString();
}
function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ---- Load Home data ----
async function loadHome() {
  try {
    const res = await fetch("/api/home");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");

    document.getElementById("greeting").textContent = `Welcome back, ${data.artistName}!`;

    // Needs Attention
    const attentionCard = document.getElementById("attentionCard");
    if (data.needsAttention.length) {
      attentionCard.hidden = false;
      document.getElementById("attentionCount").textContent = data.needsAttention.length;
      document.getElementById("attentionTitle").textContent =
        `${data.needsAttention.length} item${data.needsAttention.length === 1 ? "" : "s"} need${data.needsAttention.length === 1 ? "s" : ""} you`;
      document.getElementById("attentionList").innerHTML = data.needsAttention
        .map((item) => {
          const dayLabel =
            item.daysUntil === null ? "" :
            item.daysUntil < 0 ? `${Math.abs(item.daysUntil)}d overdue` :
            item.daysUntil === 0 ? "Today" : `${item.daysUntil}d`;
          return `<li><span>${escapeHtml(item.action)} — ${escapeHtml(item.title)}</span><span class="days">${dayLabel}</span></li>`;
        })
        .join("");
    }

    // YTD
    document.getElementById("ytdSales").textContent = money(data.ytd.sales);
    document.getElementById("ytdExpenses").textContent = money(data.ytd.expenses);
    document.getElementById("ytdNet").textContent = money(data.ytd.netIncome);

    // Next Event
    const card = document.getElementById("nextEventCard");
    if (data.nextEvent) {
      const ev = data.nextEvent;
      const location = [ev.city, ev.state].filter(Boolean).join(", ");
      card.innerHTML = `
        <div class="next-event-name">${escapeHtml(ev.name || "Untitled show")}</div>
        <div class="next-event-meta">${fmtDate(ev.dateStart) || ""}${location ? " · " + escapeHtml(location) : ""}</div>
        ${ev.prepStatus ? `<div class="next-event-badge">${escapeHtml(ev.prepStatus)}</div>` : ""}
        <div class="setup-info">
          <div class="setup-label">Setup Info</div>
          ${ev.loadIn ? `<div class="setup-row"><span>Load-in</span><span>${fmtDateTime(ev.loadIn)}</span></div>` : ""}
          ${ev.boothLocation ? `<div class="setup-row"><span>Booth</span><span>${escapeHtml(ev.boothLocation)}</span></div>` : ""}
          ${ev.boothSize ? `<div class="setup-row"><span>Space</span><span>${escapeHtml(ev.boothSize)}${ev.setting ? " · " + escapeHtml(ev.setting) : ""}</span></div>` : ""}
        </div>`;
    }
  } catch (err) {
    console.error(err);
    document.getElementById("greeting").textContent = "Get Your Show Together";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

loadHome();
