# Multiverse Timeline

An interactive Marvel **multiverse** timeline. 65 films & shows across **6 universes**, laid out as
**parallel horizontal branch lanes** emerging from a glowing "Sacred Timeline" nexus — with a
chronological ⇄ release-order toggle, watched tracking, live release countdowns, IMDb data, and a
"what to focus on / why it matters" note for each title.

**Pure static site — no framework, no build step.** HTML + vanilla JS + a JSON data file.

## Universes (parallel lanes)

| Lane | Universe |
|------|----------|
| ◈ **MCU** · Earth-616 | The Sacred Timeline — every film + Disney+ show, Phase 1–6 (incl. upcoming) |
| ◇ **RAIMI** · Earth-96283 | Sam Raimi's Spider-Man trilogy |
| ◇ **WEBB** · Earth-120703 | The Amazing Spider-Man duology |
| ◇ **SONY SSU** · Earth-688 | Venom, Morbius, Madame Web, Kraven… |
| ◇ **SPIDER-VERSE** · Earth-1610 | The animated Spider-Verse films |
| ◇ **X-MEN** · Earth-10005 | The Fox X-Men films |

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole app (markup, styles, logic). |
| `mcu-data.json` | The dataset (65 titles, 6 universes). Loaded via `fetch`. |
| `refresh-data.mjs` | Pulls live data from TMDB and rewrites `mcu-data.json`. |

## Features

- **Horizontal parallel branches:** each universe is its own colored lane; scroll left↔right to
  move through time (mouse-wheel or click-drag), with the universe labels pinned on the left.
- **Order toggle:** in-universe **Chronological** vs **Release** order.
- **Upcoming titles** show a **live days-left countdown** computed in your browser — a film flips
  from "upcoming" to watchable automatically the day it releases. Excluded from your progress count.
- **"Up next" highlight:** the first unwatched title pulses and the view auto-scrolls to it on load.
- **Watched tracking** saved to `localStorage`; progress meter in the navbar.
- **Filters:** All / Films / Shows / To-Watch / Upcoming.
- **Detail modal:** poster, ★ rating, **IMDb link**, live synopsis, "What to focus on", and "Its point".

## Run locally

The data loads via `fetch`, so use a server (not `file://`):

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy to Vercel

No configuration — it's a static site. Drag the folder onto the Vercel dashboard, import the repo,
or run `vercel --prod`. No build command; output dir = project root.

## Keeping data live (TMDB → JSON)

`refresh-data.mjs` re-fetches each title from [TMDB](https://www.themoviedb.org/) — poster, release
date, runtime, rating, IMDb id, and synopsis — and writes it back to `mcu-data.json`, **preserving**
the hand-written `focus` / `point` notes:

```bash
TMDB_API_KEY=your_key_here node refresh-data.mjs
```

> The key is read from the environment and is **never** committed or shipped to the browser — the
> app only references public `image.tmdb.org` poster URLs. Ratings come from TMDB; IMDb links are
> built from TMDB's `imdb_id`. Automate it with a daily GitHub Action or Vercel Cron.
