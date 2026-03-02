import type { InteractionEvent } from '../../../shared/contracts'

export function upsertEvent(
  events: InteractionEvent[],
  incoming: InteractionEvent,
): InteractionEvent[] {
  if (events.some((event) => event.eventId === incoming.eventId)) {
    return events
  }

  return [incoming, ...events]
}
