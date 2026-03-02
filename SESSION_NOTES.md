# Session Notes

## Project Intent

PoC: scan a QR code on mobile, request browser geolocation, capture Cloudflare colo, and persist scan events per UUID in Durable Objects.

## Decisions Locked In

- Routing uses `wouter`.
- Shared app state uses Zustand (`src/store/qrStore.ts`).
- Worker API uses `hono`.
- One Durable Object actor per QR UUID.
- Keep all events (no retention cap in PoC).
- Add debug/read visibility via `GET /api/scans/:uuid`.
- Use packages, do not hand-roll QR implementation.

## Durable Object Notes

- Actor class: `ScanActor` in `worker/actors/ScanActor.ts`.
- Uses SQLite table `scan_events` and index on `scanned_at_ms`.
- Schema setup runs in constructor with `ctx.blockConcurrencyWhile(...)`.
- Uses RPC-style methods for data operations:
  - `recordScan(payload)`
  - `getScans()`
- WebSocket stream remains request-upgrade based at actor path `/stream`.

## Important Fixes Made

- Fixed SPA deep-link 404s by adding `assets.not_found_handling = "single-page-application"` in `wrangler.jsonc`.
- Kept `assets.run_worker_first = ["/api/*"]` so API goes to Worker first.
- Fixed malformed websocket URL in frontend (`ws://`/`wss://` with `://`).
- Refactored Worker -> Actor calls from `fetch` route commands to RPC for scan reads/writes.

## Current Endpoints

- `POST /api/qr-codes`
- `POST /api/scans`
- `GET /api/scans/:uuid`
- `GET /api/scans/:uuid/stream` (websocket)

## Known Caveats

- Real device geolocation needs HTTPS context (localhost exception).
- `/favicon.ico` may 404 for now.
- Retention is intentionally unbounded for PoC.

## Suggested Next Steps

1. API hardening: stricter status codes and error contracts.
2. Pagination for scan history endpoint.
3. WebSocket reconnect/backoff behavior in store.
4. Small tests for validation + event dedupe behavior.
