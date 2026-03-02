# QR Scan + Location PoC

Proof-of-concept app for QR scans with dual location signals:

- browser location (Geolocation API)
- Cloudflare colo (from Worker request metadata)

Each QR UUID maps to one Durable Object actor (`ScanActor`) that stores scan events and broadcasts live updates over WebSocket.

## Stack

- Frontend: React + Vite + TypeScript + `wouter` + Zustand
- Worker API: Cloudflare Workers + `hono`
- Stateful backend: Durable Objects via `@cloudflare/actors` (SQLite-backed)

## Current Routes

- `/` create QR UUID and render QR code
- `/q/:uuid` scan landing page, requests location, posts scan event
- `/qr/:uuid` detail page with scan history + live updates

## API Endpoints

- `POST /api/qr-codes`
  - returns `{ ok, uuid, scanUrl, detailUrl }`
- `POST /api/scans`
  - body: `{ uuid, userLocation | null, locationStatus }`
  - enriches with `scannedAt`, `colo`, `userAgent`
- `GET /api/scans/:uuid`
  - returns `{ ok, events }`
- `GET /api/scans/:uuid/stream`
  - websocket stream for live scan events

## Local Dev

Install:

```bash
pnpm install
```

Frontend only (Vite):

```bash
pnpm dev
```

Worker + DO + assets (recommended for end-to-end):

```bash
pnpm wrangler:dev
```

Build:

```bash
pnpm build
```

Dry-run bundle check:

```bash
pnpm exec wrangler deploy --dry-run
```

Generate Worker runtime types:

```bash
pnpm exec wrangler types
```

## Important Config Notes

- `wrangler.jsonc` uses static assets from `dist`.
- `assets.not_found_handling = "single-page-application"` enables deep-link SPA routes (`/q/:uuid`, `/qr/:uuid`).
- `assets.run_worker_first = ["/api/*"]` ensures API routes hit Worker/Hono first.

## Durable Object Design

- One actor per QR UUID using deterministic routing (`getByName(uuid)`).
- Actor schema is initialized in constructor via `ctx.blockConcurrencyWhile(...)`.
- Events are persisted in SQLite table `scan_events` with index on `scanned_at_ms`.
- Actor exposes RPC methods:
  - `recordScan(payload)`
  - `getScans()`
- WebSocket upgrades handled on actor path `/stream`.

## Known Caveats

- Geolocation requires secure context on real devices (`https://`), except localhost.
- User may deny location; scans are still recorded with non-granted status.
- `/favicon.ico` is not added yet, so browser may log 404 for it.
- Event retention is currently unbounded (PoC decision: keep all events).

## Suggested Next Work (Phase 5)

1. Harden API errors/status codes and response contracts.
2. Add pagination for `GET /api/scans/:uuid` while retaining all events.
3. Improve websocket reconnect/backoff in Zustand store.
4. Add lightweight tests for validation + store event dedupe.

## Key Files

- `worker/index.ts`
- `worker/actors/ScanActor.ts`
- `worker/lib/validation.ts`
- `src/store/qrStore.ts`
- `src/routes/CreateQrPage.tsx`
- `src/routes/ScanPage.tsx`
- `src/routes/QrDetailPage.tsx`
- `plan.md`
