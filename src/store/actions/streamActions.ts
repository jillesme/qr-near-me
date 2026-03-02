import { connectInteractionsStream } from '../../lib/api'
import type {
  InteractionDecisionMethod,
  InteractionEvent,
  LocationStatus,
} from '../../../shared/contracts'

const VALID_LOCATION_STATUSES = new Set<LocationStatus>([
  'granted',
  'denied',
  'unavailable',
  'timeout',
  'error',
])

const VALID_DECISION_METHODS = new Set<InteractionDecisionMethod>([
  'gps_distance',
  'colo_fallback',
  'rejected',
])

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isLocationStatus(value: unknown): value is LocationStatus {
  return isString(value) && VALID_LOCATION_STATUSES.has(value as LocationStatus)
}

function isUserLocation(value: unknown): boolean {
  if (!isObject(value)) {
    return false
  }

  return isNumber(value.lat) && isNumber(value.lng) && isNumber(value.accuracyMeters)
}

function isInteractionEvent(value: unknown): value is InteractionEvent {
  if (!isObject(value) || !isObject(value.client)) {
    return false
  }

  const scannerLocation = value.scannerLocation

  return (
    isString(value.eventId) &&
    isString(value.uuid) &&
    isString(value.attemptedAt) &&
    isLocationStatus(value.scannerLocationStatus) &&
    (scannerLocation === null || isUserLocation(scannerLocation)) &&
    (value.scannerColo === null || isString(value.scannerColo)) &&
    typeof value.accepted === 'boolean' &&
    (value.reason === null || isString(value.reason)) &&
    (value.distanceMeters === null || isNumber(value.distanceMeters)) &&
    isString(value.decisionMethod) &&
    VALID_DECISION_METHODS.has(value.decisionMethod as InteractionDecisionMethod) &&
    (value.client.userAgent === null || isString(value.client.userAgent))
  )
}

export function openInteractionsStream(uuid: string): WebSocket {
  return connectInteractionsStream(uuid)
}

export function parseInteractionRecordedEvent(data: unknown): InteractionEvent | null {
  if (typeof data !== 'string') {
    return null
  }

  try {
    const payload = JSON.parse(data) as unknown
    if (!isObject(payload)) {
      return null
    }

    if (payload.type !== 'interaction_recorded' || !isInteractionEvent(payload.event)) {
      return null
    }

    return payload.event
  } catch {
    return null
  }
}
