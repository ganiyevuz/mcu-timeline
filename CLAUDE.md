# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page, static Marvel multiverse timeline. **No framework, no build step, no package.json.**
Everything lives in three files:

| File | Purpose |
|------|---------|
| `index.html` | The entire app — inline `<style>` and inline `<script>`, no external JS files. |
| `mcu-data.json` | The dataset: `{ imgBase, titles[], universes[] }`, 65 titles across 6 universes. Loaded client-side via `fetch`. |
| `refresh-data.mjs` | Standalone Node script that refreshes `mcu-data.json` from the TMDB API. Not shipped to the browser. |

## Running locally

The data loads via `fetch`, so `file://` won't work — serve it:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

There is no lint/test/build command — this project has none.

## Refreshing the dataset

```bash
TMDB_API_KEY=your_key_here node refresh-data.mjs
```

Pulls poster, release date, runtime/episode count, rating, IMDb id, and synopsis per title from TMDB,
and rewrites `mcu-data.json` in place. It **preserves** the hand-curated fields (`focus`, `point`,
`chrono`, `chronoLabel`, `universe`, `universeLabel`, `tint`, `phase`, `saga`) — only TMDB-sourced
fields are overwritten. Titles resolve to a TMDB id by title+year search on first run and cache
`tmdbId` afterward. Runs gently (60ms sleep between requests).

This same script runs daily via `.github/workflows/refresh-data.yml` (cron `17 6 * * *` UTC), which
commits `mcu-data.json` directly to `main` if it changed — that's the source of the recurring
`chore: refresh TMDB data` commits in history. `TMDB_API_KEY` is a repo secret; it is never exposed
to the browser (the app only ever references public `image.tmdb.org` poster URLs at runtime).

## Data model (`mcu-data.json`)

Each entry in `titles[]` mixes TMDB-sourced fields with hand-curated editorial fields:

- **TMDB-sourced** (overwritten by `refresh-data.mjs`): `poster`, `releaseDate`, `release` (year),
  `meta` (runtime or episode count), `rating`, `imdbId`, `overview`, `tmdbId`.
- **Hand-curated** (never touched by the refresh script — edit these directly in the JSON):
  `id`, `chrono` (numeric sort key for in-universe chronological order), `chronoLabel`, `phase`,
  `saga`, `type` (`"film"` | `"series"`), `tint` (lane accent color), `universe`/`universeLabel`,
  `focus` ("what to focus on" note), `point` ("its point" note).
- `universes[]` is an ordered list of universe names — it fixes the lane order used everywhere
  in the UI (grid section order, timeline lane order).

When adding a new title: add both the TMDB-derivable fields and the editorial `focus`/`point`/`chrono`
notes by hand, then let the next `refresh-data.mjs` run backfill/correct the TMDB fields.

## `index.html` architecture

Single `<script>` block at the bottom (after `#app` and modal markup), organized as:

1. **State** — `localStorage`-backed: `seen` (watched-id map), `order` (`chrono`/`release`),
   `view` (`grid`/`timeline`); plus in-memory `filter`.
2. **Derived helpers** — `isUpcoming`/`daysLeft` (computed live against `NOW` at page load, so an
   upcoming title flips to watchable automatically once its `releaseDate` passes), `sortItems`,
   `visible()` (applies the current filter).
3. **Card rendering** — `cardInner()` builds the shared card markup used by both view modes;
   `posterEl()` handles the poster-image-with-tinted-fallback pattern (a colored placeholder div
   sits behind the `<img>` and is hidden `onload`, shown on `onerror`).
4. **Two render modes**, both driven by iterating `MCU.universes` (so lane order always matches
   the data file) and grouping/sorting titles per universe via `sortItems`:
   - `renderGrid()` — sectioned grid, one `<div class="grid">` per universe.
   - `renderTimeline()` — horizontal branch-lane layout, alternating item placement (`up`/`down`)
     for the zigzag visual.
5. **`render(scroll)`** — the single re-render entrypoint; wipes and rebuilds `#app`, recomputes the
   progress dial (watched / released — upcoming titles excluded from the denominator), and re-wires
   event listeners (they're re-attached every render since `innerHTML` is cleared each time).
6. **Modal** (`openModal`/`closeModal`) and a custom **confirm dialog** (`askConfirm`, promise-based,
   used for the "Reset progress" action) — both built as plain DOM/innerHTML, no dialog library.
7. **Horizontal scroll handling** for Timeline view — vertical wheel deltas are redirected to
   `scrollLeft`, plus pointer-drag-to-scroll, with a small hint bubble dismissed on first interaction.
8. **Boot** — `fetch('mcu-data.json')` → assign to global `MCU` → `applyView()` + `render(true)`.

There's no component framework or virtual DOM: every state change (`toggleSeen`, filter/order/view
changes) just calls `render()` again, which clears and fully rebuilds `#app` from `MCU` + current
state. Keep that pattern when extending the UI rather than introducing incremental DOM patching.

## Deployment

Static site on Vercel — no build command, output dir is the project root (see `.vercelignore`,
which excludes `refresh-data.mjs` and `.idea` from the deploy). **There is no git integration** —
pushing to `main` (including the daily automated `chore: refresh TMDB data` commit) does **not**
trigger a deploy by itself. Production deploys are manual: `vercel --prod` (project is linked via
`vercel link --yes --project mcu-timeline`). After a data-only change lands via the GitHub Action,
`git pull` locally and run `vercel --prod` to actually ship it.

`vercel --prod` auto-updates the project's default aliases (`mcu-kappa.vercel.app` and the
`mcu-timeline-*-ganiyevuzs-projects.vercel.app` ones), but **`mcu-timeline-app.vercel.app` is a
separate, manually-set alias** — `vercel domains ls` shows it isn't a registered project domain, so
it does NOT follow new deploys automatically and goes stale. After every `vercel --prod`, also run:
```bash
vercel alias set mcu-kappa.vercel.app mcu-timeline-app.vercel.app
```
