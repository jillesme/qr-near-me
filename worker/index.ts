import { Hono } from 'hono'
import { ScanActor } from './actors/ScanActor'
import type { ApiErrorCode } from '../shared/contracts'
import {
  isValidUuid,
  parseCreateQrCodeRequest,
  parseInteractionAttemptRequest,
} from './lib/validation'

const app = new Hono<{ Bindings: Env }>()

const MAX_DISTANCE_METERS = 100

function ok<Data>(data: Data) {
  return { ok: true as const, data }
}

function fail<Code extends ApiErrorCode>(code: Code, message: string) {
  return {
    ok: false as const,
    error: {
      code,
      message,
    },
  }
}

app.post('/api/qr-codes', async (c) => {
  const payload = await c.req.json().catch(() => null)
  const parsed = parseCreateQrCodeRequest(payload)

  if (!parsed) {
    return c.json(fail('invalid_payload', 'Invalid payload.'), 400)
  }

  if (parsed.creatorLocationStatus !== 'granted' && !parsed.allowColoFallback) {
    return c.json(
      fail(
        'creator_location_required',
        'Creator location is required unless colo fallback is enabled.',
      ),
      400,
    )
  }

  const uuid = crypto.randomUUID()
  const baseUrl = new URL(c.req.url).origin
  const requestWithCf = c.req.raw as Request & { cf?: { colo?: string } }
  const creatorColo = requestWithCf.cf?.colo ?? null

  const durableObject = c.env.SCAN_ACTOR.getByName(uuid)
  const createResponse = await durableObject.createQrProfile({
    uuid,
    profile: parsed,
    creatorColo,
  })

  if (!createResponse.ok) {
    return c.json(fail('internal_error', 'Failed to create QR code.'), 500)
  }

  return c.json(
    ok({
      uuid,
      scanUrl: `${baseUrl}/q/${uuid}`,
      detailUrl: `${baseUrl}/qr/${uuid}`,
    }),
  )
})

app.get('/api/qr-codes/:uuid', async (c) => {
  const uuid = c.req.param('uuid')

  if (!isValidUuid(uuid)) {
    return c.json(fail('invalid_uuid', 'Invalid UUID.'), 400)
  }

  const durableObject = c.env.SCAN_ACTOR.getByName(uuid)
  const response = await durableObject.getQrProfile()

  if (!response.profile) {
    return c.json(fail('not_found', 'QR code not found.'), 404)
  }

  return c.json(ok({ profile: response.profile }))
})

app.post('/api/interactions/accept', async (c) => {
  const payload = await c.req.json().catch(() => null)
  const parsed = parseInteractionAttemptRequest(payload)

  if (!parsed) {
    return c.json(fail('invalid_payload', 'Invalid payload.'), 400)
  }

  const requestWithCf = c.req.raw as Request & { cf?: { colo?: string } }
  const scannerColo = requestWithCf.cf?.colo ?? null
  const userAgent = c.req.header('user-agent') ?? null

  const durableObject = c.env.SCAN_ACTOR.getByName(parsed.uuid)
  const response = await durableObject.attemptInteraction({
    scannerLocation: parsed.scannerLocation,
    scannerLocationStatus: parsed.scannerLocationStatus,
    scannerColo,
    userAgent,
    maxDistanceMeters: MAX_DISTANCE_METERS,
  })

  if (!response.ok) {
    if (response.error.code === 'not_found') {
      return c.json(fail('not_found', response.error.message), 404)
    }

    return c.json(fail('internal_error', 'Failed to evaluate interaction.'), 500)
  }

  return c.json(ok(response.data))
})

app.get('/api/interactions/:uuid', async (c) => {
  const uuid = c.req.param('uuid')

  if (!isValidUuid(uuid)) {
    return c.json(fail('invalid_uuid', 'Invalid UUID.'), 400)
  }

  const durableObject = c.env.SCAN_ACTOR.getByName(uuid)
  const response = await durableObject.getInteractions()
  return c.json(ok({ events: response.events }))
})

app.get('/api/interactions/:uuid/stream', async (c) => {
  const uuid = c.req.param('uuid')

  if (!isValidUuid(uuid)) {
    return c.json(fail('invalid_uuid', 'Invalid UUID.'), 400)
  }

  if (c.req.header('upgrade') !== 'websocket') {
    return c.json(
      fail('websocket_upgrade_required', 'Expected websocket upgrade.'),
      426,
    )
  }

  const durableObject = c.env.SCAN_ACTOR.getByName(uuid)
  const upstreamRequest = new Request('https://scan-actor/stream', c.req.raw)
  return durableObject.fetch(upstreamRequest)
})

app.notFound((c) => c.json(fail('not_found', 'Not found.'), 404))

export default app
export { ScanActor }
