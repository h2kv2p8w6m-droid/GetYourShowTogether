// ---- Nav / view switching ----
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("is-active", v.dataset.view === name);
  });
  document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((btn) => {
    if (btn.dataset.view) btn.classList.toggle("is-active", btn.dataset.view === name);
  });
}

document.querySelectorAll("[data-view]").forEach((el) => {
  el.addEventListener("click", () => {
    showView(el.dataset.view);
    closeMobileMenu();
  });
});

const menuBtn = document.getElementById("menuBtn");
const menuClose = document.getElementById("menuClose");
const mobileMenuBackdrop = document.getElementById("mobileMenuBackdrop");

function openMobileMenu() {
  mobileMenuBackdrop.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
  menuClose.focus();
}
function closeMobileMenu() {
  mobileMenuBackdrop.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

menuBtn.addEventListener("click", openMobileMenu);
menuClose.addEventListener("click", closeMobileMenu);
mobileMenuBackdrop.addEventListener("click", (e) => {
  if (e.target === mobileMenuBackdrop) closeMobileMenu();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !mobileMenuBackdrop.hidden) closeMobileMenu();
});

// ---- Quick actions (stubbed for now) ----
document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    alert("This action is coming in the next build pass.");
  });
});

// ---- Rotating art/maker quote ----
const QUOTES = [
  { text: "Creativity takes courage.", author: "Henri Matisse" },
  { text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson" },
  { text: "The chief enemy of creativity is good sense.", author: "Pablo Picasso" },
  { text: "Art enables us to find ourselves and lose ourselves at the same time.", author: "Thomas Merton" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
];
(function setQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById("quote").textContent = `"${q.text}" — ${q.author}`;
})();

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---- Formatting helpers ----
function money(n) {
  return "$" + Math.round(n || 0).toLocaleString();
}
function fmtDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// ---- Artist link (?u=...) ----
// Artists open a link like: https://yourapp.vercel.app/?u=kelley-h27k9v
// The "u" value is their private Link ID from the Artists table.
const artistLinkId = new URLSearchParams(window.location.search).get("u");
const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);

function showLinkError(title, message) {
  document.getElementById("main").innerHTML =
    `<div class="placeholder"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p></div>`;
}

// ---- Side peek ----
const peekBackdrop = document.getElementById("peekBackdrop");
function openPeek(item) {
  document.getElementById("peekTitle").textContent = item.title;
  document.getElementById("peekAction").textContent = item.action;

  const dueLabel = document.getElementById("peekDueLabel");
  const dueRow = document.getElementById("peekDue");
  if (item.deadline) {
    dueLabel.hidden = false;
    dueRow.hidden = false;
    document.getElementById("peekDueText").textContent = fmtDate(item.deadline);
  } else {
    dueLabel.hidden = true;
    dueRow.hidden = true;
  }

  const tag = document.getElementById("peekTag");
  const overdue = item.daysUntil !== null && item.daysUntil < 0;
  tag.textContent = overdue ? "Overdue" : "Due today";
  tag.className = "peek-tag" + (overdue ? " peek-tag--overdue" : "");

  const notesLabel = document.getElementById("peekNotesLabel");
  const notes = document.getElementById("peekNotes");
  if (item.notes) {
    notesLabel.hidden = false;
    notes.hidden = false;
    notes.textContent = item.notes;
  } else {
    notesLabel.hidden = true;
    notes.hidden = true;
  }

  const attLabel = document.getElementById("peekAttachmentsLabel");
  const attWrap = document.getElementById("peekAttachments");
  if (item.attachments && item.attachments.length) {
    attLabel.hidden = false;
    attWrap.innerHTML = item.attachments
      .map(
        (a) =>
          `<div class="peek-attachment"><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener"><i class="ti ti-file-text" aria-hidden="true"></i>${escapeHtml(a.name)}</a></div>`
      )
      .join("");
  } else {
    attLabel.hidden = true;
    attWrap.innerHTML = "";
  }

  peekBackdrop.hidden = false;
}
function closePeek() { peekBackdrop.hidden = true; }
document.getElementById("peekClose").addEventListener("click", closePeek);
peekBackdrop.addEventListener("click", (e) => {
  if (e.target === peekBackdrop) closePeek();
});

// ---- Load Home data ----
async function loadHome() {
  if (!artistLinkId && !isLocalPreview) {
    showLinkError(
      "Missing your show link",
      "This page needs your personal link (it looks like ?u=your-id at the end of the URL). Check the email you were sent."
    );
    return;
  }

  try {
    const res = await fetch(`/api/home?u=${encodeURIComponent(artistLinkId || "preview")}`);
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 404) {
        showLinkError("Link not recognized", "We couldn't find an artist for this link. Double check the URL or ask for a new one.");
        return;
      }
      throw new Error(data.error || "Failed to load");
    }

    document.getElementById("sidebarUser").textContent = data.artistName;
    document.getElementById("mobileMenuUser").textContent = data.artistName;
    document.getElementById("greeting").textContent = `${timeGreeting()}, ${data.artistName}.`;

    // Needs Attention — grouped into Overdue / Due today only
    const overdue = data.needsAttention.filter((i) => i.daysUntil !== null && i.daysUntil < 0);
    const dueToday = data.needsAttention.filter((i) => i.daysUntil === 0);

    const rowHtml = (item) => {
      const dueText = item.daysUntil < 0 ? fmtDate(item.deadline) : "Today";
      return `<button class="attention-row" data-id="${item.id}"><i class="ti ti-chevron-right chevron" aria-hidden="true"></i><span>${escapeHtml(item.action)} — ${escapeHtml(item.title)}</span><span class="due">${dueText}</span></button>`;
    };

    const attentionCard = document.getElementById("attentionCard");
    if (!overdue.length && !dueToday.length) {
      attentionCard.innerHTML = `<div class="attention-empty">All clear. Go make something fire.</div>`;
    } else {
      attentionCard.innerHTML =
        (overdue.length
          ? `<div class="attention-group-label attention-group-label--overdue">Overdue</div>${overdue.map(rowHtml).join("")}`
          : "") +
        (dueToday.length
          ? `<div class="attention-group-label attention-group-label--today">Due today</div>${dueToday.map(rowHtml).join("")}`
          : "");
    }
    attentionCard.querySelectorAll(".attention-row").forEach((row) => {
      row.addEventListener("click", () => {
        const item = data.needsAttention.find((i) => i.id === row.dataset.id);
        if (item) openPeek(item);
      });
    });

    // YTD
    document.getElementById("ytdSales").textContent = money(data.ytd.sales);
    document.getElementById("ytdExpenses").textContent = money(data.ytd.expenses);
    const netEl = document.getElementById("ytdNet");
    const netIconEl = document.getElementById("ytdNetIcon");
    netEl.textContent = money(data.ytd.netIncome);
    if (data.ytd.netIncome < 0) {
      netEl.className = "ytd-value ytd-value--net-negative";
      netIconEl.className = "ytd-tile-icon ytd-tile-icon--red";
    } else {
      netEl.className = "ytd-value ytd-value--net-positive";
      netIconEl.className = "ytd-tile-icon ytd-tile-icon--positive";
    }

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
    if (isLocalPreview) {
      document.getElementById("sidebarUser").textContent = "Kelley";
      document.getElementById("mobileMenuUser").textContent = "Kelley";
      document.getElementById("greeting").textContent = `${timeGreeting()}, Kelley.`;
      document.getElementById("attentionCard").innerHTML = `<div class="attention-empty">All clear. Go make something fire.</div>`;
      document.getElementById("ytdSales").textContent = "$340";
      document.getElementById("ytdExpenses").textContent = "$989";
      document.getElementById("ytdNet").textContent = "−$649";
      document.getElementById("ytdNet").className = "ytd-value ytd-value--net-negative";
      document.getElementById("ytdNetIcon").className = "ytd-tile-icon ytd-tile-icon--red";
    } else {
      document.getElementById("greeting").textContent = "Get Your Show Together";
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

loadHome();
