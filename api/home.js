// /api/home.js
// Powers the Home dashboard. Reads from the real production base:
// Applications & Bookings (deadlines, status) + Events (venue/location)
// + Event Results & Logistics (setup info, expenses).
//
// NOTE: This base doesn't yet have per-artist scoping (no Artists table /
// link field). Until that's added, this returns ALL records — fine while
// it's just Kelley, but needs the Artist link field before other beta
// testers use it. See README.

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const EVENTS_TABLE = "Events";
const APPLICATIONS_TABLE = "Applications & Bookings";
const RESULTS_TABLE = "Event Results & Logistics";

async function airtableRequest(path) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAll(table) {
  let records = [];
  let offset;
  do {
    const qs = offset ? `?offset=${offset}` : "";
    const data = await airtableRequest(`${encodeURIComponent(table)}${qs}`);
    records = records.concat(data.records);
    offset = data.offset;
  } while (offset);
  return records;
}

module.exports = async (req, res) => {
  try {
    if (!AIRTABLE_BASE || !AIRTABLE_TOKEN) {
      res.status(500).json({ error: "Server is missing Airtable configuration." });
      return;
    }

    const [applications, events, results] = await Promise.all([
      fetchAll(APPLICATIONS_TABLE),
      fetchAll(EVENTS_TABLE),
      fetchAll(RESULTS_TABLE),
    ]);

    const eventsById = Object.fromEntries(events.map((e) => [e.id, e.fields]));

    const resultsByAppId = {};
    results.forEach((r) => {
      (r.fields["Related Application / Booking"] || []).forEach((link) => {
        resultsByAppId[link.id] = r.fields;
      });
    });

    const now = new Date();
    const currentYear = now.getFullYear();

    // ---- Needs Attention ----
    // "Home Priority" is a pre-computed text label from Airtable itself
    // (e.g. "Prepare for event", "Enter post-event results") — use it directly.
    const needsAttention = applications
      .map((a) => {
        const f = a.fields;
        if (!f["Home Priority"]) return null;
        const relatedEvent = (f["Related Event"] || [])[0];
        return {
          id: a.id,
          action: f["Home Priority"],
          title: relatedEvent?.name || f["Cycle Name"] || "Untitled",
          deadline: f["Application Deadline"] || f["Payment Due Date"] || null,
          daysUntil: f["Days Until Deadline"] ?? null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999));

    // ---- YTD Snapshot ----
    let sales = 0;
    let expenses = 0;
    let netIncome = 0;
    results.forEach((r) => {
      const f = r.fields;
      const endDate = f["Event Ends"];
      if (endDate && new Date(endDate).getFullYear() === currentYear) {
        sales += f["Gross Sales"] || 0;
        expenses += f["Total Event Expenses"] || 0;
        netIncome += f["Net Income"] || 0;
      }
    });

    // ---- Next Scheduled Event ----
    const upcoming = applications
      .map((a) => {
        const f = a.fields;
        const status = f["Participation Status"]?.name;
        if (status !== "Confirmed") return null;
        const endsAt = f["Event Ends"];
        if (!endsAt || new Date(endsAt) < now) return null;
        const relatedEvent = (f["Related Event"] || [])[0];
        const eventFields = relatedEvent ? eventsById[relatedEvent.id] : {};
        const resultFields = resultsByAppId[a.id] || {};
        return { f, eventFields, resultFields, endsAt };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));

    const next = upcoming[0];
    const nextEvent = next
      ? {
          name: next.eventFields?.["Event Name"] || next.f["Cycle Name"],
          dateStart: next.f["Event Starts"] || null,
          city: next.eventFields?.["City"] || null,
          state: next.eventFields?.["State"] || null,
          prepStatus: next.resultFields["Preparation Status"]?.name || null,
          loadIn: next.resultFields["Load-in Date & Time"] || null,
          boothLocation: next.resultFields["Booth Location"] || null,
          boothSize: next.f["Reserved Space / Booth Size"] || null,
          setting: next.f["Reserved Space Setting"]?.name || null,
        }
      : null;

    res.status(200).json({
      artistName: "Kelley",
      needsAttention: needsAttention.slice(0, 5),
      ytd: { sales, expenses, netIncome },
      nextEvent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong talking to Airtable." });
  }
};
