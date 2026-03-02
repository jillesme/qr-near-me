import { Actor } from '@cloudflare/actors'
import type {
  ApiFailure,
  CreateQrCodeRequest,
  InteractionAttemptRequest,
  InteractionDecisionMethod,
  InteractionEvent,
  LocationStatus,
  QrProfile,
  UserLocation,
} from '../../shared/contracts'

type QrProfileRow = {
  uuid: string
  name: string
  topic: string
  allow_colo_fallback: number
  creator_location_status: LocationStatus
  creator_lat: number | null
  creator_lng: number | null
  creator_accuracy_meters: number | null
  creator_colo: string | null
  created_at: string
}

type InteractionEventRow = {
  event_id: string
  uuid: string
  attempted_at: string
  attempted_at_ms: number
  scanner_location_status: LocationStatus
  scanner_lat: number | null
  scanner_lng: number | null
  scanner_accuracy_meters: number | null
  scanner_colo: string | null
  accepted: number
  reason: string | null
  distance_meters: number | null
  decision_method: InteractionDecisionMethod
  user_agent: string | null
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as Record<string, unknown>
}

function asLocation(value: unknown): UserLocation | null {
  const location = asObject(value)
  if (!location) {
    return null
  }

  if (
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number' ||
    typeof location.accuracyMeters !== 'number'
  ) {
    return null
  }

  return {
    lat: location.lat,
    lng: location.lng,
    accuracyMeters: location.accuracyMeters,
  }
}

function parseCreatePayload(payload: unknown): {
  uuid: string
  profile: CreateQrCodeRequest
  creatorColo: string | null
} | null {
  const data = asObject(payload)
  if (!data) {
    return null
  }

  const profile = asObject(data.profile)
  if (!profile || typeof data.uuid !== 'string') {
    return null
  }

  if (
    typeof profile.name !== 'string' ||
    typeof profile.topic !== 'string' ||
    typeof profile.allowColoFallback !== 'boolean' ||
    typeof profile.creatorLocationStatus !== 'string'
  ) {
    return null
  }

  const creatorLocation =
    profile.creatorLocation === null ? null : asLocation(profile.creatorLocation)
  if (profile.creatorLocation !== null && !creatorLocation) {
    return null
  }

  return {
    uuid: data.uuid,
    creatorColo: typeof data.creatorColo === 'string' ? data.creatorColo : null,
    profile: {
      name: profile.name,
      topic: profile.topic,
      allowColoFallback: profile.allowColoFallback,
      creatorLocation,
      creatorLocationStatus: profile.creatorLocationStatus as LocationStatus,
    },
  }
}

function parseAttemptPayload(payload: unknown): InteractionAttemptRequest | null {
  const data = asObject(payload)
  if (!data) {
    return null
  }

  if (
    typeof data.scannerLocationStatus !== 'string' ||
    typeof data.maxDistanceMeters !== 'number'
  ) {
    return null
  }

  const scannerLocation =
    data.scannerLocation === null ? null : asLocation(data.scannerLocation)
  if (data.scannerLocation !== null && !scannerLocation) {
    return null
  }

  return {
    scannerLocation,
    scannerLocationStatus: data.scannerLocationStatus as LocationStatus,
    scannerColo: typeof data.scannerColo === 'string' ? data.scannerColo : null,
    userAgent: typeof data.userAgent === 'string' ? data.userAgent : null,
    maxDistanceMeters: data.maxDistanceMeters,
  }
}

function rowToProfile(row: QrProfileRow): QrProfile {
  return {
    uuid: row.uuid,
    name: row.name,
    topic: row.topic,
    allowColoFallback: row.allow_colo_fallback === 1,
    creatorLocationStatus: row.creator_location_status,
    creatorLocation:
      row.creator_lat !== null &&
      row.creator_lng !== null &&
      row.creator_accuracy_meters !== null
        ? {
            lat: row.creator_lat,
            lng: row.creator_lng,
            accuracyMeters: row.creator_accuracy_meters,
          }
        : null,
    creatorColo: row.creator_colo,
    createdAt: row.created_at,
  }
}

function rowToInteractionEvent(row: InteractionEventRow): InteractionEvent {
  return {
    eventId: row.event_id,
    uuid: row.uuid,
    attemptedAt: row.attempted_at,
    scannerLocationStatus: row.scanner_location_status,
    scannerLocation:
      row.scanner_lat !== null &&
      row.scanner_lng !== null &&
      row.scanner_accuracy_meters !== null
        ? {
            lat: row.scanner_lat,
            lng: row.scanner_lng,
            accuracyMeters: row.scanner_accuracy_meters,
          }
        : null,
    scannerColo: row.scanner_colo,
    accepted: row.accepted === 1,
    reason: row.reason,
    distanceMeters: row.distance_meters,
    decisionMethod: row.decision_method,
    client: {
      userAgent: row.user_agent,
    },
  }
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function distanceMeters(a: UserLocation, b: UserLocation): number {
  const earthRadiusMeters = 6_371_000
  const latDelta = toRadians(b.lat - a.lat)
  const lngDelta = toRadians(b.lng - a.lng)
  const latA = toRadians(a.lat)
  const latB = toRadians(b.lat)

  const h =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2)

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return earthRadiusMeters * c
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
    void this.sql`
      CREATE TABLE IF NOT EXISTS qr_profiles (
        uuid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        topic TEXT NOT NULL,
        allow_colo_fallback INTEGER NOT NULL,
        creator_location_status TEXT NOT NULL,
        creator_lat REAL,
        creator_lng REAL,
        creator_accuracy_meters REAL,
        creator_colo TEXT,
        created_at TEXT NOT NULL
      );
    `

    void this.sql`
      CREATE TABLE IF NOT EXISTS interaction_events (
        event_id TEXT PRIMARY KEY,
        uuid TEXT NOT NULL,
        attempted_at TEXT NOT NULL,
        attempted_at_ms INTEGER NOT NULL,
        scanner_location_status TEXT NOT NULL,
        scanner_lat REAL,
        scanner_lng REAL,
        scanner_accuracy_meters REAL,
        scanner_colo TEXT,
        accepted INTEGER NOT NULL,
        reason TEXT,
        distance_meters REAL,
        decision_method TEXT NOT NULL,
        user_agent TEXT
      );
    `

    void this.sql`
      CREATE INDEX IF NOT EXISTS idx_interaction_events_time
      ON interaction_events (attempted_at_ms DESC);
    `
  }

  async createQrProfile(
    payload: unknown,
  ): Promise<{ ok: true } | ApiFailure<'invalid_payload'>> {
    const parsed = parseCreatePayload(payload)
    if (!parsed) {
      return {
        ok: false,
        error: {
          code: 'invalid_payload',
          message: 'Invalid QR profile payload.',
        },
      }
    }

    const createdAt = new Date().toISOString()

    void this.sql`
      INSERT INTO qr_profiles (
        uuid,
        name,
        topic,
        allow_colo_fallback,
        creator_location_status,
        creator_lat,
        creator_lng,
        creator_accuracy_meters,
        creator_colo,
        created_at
      ) VALUES (
        ${parsed.uuid},
        ${parsed.profile.name},
        ${parsed.profile.topic},
        ${parsed.profile.allowColoFallback ? 1 : 0},
        ${parsed.profile.creatorLocationStatus},
        ${parsed.profile.creatorLocation?.lat ?? null},
        ${parsed.profile.creatorLocation?.lng ?? null},
        ${parsed.profile.creatorLocation?.accuracyMeters ?? null},
        ${parsed.creatorColo},
        ${createdAt}
      )
      ON CONFLICT(uuid) DO NOTHING;
    `

    return { ok: true }
  }

  async getQrProfile(): Promise<{ ok: true; profile: QrProfile | null }> {
    const rows = this.sql<QrProfileRow>`
      SELECT
        uuid,
        name,
        topic,
        allow_colo_fallback,
        creator_location_status,
        creator_lat,
        creator_lng,
        creator_accuracy_meters,
        creator_colo,
        created_at
      FROM qr_profiles
      LIMIT 1;
    `

    if (rows.length === 0) {
      return { ok: true, profile: null }
    }

    return { ok: true, profile: rowToProfile(rows[0]) }
  }

  async attemptInteraction(payload: unknown): Promise<
    | ApiFailure<'invalid_payload' | 'not_found'>
    | {
        ok: true
        data: {
          accepted: boolean
          eventId: string
          reason: string | null
          distanceMeters: number | null
          decisionMethod: InteractionDecisionMethod
        }
      }
  > {
    const attempt = parseAttemptPayload(payload)
    if (!attempt) {
      return {
        ok: false,
        error: {
          code: 'invalid_payload',
          message: 'Invalid interaction payload.',
        },
      }
    }

    const profileResponse = await this.getQrProfile()
    if (!profileResponse.profile) {
      return {
        ok: false,
        error: {
          code: 'not_found',
          message: 'QR code not found.',
        },
      }
    }

    const profile = profileResponse.profile

    let accepted = false
    let reason: string | null = null
    let computedDistance: number | null = null
    let decisionMethod: InteractionDecisionMethod = 'rejected'

    if (profile.creatorLocation && attempt.scannerLocation) {
      computedDistance = distanceMeters(profile.creatorLocation, attempt.scannerLocation)
      if (computedDistance <= attempt.maxDistanceMeters) {
        accepted = true
        decisionMethod = 'gps_distance'
      } else {
        reason = 'scanner_too_far'
      }
    } else if (profile.allowColoFallback) {
      if (
        profile.creatorColo &&
        attempt.scannerColo &&
        profile.creatorColo === attempt.scannerColo
      ) {
        accepted = true
        decisionMethod = 'colo_fallback'
      } else {
        reason = 'colo_mismatch'
      }
    } else {
      reason = 'scanner_location_required'
    }

    const attemptedAt = new Date().toISOString()
    const eventId = crypto.randomUUID()

    void this.sql`
      INSERT INTO interaction_events (
        event_id,
        uuid,
        attempted_at,
        attempted_at_ms,
        scanner_location_status,
        scanner_lat,
        scanner_lng,
        scanner_accuracy_meters,
        scanner_colo,
        accepted,
        reason,
        distance_meters,
        decision_method,
        user_agent
      ) VALUES (
        ${eventId},
        ${profile.uuid},
        ${attemptedAt},
        ${Date.parse(attemptedAt)},
        ${attempt.scannerLocationStatus},
        ${attempt.scannerLocation?.lat ?? null},
        ${attempt.scannerLocation?.lng ?? null},
        ${attempt.scannerLocation?.accuracyMeters ?? null},
        ${attempt.scannerColo},
        ${accepted ? 1 : 0},
        ${reason},
        ${computedDistance},
        ${decisionMethod},
        ${attempt.userAgent}
      );
    `

    const event: InteractionEvent = {
      eventId,
      uuid: profile.uuid,
      attemptedAt,
      scannerLocationStatus: attempt.scannerLocationStatus,
      scannerLocation: attempt.scannerLocation,
      scannerColo: attempt.scannerColo,
      accepted,
      reason,
      distanceMeters: computedDistance,
      decisionMethod,
      client: {
        userAgent: attempt.userAgent,
      },
    }

    this.sockets.message(
      JSON.stringify({
        type: 'interaction_recorded',
        event,
      }),
    )

    return {
      ok: true,
      data: {
        accepted,
        eventId,
        reason,
        distanceMeters: computedDistance,
        decisionMethod,
      },
    }
  }

  async getInteractions(): Promise<{ ok: true; events: InteractionEvent[] }> {
    const rows = this.sql<InteractionEventRow>`
      SELECT
        event_id,
        uuid,
        attempted_at,
        attempted_at_ms,
        scanner_location_status,
        scanner_lat,
        scanner_lng,
        scanner_accuracy_meters,
        scanner_colo,
        accepted,
        reason,
        distance_meters,
        decision_method,
        user_agent
      FROM interaction_events
      ORDER BY attempted_at_ms DESC;
    `

    return {
      ok: true,
      events: rows.map(rowToInteractionEvent),
    }
  }
}
