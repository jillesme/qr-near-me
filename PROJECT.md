# Project Backlog: Maintainability + Quality

This backlog converts the improvement plan into trackable tickets with IDs, scope, dependencies, effort, and execution order.

## Status Legend

- `todo` not started
- `in_progress` active work
- `blocked` waiting on dependency/decision
- `done` complete and merged

## Recommended PR Sequence

1. `P-001` -> `P-002`
2. `P-003` + `P-004`
3. `P-005` -> `P-006`
4. `P-007` + `P-008`
5. `P-009` -> `P-010`

## Tickets

### P-001 - Fix lint baseline and generated-file lint noise
- **Status:** `done`
- **Priority:** High
- **Effort:** S (0.5-1 day)
- **Depends on:** none
- **Scope:**
  - Fix `@typescript-eslint/no-unused-expressions` errors in `worker/actors/ScanActor.ts` for SQL tagged statements.
  - Exclude generated files/directories from lint scope (`.wrangler/**`, `worker-configuration.d.ts`).
  - Ensure `pnpm lint` passes locally.
- **Acceptance criteria:**
  - `pnpm lint` exits 0.
  - No lint errors from generated artifacts.

### P-002 - Add CI quality gate (lint, build, wrangler dry-run)
- **Status:** `done`
- **Priority:** High
- **Effort:** S (0.5-1 day)
- **Depends on:** `P-001`
- **Scope:**
  - Add GitHub Actions workflow for pull requests.
  - Run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build`, and `pnpm exec wrangler deploy --dry-run`.
  - Cache PNPM dependencies to keep checks fast.
- **Acceptance criteria:**
  - PRs run checks automatically.
  - Failing lint/build blocks merge.

### P-003 - Create shared API contracts package/module
- **Status:** `done`
- **Priority:** High
- **Effort:** M (1-2 days)
- **Depends on:** `P-001`
- **Scope:**
  - Introduce shared contracts module (e.g. `shared/contracts.ts`).
  - Remove duplicate types between `worker/types.ts` and `src/types/scan.ts`.
  - Keep frontend and worker imports aligned to one source of truth.
- **Acceptance criteria:**
  - Single canonical contract module in use.
  - Type-only changes compile with `pnpm build`.

### P-004 - Normalize API response/error schema
- **Status:** `todo`
- **Priority:** High
- **Effort:** M (1-2 days)
- **Depends on:** `P-003`
- **Scope:**
  - Standardize all API responses to discriminated union shape.
  - Introduce stable `error.code` taxonomy (`invalid_payload`, `not_found`, `network_error`, etc.).
  - Update frontend API client and store logic to consume the normalized schema.
- **Acceptance criteria:**
  - All API endpoints return consistent shape.
  - Frontend handles errors without ad-hoc string branching.

### P-005 - Split Zustand store into slices/modules
- **Status:** `todo`
- **Priority:** Medium
- **Effort:** M (2-3 days)
- **Depends on:** `P-004`
- **Scope:**
  - Decompose `src/store/qrStore.ts` into focused slices: create, scan, detail, stream.
  - Move side-effect helpers (API/websocket/location) into small action utilities.
  - Keep behavior parity during refactor.
- **Acceptance criteria:**
  - `src/store/qrStore.ts` no longer a monolith hotspot.
  - Existing routes functionally unchanged.

### P-006 - WebSocket resilience and parsing hardening
- **Status:** `todo`
- **Priority:** Medium
- **Effort:** M (1-2 days)
- **Depends on:** `P-005`
- **Scope:**
  - Add safe JSON parse + payload guards for stream events.
  - Add reconnect with capped exponential backoff + jitter.
  - Ensure cleanup/reset on route changes to prevent stale socket state.
- **Acceptance criteria:**
  - Stream recovers after transient disconnects.
  - Malformed messages do not crash client logic.

### P-007 - Durable Object schema migrations + lifecycle policy
- **Status:** `todo`
- **Priority:** High
- **Effort:** M (1-2 days)
- **Depends on:** `P-001`
- **Scope:**
  - Add migration tracking table for SQLite schema versions.
  - Run migrations in constructor via `blockConcurrencyWhile`.
  - Document retention strategy for `interaction_events` (time-based or count-based).
- **Acceptance criteria:**
  - Schema versioning exists and is idempotent.
  - Migration path documented for future schema changes.

### P-008 - Pagination + bounded reads for interaction history
- **Status:** `todo`
- **Priority:** High
- **Effort:** M (1-2 days)
- **Depends on:** `P-007`
- **Scope:**
  - Add pagination parameters (`cursor` or `limit/offset`) for `GET /api/interactions/:uuid`.
  - Update UI detail page to request paged history.
  - Keep ordering stable (newest first) and preserve event dedupe.
- **Acceptance criteria:**
  - Endpoint no longer returns unbounded event lists.
  - UI can navigate/refresh pages reliably.

### P-009 - Observability baseline (logs + traces + structured events)
- **Status:** `todo`
- **Priority:** Medium
- **Effort:** S-M (1 day)
- **Depends on:** `P-004`
- **Scope:**
  - Enable Workers observability settings in `wrangler.jsonc`.
  - Add structured logs for key API/actor operations.
  - Include correlation fields (`uuid`, `eventId`, `decisionMethod`, error code).
- **Acceptance criteria:**
  - Logs/traces visible in Cloudflare dashboard.
  - Error triage possible without reproducing locally.

### P-010 - Targeted tests + documentation consistency pass
- **Status:** `todo`
- **Priority:** High
- **Effort:** M (2-3 days)
- **Depends on:** `P-004`, `P-006`, `P-008`
- **Scope:**
  - Add unit tests for validation and decision logic (distance/fallback/rejection reasons).
  - Add store-level tests for dedupe and stream handling.
  - Update docs (`README.md`, `SESSION_NOTES.md`) to match current endpoint names and behavior.
- **Acceptance criteria:**
  - Core policy logic covered by repeatable tests.
  - Docs reflect current runtime API paths and data model.

## Milestones

### M1 - Build Safety (Week 1)
- Tickets: `P-001`, `P-002`
- Outcome: clean lint baseline + automated PR guardrails.

### M2 - Contract Integrity (Week 1-2)
- Tickets: `P-003`, `P-004`
- Outcome: single source of truth for types and error contracts.

### M3 - Stateful Reliability (Week 2)
- Tickets: `P-007`, `P-008`
- Outcome: migration-safe actor storage + scalable history reads.

### M4 - Frontend Maintainability (Week 2-3)
- Tickets: `P-005`, `P-006`
- Outcome: modular store and resilient live updates.

### M5 - Operability + Confidence (Week 3)
- Tickets: `P-009`, `P-010`
- Outcome: observable production behavior and regression protection.

## Suggested Working Rules

- Keep each ticket in a separate PR where practical.
- Use commit/PR references like `P-004: normalize API error schema`.
- Only mark ticket `done` after CI is green and docs/tests for that ticket are included.
