# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SleepZzz is a baby tracker (sleep, feeds, diapers) built as a Cloudflare Worker with a D1 SQLite database. The entire frontend is a single-page app in `public/index.html` (~2500 lines) using vanilla JS and Chart.js. The backend is a single Worker in `src/index.js`.

## Commands

- **Dev server:** `npm run dev` (runs `wrangler dev`)
- **Deploy:** `npm run deploy` (runs `wrangler deploy`)
- **Run migrations locally:** `wrangler d1 execute sleepzzz-db --local --file=migrations/<file>.sql`
- **Run migrations remotely:** `wrangler d1 execute sleepzzz-db --remote --file=migrations/<file>.sql`

There are no tests, linters, or build steps configured.

## Architecture

- **Single-file backend** (`src/index.js`): Cloudflare Worker exporting `fetch` (HTTP handler) and `scheduled` (cron handler). All API routes are handled via `handleAPI()` with simple if-chain routing on path + method. No framework or router library.
- **Single-file frontend** (`public/index.html`): Entire SPA with inline CSS and JS. Uses Chart.js from CDN. PWA-capable (manifest.json, apple-mobile-web-app meta tags).
- **Database**: Cloudflare D1 (SQLite). Bound as `env.DB`. Schema migrations are sequential numbered SQL files in `migrations/`.
- **Static assets**: Served via Cloudflare Workers Assets (`env.ASSETS.fetch(request)`), configured in `wrangler.toml` under `[assets]`.
- **AI Insights**: A daily cron (11 PM UTC, configured in `wrangler.toml` `[triggers]`) calls Gemini API to generate baby care insights from the last 7 days of data. Results are cached in `insights_cache` table (single-row upsert). Requires `GEMINI_API_KEY` secret.

## API Routes

All under `/api/`. CRUD for: `/api/sleep`, `/api/feeds`, `/api/diapers`, `/api/wakeups`. Plus `/api/analytics` (aggregated stats with timezone offset) and `/api/insights` (cached AI text).

## Database Tables

`sleep_entries`, `feed_entries`, `diaper_entries`, `wake_ups`, `insights_cache`. Schema defined across migration files 0001-0005. Note: migrations are not run automatically — each must be executed manually via wrangler CLI.

## Key Patterns

- Timezone handling: The client sends `tz` (JS `getTimezoneOffset()`, minutes behind UTC) as a query param; the backend converts it to a SQLite time modifier string for local-time grouping in analytics queries.
- All datetime values stored as ISO text strings in SQLite (UTC).
- The `amount_ml` column in `feed_entries` exists in the initial schema but the app actually uses `amount_oz` and `amount_tsp` (added in migration 0002).
