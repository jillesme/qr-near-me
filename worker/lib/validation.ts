import type {
  CreateQrCodeRequest,
  InteractionAttemptRequest,
  LocationStatus,
  UserLocation,
} from '../../shared/contracts'

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const VALID_LOCATION_STATUS = new Set([
  'granted',
  'denied',
  'unavailable',
  'timeout',
  'error',
])

function isLocationStatus(value: unknown): value is LocationStatus {
  return typeof value === 'string' && VALID_LOCATION_STATUS.has(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isValidLocation(value: unknown): value is UserLocation {
  if (!value || typeof value !== 'object') {
    return false
  }

  const location = value as Record<string, unknown>

  if (!isFiniteNumber(location.lat) || location.lat < -90 || location.lat > 90) {
    return false
  }

  if (!isFiniteNumber(location.lng) || location.lng < -180 || location.lng > 180) {
    return false
  }

  if (
    !isFiniteNumber(location.accuracyMeters) ||
    location.accuracyMeters < 0 ||
    location.accuracyMeters > 1_000_000
  ) {
    return false
  }

  return true
}

export function isValidUuid(value: string): boolean {
  return UUID_V4_PATTERN.test(value)
}

export function parseCreateQrCodeRequest(
  payload: unknown,
): CreateQrCodeRequest | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const input = payload as Record<string, unknown>

  if (
    typeof input.name !== 'string' ||
    input.name.trim().length < 1 ||
    input.name.trim().length > 80
  ) {
    return null
  }

  if (
    typeof input.topic !== 'string' ||
    input.topic.trim().length < 1 ||
    input.topic.trim().length > 160
  ) {
    return null
  }

  if (typeof input.allowColoFallback !== 'boolean') {
    return null
  }

  if (!isLocationStatus(input.creatorLocationStatus)) {
    return null
  }

  if (input.creatorLocation !== null && !isValidLocation(input.creatorLocation)) {
    return null
  }

  return {
    name: input.name.trim(),
    topic: input.topic.trim(),
    allowColoFallback: input.allowColoFallback,
    creatorLocation: input.creatorLocation as UserLocation | null,
    creatorLocationStatus: input.creatorLocationStatus,
  }
}

export function parseInteractionAttemptRequest(
  payload: unknown,
):
  | {
      uuid: string
      scannerLocation: InteractionAttemptRequest['scannerLocation']
      scannerLocationStatus: InteractionAttemptRequest['scannerLocationStatus']
    }
  | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const input = payload as Record<string, unknown>

  if (typeof input.uuid !== 'string' || !isValidUuid(input.uuid)) {
    return null
  }

  if (!isLocationStatus(input.scannerLocationStatus)) {
    return null
  }

  if (input.scannerLocation !== null && !isValidLocation(input.scannerLocation)) {
    return null
  }

  return {
    uuid: input.uuid,
    scannerLocation: input.scannerLocation as UserLocation | null,
    scannerLocationStatus: input.scannerLocationStatus,
  }
}
