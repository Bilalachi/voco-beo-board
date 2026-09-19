# Voco BEO Board — Setup Guide

A shared board for Banquet Event Orders. Anyone with the link can view it —
no account needed. Staff (AV, IT, Sales, Banquet) log in to upload or edit.

This guide assumes no coding experience — just following steps and
copy-pasting values. It should take about 20–30 minutes the first time.

---

## What you'll set up

1. **Supabase** — the database, login system, and PDF storage (free tier).
2. **GitHub** — hosts the actual website and rebuilds it automatically
   whenever the code changes (also free).

---

## Part 1 — Supabase (database, login, file storage)

### 1.1 Create the project
1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign up (free).
2. Click **New project**. Name it whatever you like (e.g. `voco-beo-board`).
   Pick any region close to the hotel. Set a database password and **save it
   somewhere safe** (you likely won't need it again, but keep it just in case).
3. Wait a minute or two for the project to finish setting up.

### 1.2 Create the database tables and security rules
1. In the left sidebar, click **SQL Editor** → **New query**.
2. Open the file `supabase/schema.sql` from this project, copy **all** of it,
   and paste it into the query box.
3. Click **Run** (bottom right). You should see "Success. No rows returned."
   This creates the `events` table, sets up the security rules (anyone can
   read, only logged-in staff can write), and creates the storage folder for
   PDFs.

### 1.3 Turn on live sync (Realtime)
1. Left sidebar → **Database** → **Replication**.
2. Find the `events` table in the list and toggle it **on**.
   This is what makes an upload appear instantly on everyone else's screen.

### 1.4 Create the 4 staff logins
1. Left sidebar → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Repeat this 4 times, once per staff account. For each one:
   - **Email**: use the username followed by `@voco.internal` (this isn't a
     real inbox — it's just how the login system identifies each account).
     For example: `av@voco.internal`
   - **Password**: the password for that account.
   - **Auto Confirm User**: turn this **on** (so no email verification is needed).
   - After creating the user, click into it and find **User Metadata** (or
     "Raw User Meta Data") — paste in JSON like this, with the right values:
     ```json
     { "display_name": "AV", "role": "av" }
     ```

   Use these 4 accounts (feel free to change the passwords to your own —
   just make sure whatever you set here matches what staff will type in):

   | Email | Display name in-app | Suggested password |
   |---|---|---|
   | av@voco.internal | AV | *(pick your own — see note below)* |
   | it@voco.internal | IT | IT@Voco |
   | sales@voco.internal | Sales | SalesTeam@Voco |
   | bq@voco.internal | Bq | Banquet@Voco |

   > **Note:** the password originally suggested for the AV account looked
   > like it might be reused from somewhere else. Worth picking a fresh one
   > here, since it'll now be typed on shared devices.

   Staff will type just the **username part** (e.g. `av`, `it`, `sales`,
   `bq`) on the login screen — the app automatically adds `@voco.internal`
   behind the scenes.

### 1.5 Grab your project's API keys
1. Left sidebar → **Settings** → **API**.
2. Copy the **Project URL** and the **anon / public** key. You'll paste
   these into GitHub in Part 2 — keep this tab open or paste them somewhere
   temporarily.

Supabase setup is done.

---

## Part 2 — GitHub (hosting the website)

### 2.1 Create the repository
1. Go to [github.com](https://github.com) → sign up if needed (free).
2. Click **New repository**. Name it `voco-beo-board` (or anything —
   just note the name, it matters for step 2.4). Keep it **Public** or
   **Private** — either works for GitHub Pages on a free personal account,
   though Private Pages sites require a paid plan, so **Public** is simpler
   unless you already have GitHub Pro/Team.
3. Don't add a README or .gitignore in this step — leave it empty.

### 2.2 Upload the project code
The simplest way, no command line needed:
1. On your new empty repo's page, click **uploading an existing file**.
2. Drag in every file and folder from this project (keep the folder
   structure — `src/`, `supabase/`, `.github/`, etc. all need to stay as-is).
3. Commit the changes (the green button at the bottom).

*(If your IT manager prefers, this can also be done with `git push` from a
terminal — same result.)*

### 2.3 Add your Supabase keys as GitHub secrets
These keep your Supabase credentials out of the public code.
1. In your repo: **Settings** tab → **Secrets and variables** → **Actions**.
2. Click **New repository secret** and add:
   - Name: `VITE_SUPABASE_URL` → Value: the Project URL from step 1.5
   - Click **New repository secret** again:
   - Name: `VITE_SUPABASE_ANON_KEY` → Value: the anon key from step 1.5

### 2.4 Turn on GitHub Pages
1. Repo → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**
   (not "Deploy from a branch").

### 2.5 Trigger the first deploy
1. Go to the **Actions** tab in your repo. You should see a workflow run
   already in progress (triggered by your upload in step 2.2) — or click
   **Run workflow** if not.
2. Wait 1–2 minutes for it to finish (green checkmark).
3. Go back to **Settings → Pages** — your live link will be shown at the
   top, something like:
   `https://your-github-username.github.io/voco-beo-board/`

That link is what you share with everyone for view-only access, and what
staff use to log in (via the "Staff Login" button in the header).

---

## Everyday use after setup

- **Making a change to the app later**: just edit files in the repo (or ask
  Claude to make the change and hand you updated files) and upload/commit
  them again — GitHub Actions rebuilds and redeploys automatically within
  a minute or two. No one needs to manually run a build.
- **Adding/removing staff logins**: back in Supabase → Authentication →
  Users. No code changes needed.
- **Changing a password**: same place — click the user, reset password.

---

## Local development (optional, only if you want to run it on your own
computer before deploying)

```bash
npm install
cp .env.example .env
# edit .env and paste in your Supabase URL + anon key
npm run dev
```

Then open the local address it prints (usually `http://localhost:5173`).

---

## Troubleshooting

- **Blank page after deploying**: usually means `VITE_SUPABASE_URL` or
  `VITE_SUPABASE_ANON_KEY` wasn't set correctly in GitHub secrets, or the
  repo name doesn't match the auto-detected base path. Re-check step 2.3.
- **"Login failed" for a real staff account**: double check the email in
  Supabase is exactly `username@voco.internal` and "Auto Confirm User" was
  turned on when the account was created.
- **View-only visitors can't see anything**: confirm Part 1.2's SQL ran
  successfully (RLS policies), and that Realtime was enabled (1.3).
- **PDF upload fails**: confirm the `beo-pdfs` storage bucket exists
  (created automatically by `schema.sql`) under Storage in Supabase.
