# ⚽ Pitch Lords

A complex, fully client-simulated football management game — built with Next.js (App Router), React 19, Tailwind CSS 4, Drizzle ORM and PostgreSQL. Designed mobile-portrait-first with a full desktop layout.

**One league. One cup. Your squad, your coach, your tactics, your career.**

---

## Gameplay

### Career flow

1. **Manager name** → title screen.
2. **Choose your club** — all 12 clubs start from zero. No strengths are revealed.
3. **Choose your coach** — coaches are all equal; they only differ in **playstyle + formation**, which always make sense together (Wing Play → 4-3-3/3-4-3 with real wingers, Low Block → 5-3-2, etc.). Your coach defines your identity.
4. **Draft your XI** — pick 11 players from a 54-player market under a **100M budget cap**. Stars cost 18–26M, so you can only afford a few. Mark one player as **your star ★**. Every position of your formation must be covered.
5. **The world generates after your draft** — NPC clubs are filled with randomized tiers (2 title contenders down to 2 wooden-spoon candidates), coaches, playstyles, formations and 11-man squads. The 26-week season (22 league matchweeks + 4 cup rounds interleaved) begins.

### Match day

- **Live engine**, minute by minute: commentary feed with team-colour markers, possession/shots/saves/corners, cards, injuries (no benches — hurt players play on).
- **Tactics**: Defensive / Balanced / Attacking mentality, 1×/2×/4× speed, **pause**, **skip**, or **simulate instantly** from the home screen.
- **Red cards eject for that match only** (your team plays a man down; no suspensions carry over). If your keeper is sent off, **you pick** which outfield player wears the gloves — everyone keeps equally badly and their formation slot is sacrificed.
- **Cup ties** go to **penalty shootouts** with a full dramatic animation: goal, diving keeper, ball flying to the corner, GOAL!/SAVED! flash.
- **Full-time review**: complete match report — both team sheets (ratings, G/A/saves/tackles/pass accuracy/cards), team totals, scorers, MOTM. Closeable, and **archived forever** — replay any of your past matches from the League → Schedule tab.

### Player model

| Layer | Details |
|---|---|
| Positions | GK · CB · FB · CM · WM · WF (wing forward) · ST |
| Outfield abilities | Attack, Defense, Passing, Dribble, Pace, Vision, Shooting, Physicality |
| Keeper abilities | Diving, Passing, Reflex, Physicality |
| Hidden stats | **Potential** (a scout *estimate* — stellar form raises it and lets players surpass it, chronic poor form drags it down) and **growth type**: Early Peak, Standard, Slow Bloomer, One-Season Wonder, Timeless, Wildcard |
| Development | Seasonly random spikes (0–13 ovr) scaled by potential, fueled or stunted by **match ratings** |
| Multi-position | Players can naturally fit a second position; playing out of role **teaches it** — progress scales with performance rating; mastered positions appear as extra Optimal tags |
| Life cycle | Aging, random retirements, career dossiers (season-by-season club, apps, G, A, avg rating), ovr trajectory sparkline on every card |

### Playstyles matter

Each style has **weighted key players**: Tiki-Taka rewards whole-team passing but lives in midfield; Wing Play dies without wingers/full-backs; Direct needs a target man and dominant centre-backs; etc. The **Style Fit %** meter on the tactics board shows how well your XI serves the idea — and the engine punishes mismatches with lost possession and weaker attacks. A style-matchup matrix adds rock-paper-scissors flavour (counters punish possession, presses disrupt build-up, low blocks blunt counters…).

### Transfers & academy

- **Trades**: one swap deal per week — pick your player, knock on a club's door, they accept, counter, or mock you. Trades stay within a **line**: keeper↔keeper, defender↔defender (CB/FB), midfielder↔midfielder (CM/WM), attacker↔attacker (WF/ST). NPC clubs trade with each other in parallel all season; every deal is logged in the **league trade history**.
- **Academy draft** (each off-season): 4 fully random prospects — sometimes raw kids, sometimes already 80-ovr wonderkids. Select → review the card → choose who they replace → **confirm**. Same-line rules apply.

### The world

- **Social feed**: a fake football internet — hype, slander, transfer rumors, hot-seat pressure, match reactions referencing your star player. Every post has a **comment section**; you can reply as yourself. Latest post previewed on Home.
- **Stats page**: 11 leaderboards — Golden Boot, Playmaker, Top Performance (avg rating), MOTM, Golden Glove Saves, Clean Sheets, Ball Winners, Pass Masters, Metronomes, Booked Most, Sent Off. Your players are highlighted.
- **Coach churn**: hire coaches anytime (they're recycled around the league); NPCs get sacked after bad runs.
- **End-of-season awards**: champions, cup winners (with your **cup run** shown even when out — green while alive, red with the exit stage, gold when champions), Player of the Season / League / Cup MVPs, Golden Boot, Playmaker, MOTM league & cup, Best Young Player (U-20 in season 1, rookies after), Golden Glove, and **Manager of the Season** (league points + cup depth — you can win it).
- **Career & honours archive**: your win/draw/loss record, win %, titles, and formation/mentality usage percentages across your whole career.

### UI

- Mobile portrait-first (480px shell, bottom tab bar).
- Desktop layout (1180px) with a **sidebar**, multi-column home/stats/cup, centered match screen.
- **Cup weeks shift the entire theme from league green to cup gold.**
- Tactics board: drag chips between slots (or tap-tap to swap), position-fit colour rings, hold a chip to reveal the player card — dragging cancels the card.
- Click any player name (stats, trades, awards, feeds) for their full card; click any club for their roster.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS 4** (`@theme` tokens in `src/app/globals.css`)
- **Drizzle ORM** + **PostgreSQL** (`saves` table, slot 1)
- Persistence: `localStorage` first, debounced mirror to the server via `POST /api/save`, fallback load from `GET /api/save`. Save format is versioned (current: **v7**) — malformed or stale saves are rejected, never rendered.

Resetting a career clears the browser save immediately and deletes the database save without requiring a new career. A durable browser reset marker blocks old database saves from being restored if deletion is interrupted or the database is offline; deletion is retried on the next visit.

## Getting started

```bash
# 1. install dependencies
npm install

# 2. make sure DATABASE_URL is set in .env
#    e.g. postgresql://postgres:postgres@127.0.0.1:5432/app_db

# 3. create the schema
npx drizzle-kit push

# 4. run
npm run dev        # development
npm run build && npm start   # production
```

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | DB connectivity check |
| `GET /api/save` | Load saved game |
| `POST /api/save` | Persist game state (debounced) |
| `DELETE /api/save` | Immediately remove the saved career |

## Project structure

```
src/
  app/
    page.tsx              # shell: phase router + overlay + cup theme
    layout.tsx            # fonts, viewport, metadata
    globals.css           # theme tokens, animations (incl. penalty drama)
    api/health/           # healthcheck
    api/save/             # save load/persist
  components/ui.tsx       # crest generator, buttons, ratings, player card (career, trajectory)
  lib/
    types.ts              # all game data models
    data.ts               # formations (with pitch coords), styles + weights, position fit/groups, palettes, text banks
    gen.ts                # world/player/coach/market/fixture/cup/calendar generation
    engine.ts             # minute-by-minute match engine, ratings, red cards, penalties, MOTM
    season.ts             # standings, week processing, stats aggregation, trades, development, career archiving, reports, awards
    state.tsx             # reducer, persistence, save validation
    overlay.tsx           # global click-throughs: player cards, club rosters, career dossier, match reports
  screens/
    Title / ClubSelect / CoachSelect / SquadBuild / Hub / Match / Awards / Youth
scripts/smoke.ts          # headless full-season simulation test
```

## Deploying to Vercel (beginner-friendly)

You need three things: a **GitHub repo** with this code, a **free cloud Postgres database**, and a **free Vercel account**.

### 1. Get a hosted database first (yes, before Vercel)

The game saves to `localStorage` in the browser, but the server save (`/api/save`) needs a real PostgreSQL. Easiest free option:

1. Go to **neon.tech** → sign up (free) → **Create a project** (any region near you).
2. On the project dashboard click **Connection string** (it looks like `postgresql://user:pass@ep-xxxx.neon.tech/db?sslmode=require`) and copy it. Keep it private.

(Alternatives that work the same way: Supabase → *Project Settings → Database → Connection string (URI)*, or the Neon integration inside the Vercel Marketplace.)

### 2. Push this project to GitHub

```bash
git init
git add .
git commit -m "Pitch Lords"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

`.gitignore` is already configured — your `.env` will **not** be uploaded. Don't remove that rule.

### 3. Import into Vercel

1. Go to **vercel.com** → sign up with GitHub → **Add New… → Project**.
2. Pick your repo → Vercel auto-detects **Next.js** (don't change build settings).
3. Open **Environment Variables** and add:
   - Key: `DATABASE_URL`
   - Value: the Neon connection string from step 1
4. Click **Deploy**. Wait ~1 minute. You get a live URL like `https://pitch-lords.vercel.app`.

### 4. Create the `saves` table in the cloud database (one command)

On your computer, inside this project folder, point at the **cloud** database once and push the schema:

```bash
# temporarily use the production URL
DATABASE_URL="postgresql://user:pass@ep-xxxx.neon.tech/db?sslmode=require" npx drizzle-kit push
```

That's it — the table now exists in the cloud DB. Afterwards, your local `.env` can keep pointing at your local Postgres for development.

### Notes

- SSL is handled automatically: `src/db/index.ts` enables SSL for any non-localhost `DATABASE_URL` (Neon/Supabase require it).
- The game is **fully playable even if the cloud DB is down** — it falls back to browser `localStorage`. The DB is the cross-device backup.
- Every push to `main` redeploys automatically.
- Changing env vars later: Vercel dashboard → your project → **Settings → Environment Variables**, then redeploy.

## Simulation testing

A headless smoke test plays a complete season through the real pipeline and asserts everything:

```bash
npx tsx scripts/smoke.ts
```

It verifies: 22 rounds / 26 weeks / 4 cup rounds, unique club names + shorts + colours, all squads exactly 11, every cup tie producing a winner (penalties included), stats aggregation across all 11 leaderboards, all awards computing (incl. Manager of the Season), trades, lineup integrity after rollover, career archiving for players and manager, and season-2 readiness.

## Design notes

- Every club has exactly **11 players** — trades and academy swaps keep the invariant; retirements are topped up with academy kids.
- The user's lineup is **self-healing**: after trades, swaps, retirements, coach changes and save loads, any hole is auto-filled with the best-fitting available player.
- Red cards are **match-only**; the ejected player is fully available next week.
- Performance is the currency of the game: match ratings drive position learning, growth, soft potential, MVPs, MOTMs, and the Manager award.
