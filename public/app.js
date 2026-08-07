// Artists open a link like:  https://yourapp.vercel.app/?u=kelley-a8f3x2
// The "u" value is their private Link ID from the Artists table — no password needed.

const params = new URLSearchParams(window.location.search);
const artistLinkId = params.get("u");

const els = {
  greeting: document.getElementById("greeting"),
  stats: document.getElementById("stats"),
  statUpcoming: document.getElementById("statUpcoming"),
  statDeadlines: document.getElementById("statDeadlines"),
  statUnpaid: document.getElementById("statUnpaid"),
  list: document.getElementById("eventList"),
  empty: document.getElementById("emptyState"),
  error: document.getElementById("errorState"),
  errorMessage: document.getElementById("errorMessage"),
  addBtn: document.getElementById("addBtn"),
  sheetBackdrop: document.getElementById("sheetBackdrop"),
  cancelBtn: document.getElementById("cancelBtn"),
  form: document.getElementById("eventForm"),
  toast: document.getElementById("toast"),
};

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  setTimeout(() => (els.toast.hidden = true), 2400);
}

function fmtDate(d) {
  if (!d) return null;
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function nearestDeadline(ev) {
  const candidates = [];
  if (ev.applicationDeadlineDays !== null)
    candidates.push({ label: "apply by", days: ev.applicationDeadlineDays });
  if (ev.boothFeeDueDays !== null && !ev.feePaid)
    candidates.push({ label: "fee due", days: ev.boothFeeDueDays });
  candidates.sort((a, b) => a.days - b.days);
  return candidates.find((c) => c.days >= 0) || candidates[0] || null;
}

function renderStamp(ev) {
  const nd = nearestDeadline(ev);
  if (!nd) {
    return `<div class="stamp stamp--quiet"><span class="stamp-num">—</span></div>`;
  }
  const urgent = nd.days <= 7;
  return `
    <div class="stamp ${urgent ? "stamp--ember" : ""}">
      <span class="stamp-num">${nd.days}</span>
      <span class="stamp-unit">${nd.days === 1 ? "day" : "days"}</span>
    </div>`;
}

function renderCard(ev) {
  const nd = nearestDeadline(ev);
  const dateRange = ev.dateStart
    ? `${fmtDate(ev.dateStart)}${ev.dateEnd && ev.dateEnd !== ev.dateStart ? " – " + fmtDate(ev.dateEnd) : ""}`
    : "Date TBD";

  const tags = [];
  if (ev.status) tags.push(`<span class="tag">${ev.status}</span>`);
  if (nd) tags.push(`<span class="tag ${nd.days <= 7 ? "tag--warn" : ""}">${nd.label}: ${fmtDate(addDays(ev, nd))}</span>`);

  return `
    <article class="event-card" data-id="${ev.id}">
      ${renderStamp(ev)}
      <div class="event-body">
        <h3 class="event-name">${escapeHtml(ev.name)}</h3>
        <p class="event-meta">${dateRange}${ev.location ? " · " + escapeHtml(ev.location) : ""}</p>
        <div class="event-tags">${tags.join("")}</div>
      </div>
    </article>`;
}

function addDays(ev, nd) {
  return nd.label === "apply by" ? ev.applicationDeadline : ev.boothFeeDueDate;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadEvents() {
  if (!artistLinkId) {
    els.greeting.textContent = "Missing your show link";
    els.error.hidden = false;
    els.errorMessage.textContent =
      "This page needs your personal link (it looks like ?u=your-id at the end of the URL). Check the email you were sent.";
    return;
  }

  try {
    const res = await fetch(`/api/events?artist=${encodeURIComponent(artistLinkId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");

    const firstName = (data.artist.name || "").split(" ")[0] || "there";
    els.greeting.textContent = `Hey ${firstName}, here's what's ahead`;

    renderList(data.events);
  } catch (err) {
    console.error(err);
    els.greeting.textContent = "Get Your Show Together";
    els.error.hidden = false;
    els.errorMessage.textContent = "Couldn't load your shows. Try refreshing.";
  }
}

function renderList(events) {
  if (!events.length) {
    els.empty.hidden = false;
    els.stats.hidden = true;
    return;
  }

  const soonCount = events.filter((e) => {
    const nd = nearestDeadline(e);
    return nd && nd.days >= 0 && nd.days <= 7;
  }).length;
  const unpaidCount = events.filter((e) => e.fee && !e.feePaid).length;

  els.statUpcoming.textContent = events.length;
  els.statDeadlines.textContent = soonCount;
  els.statUnpaid.textContent = unpaidCount;
  els.stats.hidden = false;

  els.list.innerHTML = events.map(renderCard).join("");
}

function openSheet() {
  els.sheetBackdrop.hidden = false;
}
function closeSheet() {
  els.sheetBackdrop.hidden = true;
  els.form.reset();
}

els.addBtn.addEventListener("click", openSheet);
els.cancelBtn.addEventListener("click", closeSheet);
els.sheetBackdrop.addEventListener("click", (e) => {
  if (e.target === els.sheetBackdrop) closeSheet();
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(els.form);
  const event = Object.fromEntries(fd.entries());

  const submitBtn = els.form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistLinkId, event }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");

    closeSheet();
    showToast("Show saved");
    loadEvents();
  } catch (err) {
    console.error(err);
    showToast("Couldn't save — try again");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save show";
  }
});

loadEvents();
