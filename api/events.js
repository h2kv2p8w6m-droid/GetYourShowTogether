// /api/events.js
// A tiny serverless function (runs on Vercel). This is the ONLY place that ever
// sees your Airtable token — the token never reaches the artist's phone/browser.

const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const OPPS_TABLE = "HFF Opportunities";
const ARTISTS_TABLE = "Artists";

async function airtableRequest(path, options = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

async function findArtistByLinkId(linkId) {
  const formula = encodeURIComponent(`{Link ID}="${linkId}"`);
  const data = await airtableRequest(
    `${encodeURIComponent(ARTISTS_TABLE)}?filterByFormula=${formula}&maxRecords=1`
  );
  return data.records[0] || null;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function shapeEvent(record) {
  const f = record.fields;
  return {
    id: record.id,
    name: f["Event Name"] || "Untitled event",
    status: f["Status"] || null,
    dateStart: f["Date Start"] || null,
    dateEnd: f["Date End"] || null,
    location: f["Location"] || null,
    boothSize: f["Booth Size"] || null,
    fee: f["Fee"] ?? null,
    feePaid: !!f["Fee Paid?"],
    applicationDeadline: f["Application Deadline"] || null,
    applicationDeadlineDays: daysUntil(f["Application Deadline"]),
    boothFeeDueDate: f["Booth Fee Due Date"] || null,
    boothFeeDueDays: daysUntil(f["Booth Fee Due Date"]),
    hotelTravelNotes: f["Hotel / Travel Notes"] || null,
    starRating: f["Star Rating"] || null,
    postEventNotes: f["Post Event Notes:"] || null,
    eventUrl: f["Event URL"] || null,
    contactEmail: f["Contact Email"] || null,
  };
}

module.exports = async (req, res) => {
  try {
    if (!AIRTABLE_BASE || !AIRTABLE_TOKEN) {
      res.status(500).json({ error: "Server is missing Airtable configuration." });
      return;
    }

    if (req.method === "GET") {
      const linkId = req.query.artist;
      if (!linkId) {
        res.status(400).json({ error: "Missing artist link id." });
        return;
      }
      const artist = await findArtistByLinkId(linkId);
      if (!artist) {
        res.status(404).json({ error: "No artist found for this link." });
        return;
      }

      // Fetch all opportunities, then keep only the ones linked to this artist.
      // (Fine at beta scale — a handful of artists, a handful of events each.)
      const data = await airtableRequest(`${encodeURIComponent(OPPS_TABLE)}`);
      const mine = data.records.filter((r) =>
        (r.fields["Artist"] || []).includes(artist.id)
      );

      const events = mine.map(shapeEvent).sort((a, b) => {
        const da = a.dateStart ? new Date(a.dateStart) : new Date(9999, 0, 1);
        const db = b.dateStart ? new Date(b.dateStart) : new Date(9999, 0, 1);
        return da - db;
      });

      res.status(200).json({
        artist: { name: artist.fields["Artist Name"], id: artist.id },
        events,
      });
      return;
    }

    if (req.method === "POST") {
      const { artistLinkId, event } = req.body || {};
      if (!artistLinkId || !event || !event.name) {
        res.status(400).json({ error: "Missing artist link id or event name." });
        return;
      }
      const artist = await findArtistByLinkId(artistLinkId);
      if (!artist) {
        res.status(404).json({ error: "No artist found for this link." });
        return;
      }

      const fields = { "Event Name": event.name, Artist: [artist.id] };
      if (event.dateStart) fields["Date Start"] = event.dateStart;
      if (event.dateEnd) fields["Date End"] = event.dateEnd;
      if (event.location) fields["Location"] = event.location;
      if (event.eventUrl) fields["Event URL"] = event.eventUrl;
      if (event.fee) fields["Fee"] = Number(event.fee);
      if (event.applicationDeadline)
        fields["Application Deadline"] = event.applicationDeadline;
      if (event.boothFeeDueDate) fields["Booth Fee Due Date"] = event.boothFeeDueDate;
      if (event.notes) fields["Notes"] = event.notes;

      const created = await airtableRequest(`${encodeURIComponent(OPPS_TABLE)}`, {
        method: "POST",
        body: JSON.stringify({ records: [{ fields }] }),
      });

      res.status(201).json({ event: shapeEvent(created.records[0]) });
      return;
    }

    res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong talking to Airtable." });
  }
};
