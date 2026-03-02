import type { ScanCreateRequest, UserLocation } from '../types'

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const VALID_LOCATION_STATUS = new Set([
  'granted',
  'denied',
  'unavailable',
  'timeout',
  'error',
])

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

export function parseScanCreateRequest(payload: unknown): ScanCreateRequest | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const input = payload as Record<string, unknown>

  if (typeof input.uuid !== 'string' || !isValidUuid(input.uuid)) {
    return null
  }

  if (
    typeof input.locationStatus !== 'string' ||
    !VALID_LOCATION_STATUS.has(input.locationStatus)
  ) {
    return null
  }

  if (input.userLocation !== null && !isValidLocation(input.userLocation)) {
    return null
  }

  return {
    uuid: input.uuid,
    userLocation: input.userLocation,
    locationStatus: input.locationStatus as ScanCreateRequest['locationStatus'],
  }
}
