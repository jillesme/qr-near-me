import { Actor } from '@cloudflare/actors'
import type { ScanEvent } from '../types'

const EVENTS_KEY = 'events'

export class ScanActor extends Actor<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'POST' && url.pathname === '/record') {
      const event = (await request.json()) as ScanEvent
      const events = await this.getEvents()
      events.push(event)
      await this.storage.raw?.put(EVENTS_KEY, events)

      return Response.json({ ok: true, eventId: event.eventId })
    }

    if (request.method === 'GET' && url.pathname === '/scans') {
      const events = await this.getEvents()
      return Response.json({ ok: true, events })
    }

    return Response.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  private async getEvents(): Promise<ScanEvent[]> {
    const events = await this.storage.raw?.get<ScanEvent[]>(EVENTS_KEY)
    return Array.isArray(events) ? events : []
  }
}
