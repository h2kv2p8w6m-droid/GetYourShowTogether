# Get Your Show Together™

## Naming
- Full app name: **Get Your Show Together** (trademarked — use the full name, not an initialism)
- Never use "GYST" anywhere — in code, comments, UI copy, commit messages, or docs
- The only approved shorthand is **GetYST** (e.g. for variable names, repo names, short labels)

## Data source
- Airtable base: `appXMfXX8oxc7rpbA` ("BETA | GET YOUR SHOW TOGETHER™")
- Tables in use:
  - `Events`
  - `Applications & Bookings`
  - `Event Results & Logistics`
- No Artists table or per-artist link field exists yet — the app is single-user
  (Kelley) for now. `/api/home` returns all data unscoped; do not add artist
  filtering until an Artists table and link field are added to the base.

## Hosting / deployment
- Hosted on Vercel, connected to a GitHub repo (already set up — no new Vercel
  project needed for changes)
- Env vars on Vercel: `AIRTABLE_BASE_ID`, `AIRTABLE_TOKEN` (token must be scoped
  to the base above)

## Structure
- `api/home.js` — serverless function backing the Home dashboard
- `public/index.html`, `public/app.js`, `public/style.css` — front end
- `public/fonts/` — Larken font family (woff2)
- Only Home is fully wired to real data; Shows, Tasks, Expenses, Contacts,
  Files, and Reviews are placeholder screens (nav is real, content is "coming
  next")

## Next Steps
1
Get the current build live
The app.zip package I built (redesigned Home dashboard, new nav shell, real logo/fonts) needs to replace the old public/ and api/ folders in your GitHub repo. Since Code already has your project open, just tell it: 'Deploy this to the get-your-show-together GitHub repo, replacing the public and api folders, then push to main.' It can do this directly — no manual GitHub upload needed anymore.
2
Verify Vercel's env vars still match
Tell Code: 'Confirm AIRTABLE_BASE_ID is appXMfXX8oxc7rpbA and AIRTABLE_TOKEN has access to that base' — or just visit the live URL's /api/home endpoint yourself and check for real data instead of an error.
3
Test the live app end to end
Visit your live URL on your phone. Check: does the Home dashboard show your real Needs Attention items, YTD numbers, and next event? Does tapping Shows/Tasks/Expenses/Contacts/Files/Reviews in the nav work (even as 'coming next' placeholders)?
4
Add artist-scoping (before adding real beta testers)
This base has no way yet to tell one artist's data from another's. Tell Code: 'Add an Artists table with Name, Email, and Link ID fields, and link it to Applications & Bookings' — needed before any other beta tester touches this.
5
Build out the remaining screens
The Tasks table, the Today/Overdue/Upcoming/Completed views, and the Shows/Expenses/Contacts/Files/Reviews screens are all still placeholders. Pick whichever matters most for your beta launch and tell Code to build it — one screen at a time is more manageable than all at once.