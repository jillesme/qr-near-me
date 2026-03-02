import type {
  ApiResponse,
  AcceptInteractionRequest,
  AcceptInteractionResponse,
  InteractionDecisionMethod,
  InteractionEvent,
  LocationStatus,
  CreateQrCodeRequest,
  CreateQrCodeResponse,
  GetInteractionsResponse,
  GetQrProfileResponse,
} from '../../shared/contracts'

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

function isErrorEnvelope(value: unknown): boolean {
  if (!isObject(value) || !isObject(value.error)) {
    return false
  }

  return isString(value.error.code) && isString(value.error.message)
}

function isUserLocation(value: unknown): boolean {
  if (!isObject(value)) {
    return false
  }

  return isNumber(value.lat) && isNumber(value.lng) && isNumber(value.accuracyMeters)
}

function isQrProfile(value: unknown): boolean {
  if (!isObject(value)) {
    return false
  }

  const creatorLocation = value.creatorLocation

  return (
    isString(value.uuid) &&
    isString(value.name) &&
    isString(value.topic) &&
    typeof value.allowColoFallback === 'boolean' &&
    isLocationStatus(value.creatorLocationStatus) &&
    (creatorLocation === null || isUserLocation(creatorLocation)) &&
    (value.creatorColo === null || isString(value.creatorColo)) &&
    isString(value.createdAt)
  )
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

function isApiResponse<Data>(
  value: unknown,
  isValidData: (data: unknown) => data is Data,
): value is ApiResponse<Data> {
  if (!isObject(value) || typeof value.ok !== 'boolean') {
    return false
  }

  if (value.ok) {
    return isValidData((value as { data?: unknown }).data)
  }

  return isErrorEnvelope(value)
}

function errorResponse<T>(
  code: 'network_error' | 'invalid_response',
  message: string,
): T {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  } as T
}

async function requestApi<T extends ApiResponse<unknown>>(
  input: RequestInfo | URL,
  isValidResponse: (payload: unknown) => payload is T,
  init?: RequestInit,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(input, init)
  } catch {
    return errorResponse<T>('network_error', 'Network error.')
  }

  try {
    const payload = (await response.json()) as unknown
    if (!isValidResponse(payload)) {
      return errorResponse<T>('invalid_response', 'Invalid API response format.')
    }

    return payload as T
  } catch {
    return errorResponse<T>('invalid_response', 'Invalid API response format.')
  }
}

export async function createQrCode(
  payload: CreateQrCodeRequest,
): Promise<CreateQrCodeResponse> {
  return requestApi<CreateQrCodeResponse>(
    '/api/qr-codes',
    (value): value is CreateQrCodeResponse =>
      isApiResponse(
        value,
        (data): data is { uuid: string; scanUrl: string; detailUrl: string } =>
          isObject(data) &&
          isString(data.uuid) &&
          isString(data.scanUrl) &&
          isString(data.detailUrl),
      ),
    {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    },
  )
}

export async function getQrProfile(uuid: string): Promise<GetQrProfileResponse> {
  return requestApi<GetQrProfileResponse>(
    `/api/qr-codes/${uuid}`,
    (value): value is GetQrProfileResponse =>
      isApiResponse(
        value,
        (data): data is { profile: unknown } =>
          isObject(data) && isQrProfile(data.profile),
      ),
  )
}

export async function acceptInteraction(
  payload: AcceptInteractionRequest,
): Promise<AcceptInteractionResponse> {
  return requestApi<AcceptInteractionResponse>(
    '/api/interactions/accept',
    (value): value is AcceptInteractionResponse =>
      isApiResponse(
        value,
        (data): data is {
          accepted: boolean
          eventId: string
          reason: string | null
          distanceMeters: number | null
          decisionMethod: InteractionDecisionMethod
        } =>
          isObject(data) &&
          typeof data.accepted === 'boolean' &&
          isString(data.eventId) &&
          (data.reason === null || isString(data.reason)) &&
          (data.distanceMeters === null || isNumber(data.distanceMeters)) &&
          isString(data.decisionMethod) &&
          VALID_DECISION_METHODS.has(data.decisionMethod as InteractionDecisionMethod),
      ),
    {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
    },
  )
}

export async function getInteractions(
  uuid: string,
): Promise<GetInteractionsResponse> {
  return requestApi<GetInteractionsResponse>(
    `/api/interactions/${uuid}`,
    (value): value is GetInteractionsResponse =>
      isApiResponse(
        value,
        (data): data is { events: InteractionEvent[] } =>
          isObject(data) &&
          Array.isArray(data.events) &&
          data.events.every((event) => isInteractionEvent(event)),
      ),
  )
}

export function connectInteractionsStream(uuid: string): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return new WebSocket(
    `${protocol}://${window.location.host}/api/interactions/${uuid}/stream`,
  )
}
