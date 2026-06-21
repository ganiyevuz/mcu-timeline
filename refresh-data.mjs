#!/usr/bin/env node
/*
 * refresh-data.mjs — pull live data from TMDB and save it into mcu-data.json.
 *
 * Updates per title: poster, releaseDate, runtime/episodes (meta), rating,
 * imdbId (→ IMDb link), and synopsis. Curated fields (focus, point, chrono,
 * universe, tint, …) are preserved. Titles that have released since the last
 * run get their real runtime/rating filled in automatically; unreleased ones
 * keep "Coming soon".
 *
 * Usage:   TMDB_API_KEY=xxxxxxxx node refresh-data.mjs
 * Cron it (GitHub Action / Vercel Cron) to keep the data fresh.
 */
import { readFileSync, writeFileSync } from 'fs';

const KEY = process.env.TMDB_API_KEY;
if (!KEY) { console.error('Set TMDB_API_KEY in the environment.'); process.exit(1); }

const FILE = new URL('./mcu-data.json', import.meta.url);
const data = JSON.parse(readFileSync(FILE, 'utf8'));
const api = (path, params = {}) => {
  const q = new URLSearchParams({ api_key: KEY, ...params });
  return fetch(`https://api.themoviedb.org/3/${path}?${q}`).then(r => r.json());
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function resolveId(t) {
  if (t.tmdbId) return t.tmdbId;
  const endpoint = t.type === 'series' ? 'search/tv' : 'search/movie';
  const yearKey = t.type === 'series' ? 'first_air_date_year' : 'year';
  const res = await api(endpoint, { query: t.title, [yearKey]: t.release });
  return res.results?.[0]?.id ?? null;
}

let updated = 0, missed = 0;
for (const t of data.titles) {
  try {
    const id = await resolveId(t);
    if (!id) { console.warn('· no match:', t.title); missed++; continue; }
    t.tmdbId = id;

    if (t.type === 'series') {
      const d = await api(`tv/${id}`, { append_to_response: 'external_ids' });
      if (d.poster_path) t.poster = data.imgBase + d.poster_path;
      if (d.first_air_date) t.releaseDate = d.first_air_date;
      if (d.number_of_episodes) t.meta = `${d.number_of_episodes} episodes`;
      if (d.vote_average) t.rating = Math.round(d.vote_average * 10) / 10;
      if (d.external_ids?.imdb_id) t.imdbId = d.external_ids.imdb_id;
      if (d.overview) t.overview = d.overview;
    } else {
      const d = await api(`movie/${id}`, { append_to_response: 'external_ids' });
      if (d.poster_path) t.poster = data.imgBase + d.poster_path;
      if (d.release_date) t.releaseDate = d.release_date;
      if (d.runtime) t.meta = `${d.runtime} min`;
      if (d.vote_average) t.rating = Math.round(d.vote_average * 10) / 10;
      if (d.imdb_id || d.external_ids?.imdb_id) t.imdbId = d.imdb_id || d.external_ids.imdb_id;
      if (d.overview) t.overview = d.overview;
    }
    // keep the year fields in sync with the (possibly updated) date
    if (t.releaseDate) t.release = Number(t.releaseDate.slice(0, 4));
    updated++;
    process.stdout.write('.');
    await sleep(60); // be gentle with the API
  } catch (e) {
    console.warn('\n· error:', t.title, e.message); missed++;
  }
}

writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
console.log(`\nDone. Updated ${updated}, missed ${missed}, total ${data.titles.length}.`);
