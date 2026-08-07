# Get Your Show Together — v2 (Home dashboard rebuild)

This replaces the old event-card dashboard with the real structure: Needs Attention,
YTD Snapshot, Next Scheduled Event, and quick actions — plus the full nav shell
(Home / Shows / Tasks / Expenses / Contacts / Files / Reviews).

**Only Home is fully wired to real data in this pass.** The other six sections are
in place and clickable (so the navigation is real and demoable) but show a
"coming next" placeholder — that's the honest state, not a bug.

## What's connected

This version points at your **real production base**, not Beta DB:
- Base ID: `appXMfXX8oxc7rpbA` ("BETA | GET YOUR SHOW TOGETHER™")
- Tables used: `Events`, `Applications & Bookings`, `Event Results & Logistics`
- Uses Airtable's own pre-computed `Home Priority` field to drive the Needs
  Attention list — so whatever logic is built into that formula is what shows up.

## Known gap: no multi-artist scoping yet

This base has no Artists table or per-artist link field, so `/api/home`
currently returns everyone's data as if it's all one artist (fine while
it's just Kelley testing). Before adding other beta artists:

1. Add an **Artists** table (Name, Email, Link ID) — same pattern as before
2. Add an **Artist** link field on `Applications & Bookings`
3. `/api/home` will need a `?u=linkId` filter added back in, same as the old version

## Updating your existing Vercel project

You don't need a new Vercel project — just replace the files in your existing
GitHub repo with the ones in this zip:

1. On GitHub, delete the old `public/` and `api/` folders (or their contents)
2. Upload everything from this zip in their place, keeping the folder structure
3. Commit directly to `main`
4. Vercel will auto-redeploy — no environment variable changes needed, since
   you already updated `AIRTABLE_BASE_ID` and `AIRTABLE_TOKEN` for the new base

## Verify the environment variables match

Since this points at a different base than before, double check in Vercel:
- `AIRTABLE_BASE_ID` = `appXMfXX8oxc7rpbA`
- `AIRTABLE_TOKEN` = a token scoped to **this** base specifically (not Beta DB)

## Next steps (not built yet)

- Artist scoping (see above) — needed before adding real beta testers
- Tasks table + the Today/Overdue/Upcoming/Completed views
- Shows, Expenses, Contacts, Files, Reviews screens
- Task detail drawer (matching your comp: description, priority, phase, notes,
  attachments, comments)
- Add Event / Enter Expense / Enter Sales forms (currently placeholder alerts)
