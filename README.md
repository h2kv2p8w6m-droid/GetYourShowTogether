# Get Your Show Together — Beta App

This is the beta version of your app. It's a small website (no app-store install needed —
artists tap a link and it works like an app on their phone), backed by your Beta DB in Airtable.

## How it works

- Each artist gets a private link like `https://your-app.vercel.app/?u=kelley-a8f3x2`
- The `kelley-a8f3x2` part is their **Link ID** from the Artists table in Beta DB
- No password, no login screen — the link *is* the key
- Tapping "+" lets them log a new show in 2 taps
- Their Airtable data updates instantly when they save

## Deploying this for free (about 10 minutes, one-time setup)

You'll need two free accounts: **GitHub** (github.com) and **Vercel** (vercel.com). Vercel can
sign up using your GitHub account directly, which saves a step.

### 1. Put this project on GitHub
1. Go to github.com, log in, click the **+** in the top right → **New repository**
2. Name it something like `get-your-show-together` → Create repository
3. On the next page, click **uploading an existing file**
4. Drag in every file and folder from this project (keep the folder structure —
   `api/` and `public/` need to stay as folders)
5. Click **Commit changes**

### 2. Connect it to Vercel
1. Go to vercel.com → **Sign up** → choose **Continue with GitHub**
2. Click **Add New... → Project**
3. Find your `get-your-show-together` repo → **Import**
4. Before clicking Deploy, open **Environment Variables** and add:
   - `AIRTABLE_BASE_ID` → `app8XyC4L0IchE2zn`
   - `AIRTABLE_TOKEN` → (see step 3 below to get this)
5. Click **Deploy**

### 3. Get your Airtable token
1. Go to airtable.com/create/tokens → **Create new token**
2. Name it anything (e.g. "Show Together App")
3. Under **Scopes**, add: `data.records:read` and `data.records:write`
4. Under **Access**, add only **Beta DB**
5. Click **Create token**, copy it, paste it into the `AIRTABLE_TOKEN` field on Vercel
   (if you already deployed, add it under Project → Settings → Environment Variables,
   then redeploy)

### 4. Test it
Once deployed, Vercel gives you a URL like `get-your-show-together.vercel.app`.
Test your own link:

```
https://get-your-show-together.vercel.app/?u=kelley-a8f3x2
```

You should see your 10 events. Try adding a new one with the **+** button.

### 5. Sending links to beta artists
For each new artist: add them to the **Artists** table in Beta DB with a unique
**Link ID** (letters/numbers, no spaces), then send them:

```
https://get-your-show-together.vercel.app/?u=THEIR-LINK-ID
```

## What's not built yet

- Custom domain (you can point `getyourshowtogether.app` at this later, free, in Vercel's
  domain settings)
- Expense logging screen (data structure is ready in Airtable, UI isn't built yet)
- Star rating / post-event review screen
- Deadline reminder emails
- Event suggestions

Let me know when you're ready to tackle any of these next.
