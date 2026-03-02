# QR Scan + Location PoC Plan

## Goal
Build a proof-of-concept app where scanning a QR code opens a link, requests location permission in the browser, and records an event in a Durable Object using Actors with:

- `uuid` (QR identifier)
- Cloudflare colo (from incoming request metadata)
- Browser geolocation (latitude/longitude + accuracy)
- Timestamp and basic request context

## Scope (PoC)

### In scope
- One scan endpoint opened by QR code URL
- One QR detail page showing scan history for that QR
- Client-side location permission prompt and capture
- Server-side capture of Cloudflare colo
- Wake Durable Object actor and persist scan event
- Basic response UI showing success/failure and what was recorded

### Out of scope (for now)
- Authentication/authorization
- Anti-fraud controls and rate limiting
- Production analytics dashboards
- Full privacy/compliance workflow beyond a basic consent notice

## High-Level Architecture

1. **QR URL format**
   - QR points to `https://<app-domain>/q/<uuid>`
   - Related detail page at `https://<app-domain>/qr/<uuid>` shows scan history
2. **React page at `/q/:uuid`**
   - Reads UUID from route
   - Requests geolocation via Web Geolocation API
   - Sends event payload to Worker API endpoint
3. **React page at `/qr/:uuid`**
   - Fetches and displays all scan events for this UUID
   - Shows both Cloudflare colo and browser location (or denied status)
4. **Worker API endpoint**
   - Extracts Cloudflare colo from request metadata
   - Validates payload and UUID
   - Gets Actor (Durable Object) instance and records scan
5. **Actor (Durable Object)**
   - Stores append-only scan events keyed by UUID
   - Exposes read path used by QR detail page

## Data Model (initial)

```json
{
  "uuid": "string",
  "scannedAt": "ISO-8601",
  "colo": "AMS",
  "userLocation": {
    "lat": 52.37,
    "lng": 4.90,
    "accuracyMeters": 18
  },
  "client": {
    "userAgent": "..."
  }
}
```

Notes:
- If user denies location, record `userLocation: null` and a status flag.
- Keep payload minimal for privacy.

## Request/UX Flow

1. User scans QR code and opens `/q/<uuid>` on phone.
2. Page shows clear message: "Share location to complete scan".
3. Browser requests geolocation permission.
4. Page posts event to Worker endpoint with UUID + location result.
5. Worker adds `colo` and timestamp, forwards to Actor.
6. Actor persists event and returns acknowledgement.
7. UI confirms completion (or explains failure/retry).

## API Contract (proposed)

- `POST /api/scans`
  - Body: `{ uuid, userLocation | null, locationStatus }`
  - Server enriches with colo and timestamp
  - Returns `{ ok: true, eventId }`

Precision note:
- Location precision does not require an API shape change.
- We can keep the same body and either:
  - send exact coordinates, or
  - send rounded coordinates (approximate) before storing.
- Optional: add `locationPrecision: "exact" | "approximate"` for observability.

Optional debug endpoint for PoC:
- `GET /api/scans/:uuid` returns recent events

Additional endpoint for QR management:
- `POST /api/qr-codes`
  - Generates UUID on server (or validates provided UUID)
  - Returns `{ uuid, scanUrl, detailUrl }`

## Durable Object / Actor Strategy

- **ID strategy:** one actor per `uuid` for simple grouping of all scans of same code.
- **Storage:** append event array or per-event keys in Durable Object storage.
- **Method shape:** `recordScan(event)` and `getScans()`.
- **PoC guardrails:** cap returned records in debug endpoint.

## Privacy and Reliability Notes

- Show explicit user-facing reason before prompting location.
- Handle denied/unavailable/timeout geolocation states gracefully.
- Do not block event recording if precise location is denied; still record scan + colo.
- Consider coarse rounding of lat/lng for PoC if desired.

## Implementation Phases

### Phase 1: Skeleton and routing
- Add `/q/:uuid` route and simple scan page
- Add Worker API route `POST /api/scans`
- Add Actor class with `recordScan`
- Add UUID + QR generation flow for creating scannable links

### Phase 2: Geolocation capture
- Implement browser permission + location retrieval
- Handle denied/error states
- Post payload to Worker endpoint

### Phase 3: Worker enrichment + persistence
- Parse Cloudflare colo from request
- Validate UUID and payload
- Write event through Actor and return ack

### Phase 4: Verify end-to-end on device
- Generate sample QR for `/q/<uuid>`
- Scan from phone on HTTPS tunnel/domain
- Confirm stored event includes UUID, colo, and location status/data

### Phase 5: PoC hardening (light)
- Add minimal input validation and error codes
- Add optional debug read endpoint
- Add concise README runbook

### Phase 6: Package-backed tooling
- Use maintained libraries where needed (no custom QR encoding implementation)
- Prefer platform APIs when stable and built-in (for example, `crypto.randomUUID()`)

## Definition of Done (PoC)

- Scanning QR opens app page on mobile.
- User sees location prompt and can accept/deny.
- A scan event is written to Durable Object actor.
- Event contains UUID + Cloudflare colo + location data or denial status.
- UI returns clear success/failure message.

## Agreed Decisions

- **UUID source:** app-generated UUIDs, then generate QR codes from those links.
- **Actor grouping:** one actor per UUID.
- **Debug visibility:** include temporary debug read endpoint.
- **Retention:** keep all events for PoC.
- **Implementation style:** use well-maintained packages instead of writing QR logic from scratch.
- **Routing library:** use `wouter`.

## Package Choices (initial)

- UUID generation: platform `crypto.randomUUID()` (no extra package required).
- QR generation: use a maintained package such as `qrcode`.
- Geolocation: browser Web Geolocation API (built-in).
- Routing: `wouter`.

## Concrete Implementation Checklist (file-by-file)

## 1) Project and runtime wiring

- [ ] `package.json`
  - Add dependencies for routing and QR rendering/generation (use `wouter`; add `qrcode`, and optionally `qrcode.react` for preview UI).
  - Add scripts for Worker local dev/build/deploy once Worker entrypoint is added.
- [ ] `wrangler.jsonc` (new)
  - Define Worker name, compatibility date, and Durable Object bindings.
  - Bind the Actor/Durable Object class and required migrations.
  - Configure static asset serving if frontend is bundled with Worker.
- [ ] `vite.config.ts`
  - Confirm Cloudflare Worker-compatible build flow.
  - Ensure SPA routing fallback works with `/q/:uuid` paths.

## 2) Frontend app shell and routes

- [ ] `src/main.tsx`
  - Wire top-level app shell for `wouter` route matching.
  - Keep default root mount, move app into route-based structure.
- [ ] `src/App.tsx`
  - Replace starter counter UI with route layout:
    - `/` QR creation page
    - `/q/:uuid` scan landing page
    - `/qr/:uuid` QR detail page (scan history)
    - optional fallback/not-found route
- [ ] `src/App.css` and/or `src/index.css`
  - Replace starter styles with minimal mobile-first UI for scan flow and status messaging.

## 3) Shared types and helpers

- [ ] `src/types/scan.ts` (new)
  - Define `LocationStatus`, `UserLocation`, `ScanCreateRequest`, `ScanEvent`, and API response types.
- [ ] `src/lib/location.ts` (new)
  - Implement geolocation helper wrapping permission, timeout, and error mapping to status enum.
- [ ] `src/lib/uuid.ts` (new)
  - Provide UUID creation via `crypto.randomUUID()` and validation helper.

## 4) QR creation user flow

- [ ] `src/routes/CreateQrPage.tsx` (new)
  - Create UUID (or request one from Worker endpoint).
  - Construct scan URL as `${origin}/q/${uuid}` and detail URL as `${origin}/qr/${uuid}`.
  - Render QR using maintained package.
  - Provide copy/share controls for scan URL, detail URL, and UUID.
- [ ] `src/components/QrPreview.tsx` (new, optional)
  - Encapsulate QR package usage to keep route component small.

## 5) Scan route and browser location capture

- [ ] `src/routes/ScanPage.tsx` (new)
  - Read UUID from route.
  - Ask for location with clear user message and explicit action button.
  - POST payload to Worker API even if location denied/unavailable.
  - Show success/error state and link to `/qr/:uuid` detail page.
- [ ] `src/routes/QrDetailPage.tsx` (new)
  - Read UUID from route.
  - Fetch full scan history from Worker.
  - Render list/table of scan events with time, colo, and user location status/value.
- [ ] `src/lib/api.ts` (new)
  - Add typed `createQrCode`, `postScan`, and `getScans` functions.

## 6) Worker API and Actor wiring

- [ ] `worker/index.ts` (new)
  - Implement `POST /api/qr-codes` for UUID creation and canonical URLs.
  - Implement `POST /api/scans`:
    - validate UUID and payload
    - read colo from Cloudflare request metadata
    - enrich event with timestamp and request context
    - call actor `recordScan`
  - Implement `GET /api/scans/:uuid` endpoint for QR detail UI/debug.
  - Serve SPA/static assets for non-API routes.
- [ ] `worker/actors/ScanActor.ts` (new)
  - Actor class keyed by UUID (the main per-QR Durable Object).
  - Methods: `recordScan(event)` and `getScans()`.
  - Persist all events (no retention cap for current PoC decision).
- [ ] `worker/types.ts` (new, optional)
  - Shared Worker-side request/event types to keep validation and Actor contracts aligned.

## 7) Validation and policy switches

- [ ] `worker/lib/validation.ts` (new)
  - Validate UUID, payload shape, and lat/lng bounds.
- [ ] `worker/lib/location-policy.ts` (new)
  - Centralize precision policy (`exact` vs `approximate`) without changing API schema.
  - If `approximate`, round coordinates before storage.

## 8) Documentation and runbook

- [ ] `README.md`
  - Replace template content with setup/dev/deploy steps.
  - Document QR flow, location behaviors, debug endpoints, and sample curl calls.
- [ ] `plan.md`
  - Keep as architecture/decision record (this file).

## Caveats and watch-outs

- Geolocation requires secure context (`https://`) except localhost; phone testing must use an HTTPS dev URL.
- Some browsers require a clear user gesture before prompting geolocation; avoid auto-prompt on page load.
- User can deny location permanently; scan should still be recorded with `locationStatus` and `userLocation: null`.
- Cloudflare colo is edge location, not user location; treat them as different signals in UI and storage.
- Precision policy can be changed server-side without API break; keep policy centralized in Worker.
- Validate and sanitize all client input (UUID and coordinates), even for PoC.
- Durable Object storage growth is unbounded with "keep all"; acceptable for PoC, but flag for production.
- Debug endpoint should be clearly marked temporary and can be gated later.
- Mobile camera scanning often opens external browser context; keep first page lightweight and fast.
- Clock source should be server-side (`scannedAt` set in Worker), not client-side.
