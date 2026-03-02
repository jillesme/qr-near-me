import { Hono } from 'hono'
import { ScanActor } from './actors/ScanActor'
import { isValidUuid, parseScanCreateRequest } from './lib/validation'
import type { ScanEvent } from './types'

const app = new Hono<{ Bindings: Env }>()

app.post('/api/qr-codes', (c) => {
  const uuid = crypto.randomUUID()
  const baseUrl = new URL(c.req.url).origin

  return c.json({
    ok: true,
    uuid,
    scanUrl: `${baseUrl}/q/${uuid}`,
    detailUrl: `${baseUrl}/qr/${uuid}`,
  })
})

app.post('/api/scans', async (c) => {
  const payload = await c.req.json().catch(() => null)
  const parsed = parseScanCreateRequest(payload)

  if (!parsed) {
    return c.json({ ok: false, error: 'Invalid payload' }, 400)
  }

  const requestWithCf = c.req.raw as Request & { cf?: { colo?: string } }
  const colo = requestWithCf.cf?.colo ?? null
  const userAgent = c.req.header('user-agent') ?? null

  const event: ScanEvent = {
    eventId: crypto.randomUUID(),
    uuid: parsed.uuid,
    scannedAt: new Date().toISOString(),
    colo,
    locationStatus: parsed.locationStatus,
    userLocation: parsed.userLocation,
    client: {
      userAgent,
    },
  }

  const durableObjectId = c.env.SCAN_ACTOR.idFromName(parsed.uuid)
  const durableObject = c.env.SCAN_ACTOR.get(durableObjectId)
  const response = await durableObject.fetch('https://scan-actor/record', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    return c.json({ ok: false, error: 'Failed to persist scan event' }, 500)
  }

  return c.json({ ok: true, eventId: event.eventId })
})

app.get('/api/scans/:uuid', async (c) => {
  const uuid = c.req.param('uuid')

  if (!isValidUuid(uuid)) {
    return c.json({ ok: false, error: 'Invalid UUID' }, 400)
  }

  const durableObjectId = c.env.SCAN_ACTOR.idFromName(uuid)
  const durableObject = c.env.SCAN_ACTOR.get(durableObjectId)
  const response = await durableObject.fetch('https://scan-actor/scans')

  if (!response.ok) {
    return c.json({ ok: false, error: 'Failed to read scan events' }, 500)
  }

  return c.json(await response.json())
})

app.notFound((c) => c.json({ ok: false, error: 'Not found' }, 404))

export default app
export { ScanActor }
