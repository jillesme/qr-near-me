import { Actor } from '@cloudflare/actors'
import type { ScanEvent } from '../types'

type ScanEventRow = {
  event_id: string
  uuid: string
  scanned_at: string
  scanned_at_ms: number
  colo: string | null
  location_status: ScanEvent['locationStatus']
  lat: number | null
  lng: number | null
  accuracy_meters: number | null
  user_agent: string | null
}

const VALID_LOCATION_STATUS = new Set<ScanEvent['locationStatus']>([
  'granted',
  'denied',
  'unavailable',
  'timeout',
  'error',
])

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function parseIncomingEvent(payload: unknown): ScanEvent | null {
  const data = asObject(payload)
  if (!data) {
    return null
  }

  const client = asObject(data.client)

  if (
    typeof data.eventId !== 'string' ||
    typeof data.uuid !== 'string' ||
    typeof data.scannedAt !== 'string' ||
    typeof data.locationStatus !== 'string' ||
    !client
  ) {
    return null
  }

  if (!VALID_LOCATION_STATUS.has(data.locationStatus as ScanEvent['locationStatus'])) {
    return null
  }

  const location = data.userLocation === null ? null : asObject(data.userLocation)
  if (data.userLocation !== null && !location) {
    return null
  }

  const userLocation =
    location &&
    typeof location.lat === 'number' &&
    typeof location.lng === 'number' &&
    typeof location.accuracyMeters === 'number'
      ? {
          lat: location.lat,
          lng: location.lng,
          accuracyMeters: location.accuracyMeters,
        }
      : null

  return {
    eventId: data.eventId,
    uuid: data.uuid,
    scannedAt: data.scannedAt,
    colo: typeof data.colo === 'string' ? data.colo : null,
    locationStatus: data.locationStatus as ScanEvent['locationStatus'],
    userLocation,
    client: {
      userAgent: typeof client.userAgent === 'string' ? client.userAgent : null,
    },
  }
}

function rowToEvent(row: ScanEventRow): ScanEvent {
  return {
    eventId: row.event_id,
    uuid: row.uuid,
    scannedAt: row.scanned_at,
    colo: row.colo,
    locationStatus: row.location_status,
    userLocation:
      row.lat !== null && row.lng !== null && row.accuracy_meters !== null
        ? {
            lat: row.lat,
            lng: row.lng,
            accuracyMeters: row.accuracy_meters,
          }
        : null,
    client: {
      userAgent: row.user_agent,
    },
  }
}

export class ScanActor extends Actor<Env> {
  static override configuration = () => ({
    sockets: {
      upgradePath: '/stream',
    },
  })

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    ctx.blockConcurrencyWhile(async () => {
      this.ensureSchema()
    })
  }

  protected override shouldUpgradeSocket(request: Request): boolean {
    return request.headers.get('upgrade') === 'websocket'
  }

  private ensureSchema(): void {
    this.sql`
      CREATE TABLE IF NOT EXISTS scan_events (
        event_id TEXT PRIMARY KEY,
        uuid TEXT NOT NULL,
        scanned_at TEXT NOT NULL,
        scanned_at_ms INTEGER NOT NULL,
        colo TEXT,
        location_status TEXT NOT NULL,
        lat REAL,
        lng REAL,
        accuracy_meters REAL,
        user_agent TEXT
      );
    `

    this.sql`
      CREATE INDEX IF NOT EXISTS idx_scan_events_time
      ON scan_events (scanned_at_ms DESC);
    `
  }

  async recordScan(payload: unknown): Promise<{
    ok: boolean
    eventId?: string
    error?: string
  }> {
    const event = parseIncomingEvent(payload)

    if (!event) {
      return { ok: false, error: 'Invalid event payload' }
    }

    const scannedAtMs = Date.parse(event.scannedAt)
    const safeScannedAtMs = Number.isNaN(scannedAtMs) ? Date.now() : scannedAtMs

    this.sql`
      INSERT INTO scan_events (
        event_id,
        uuid,
        scanned_at,
        scanned_at_ms,
        colo,
        location_status,
        lat,
        lng,
        accuracy_meters,
        user_agent
      )
      VALUES (
        ${event.eventId},
        ${event.uuid},
        ${event.scannedAt},
        ${safeScannedAtMs},
        ${event.colo},
        ${event.locationStatus},
        ${event.userLocation?.lat ?? null},
        ${event.userLocation?.lng ?? null},
        ${event.userLocation?.accuracyMeters ?? null},
        ${event.client.userAgent}
      )
      ON CONFLICT(event_id) DO NOTHING;
    `

    this.sockets.message(
      JSON.stringify({
        type: 'scan_recorded',
        event,
      }),
    )

    return { ok: true, eventId: event.eventId }
  }

  async getScans(): Promise<{ ok: true; events: ScanEvent[] }> {
    const rows = this.sql<ScanEventRow>`
      SELECT
        event_id,
        uuid,
        scanned_at,
        scanned_at_ms,
        colo,
        location_status,
        lat,
        lng,
        accuracy_meters,
        user_agent
      FROM scan_events
      ORDER BY scanned_at_ms DESC;
    `

    const events = rows.map(rowToEvent)
    return { ok: true, events }
  }
}
