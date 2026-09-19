# Family Leaderboard

A kid-friendly motivational leaderboard web app for tracking good behaviors —
piano/guitar practice, reading, sports, homework, chores, bedtime, and healthy
eating — with XP, levels, weekly seasons, personal records, badges, streaks,
and a family head-to-head board.

**100% static.** No build step, no backend, no accounts, no tracking. Just open
`index.html` — or host it free on GitHub Pages.

## Run it locally

Open `index.html` in any modern browser (double-click it, or serve the folder
with e.g. `python3 -m http.server`). Everything works offline except the
optional display font (falls back to system fonts gracefully).

## Publish it

### Option A — GitHub Pages (recommended, free)

1. Create a new GitHub repository (e.g. `family-leaderboard`).
2. Upload all files in this folder (`index.html`, `styles.css`, `data.js`,
   `engine.js`, `ui.js`, `README.md`) to the repo — drag & drop on
   github.com works, or:
   ```bash
   cd family-leaderboard
   git init
   git add .
   git commit -m "Family leaderboard"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/family-leaderboard.git
   git push -u origin main
   ```
3. On github.com, go to **Settings → Pages**, and under *Build and deployment*
   choose **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
4. After a minute or two your app is live at
   `https://YOUR-USER.github.io/family-leaderboard/`.

> Note: data is stored in the browser's `localStorage` on each device, so the
> kid's phone/tablet and the parent's phone each keep their own copy. Use the
> **Parent → Export / Import** buttons to move data between devices.

### Option B — Hugging Face Space

A static Space works too: create a **Static** Space and upload the same files.
(Because this app is static, each visitor's browser keeps its own data —
there is no shared server database. For a single family sharing one device or
syncing via export/import, that's exactly what you want.)

## How data is stored

- Everything lives in the browser's `localStorage` under **one namespaced
  key**: `familyLeaderboard.v1`, plus an automatic backup copy
  (`familyLeaderboard.v1.backup`) that the app restores from if the main
  copy ever goes missing.
- Every change auto-saves instantly; the app also saves when the page closes
  and once a minute as a safety net. **Parent → Data → Save now** forces a
  save and shows the last-saved time.
- Note: data is per-device/per-browser. Private/incognito windows and
  "clear site data" wipe it — use **Parent → Data → Export** to download a
  backup file, and **Import** to restore it or move it to another device.

### Cloud sync (optional, free)

For automatic cross-device sync, the app supports a free
[Supabase](https://supabase.com) project as a sync backend:

1. Create a free Supabase project, open **SQL Editor**, and run:
   ```sql
   create table family_sync (
     code text primary key,
     payload jsonb not null,
     updated_at timestamptz default now()
   );
   alter table family_sync enable row level security;
   create policy "open sync" on family_sync for all
     using (true) with check (true);
   ```
2. Copy the **Project URL** and **anon public key** from Project Settings → API.
3. In the app: **Parent → Cloud Sync**, paste them, invent a **family sync
   code**, Save, then Push. On the other device, enter the same three values,
   Save, then Pull.

Privacy: your data is encrypted in the browser (AES-GCM, key derived from
your family code via PBKDF2) before upload — Supabase only ever stores
ciphertext. Sync merges both sides (entries are unioned; newer profile
settings win), so edits on two devices combine instead of clobbering.
Deleted entries are not propagated — delete on each device if needed.
- Dates are stored as local `YYYY-MM-DD` strings; **weeks start on Monday**;
  bedtimes are `HH:MM` strings.
- The parent PIN is stored as a non-reversible numeric hash. It is a
  **kid-gate, not real security** — anyone with the device and know-how could
  read localStorage. Fine for a family app, not for secrets.
- No data ever leaves the device. There are no API keys, no analytics, no
  external requests (except the optional Google Font).

## Features

- **Log tab** — one-tap logging per activity; start/stop practice timers for
  piano, guitar, reading, and sports that log focused minutes.
- **Boards tab** — weekly Season Standings (auto-resets Mondays, with
  this-week-vs-last-week deltas), practice-minutes bar chart, all-time Family
  Board, last-week recap, and a monthly streak heatmap calendar.
- **Records tab** — personal bests per activity (most in a day, earliest
  bedtime, longest streaks) with full-screen confetti when a record breaks.
- **Badges tab** — 8 built-in badges (Early Bird, Night Owl Tamer, Double
  Instrument Day, Century Club, Homework Hero, Veggie Voyager, Bookworm,
  Sport Star) plus unlimited parent-created custom badges.
- **Parent tab** (PIN-gated) — rename profiles, add/edit/delete custom
  activities, create/edit/delete custom badges, set up encrypted cloud sync,
  review/edit/delete entries, grant & use streak-freeze tokens
  (1 per profile per week), reset the season, export/import JSON, change PIN.

## Files

| File         | What it does                                              |
|--------------|-----------------------------------------------------------|
| `index.html` | App shell: header, tabs, modal/toast/confetti layers      |
| `styles.css` | All styling — mobile-first, playful, big touch targets    |
| `data.js`    | State shape, localStorage persistence, date helpers       |
| `engine.js`  | Game rules: XP, levels, streaks, records, badges, seasons |
| `sync.js`    | Optional encrypted cloud sync (Supabase, free tier)       |
| `ui.js`      | Rendering, timer, canvas charts, confetti, all interactions|
| `README.md`  | This file                                                 |

## Tweaking the rules

Open `data.js` → `defaultActivities()` to change XP values, daily caps, or
which profile sees which activity. Badge rules live in `engine.js` (`BADGES`);
the level curve is `levelFor()` in `engine.js` (level *n* starts at
50·(n−1)² XP).
