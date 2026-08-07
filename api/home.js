// /api/home.js
// Powers the Home dashboard. Reads from the real production base:
// Applications & Bookings (deadlines, status) + Events (venue/location)
// + Event Results & Logistics (setup info, expenses).
//
// Scoped per artist via the "Artist" link field on Applications & Bookings.
// Callers must pass ?u=<Link ID>, which is looked up against the Artists
// table to find the artist's record, then used to filter everything else.

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const ARTISTS_TABLE = "Artists";
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

async function findArtistByLinkId(linkId) {
  const formula = `{Link ID}='${linkId.replace(/'/g, "\\'")}'`;
  const data = await airtableRequest(
    `${encodeURIComponent(ARTISTS_TABLE)}?filterByFormula=${encodeURIComponent(formula)}`
  );
  return data.records[0] || null;
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

    const artistLinkId = req.query.u;
    if (!artistLinkId) {
      res.status(400).json({ error: "Missing your personal show link (?u=...)." });
      return;
    }

    const artist = await findArtistByLinkId(artistLinkId);
    if (!artist) {
      res.status(404).json({ error: "We couldn't find an artist for this link." });
      return;
    }

    const [applicationsAll, events, resultsAll] = await Promise.all([
      fetchAll(APPLICATIONS_TABLE),
      fetchAll(EVENTS_TABLE),
      fetchAll(RESULTS_TABLE),
    ]);

    const applications = applicationsAll.filter((a) =>
      (a.fields["Artist"] || []).includes(artist.id)
    );
    const applicationIds = new Set(applications.map((a) => a.id));
    const results = resultsAll.filter((r) =>
      (r.fields["Related Application / Booking"] || []).some((id) => applicationIds.has(id))
    );

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
    // Only overdue and due-today items are surfaced here (see public/app.js);
    // notes/attachments are included so the side peek panel has real content.
    const needsAttention = applications
      .map((a) => {
        const f = a.fields;
        if (!f["Home Priority"]) return null;
        const relatedEventId = (f["Related Event"] || [])[0];
        const relatedEventFields = relatedEventId ? eventsById[relatedEventId] : null;
        return {
          id: a.id,
          action: f["Home Priority"],
          title: relatedEventFields?.["Event Name"] || f["Cycle Name"] || "Untitled",
          deadline: f["Application Deadline"] || f["Payment Due Date"] || null,
          daysUntil: f["Days Until Deadline"] ?? null,
          notes: f["Cycle Notes"] || f["Confirmation Details"] || null,
          attachments: (f["Application Packet"] || []).map((att) => ({
            name: att.filename,
            url: att.url,
          })),
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
        const relatedEventId = (f["Related Event"] || [])[0];
        const eventFields = relatedEventId ? eventsById[relatedEventId] : {};
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
      artistName: artist.fields["Name"] || "there",
      needsAttention,
      ytd: { sales, expenses, netIncome },
      nextEvent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong talking to Airtable." });
  }
};
