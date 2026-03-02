export type LocationStatus =
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'error'

export type UserLocation = {
  lat: number
  lng: number
  accuracyMeters: number
}

export type CreateQrCodeRequest = {
  name: string
  topic: string
  allowColoFallback: boolean
  creatorLocation: UserLocation | null
  creatorLocationStatus: LocationStatus
}

export type QrProfile = {
  uuid: string
  name: string
  topic: string
  allowColoFallback: boolean
  creatorLocation: UserLocation | null
  creatorLocationStatus: LocationStatus
  creatorColo: string | null
  createdAt: string
}

export type InteractionDecisionMethod =
  | 'gps_distance'
  | 'colo_fallback'
  | 'rejected'

export type InteractionAttemptRequest = {
  scannerLocation: UserLocation | null
  scannerLocationStatus: LocationStatus
  scannerColo: string | null
  userAgent: string | null
  maxDistanceMeters: number
}

export type InteractionEvent = {
  eventId: string
  uuid: string
  attemptedAt: string
  scannerLocationStatus: LocationStatus
  scannerLocation: UserLocation | null
  scannerColo: string | null
  accepted: boolean
  reason: string | null
  distanceMeters: number | null
  decisionMethod: InteractionDecisionMethod
  client: {
    userAgent: string | null
  }
}

export type ApiErrorCode =
  | 'invalid_payload'
  | 'invalid_uuid'
  | 'creator_location_required'
  | 'not_found'
  | 'websocket_upgrade_required'
  | 'network_error'
  | 'invalid_response'
  | 'internal_error'

export type ApiError<Code extends ApiErrorCode = ApiErrorCode> = {
  code: Code
  message: string
}

export type ApiSuccess<Data> = {
  ok: true
  data: Data
}

export type ApiFailure<Code extends ApiErrorCode = ApiErrorCode> = {
  ok: false
  error: ApiError<Code>
}

export type ApiResponse<
  Data,
  Code extends ApiErrorCode = ApiErrorCode,
> = ApiSuccess<Data> | ApiFailure<Code>

export type CreateQrCodeData = {
  uuid: string
  scanUrl: string
  detailUrl: string
}

export type CreateQrCodeResponse = ApiResponse<CreateQrCodeData>

export type GetQrProfileData = {
  profile: QrProfile
}

export type GetQrProfileResponse = ApiResponse<GetQrProfileData>

export type AcceptInteractionRequest = {
  uuid: string
  scannerLocation: UserLocation | null
  scannerLocationStatus: LocationStatus
}

export type AcceptInteractionData = {
  accepted: boolean
  eventId: string
  reason: string | null
  distanceMeters: number | null
  decisionMethod: InteractionDecisionMethod
}

export type AcceptInteractionResponse = ApiResponse<AcceptInteractionData>

export type GetInteractionsData = {
  events: InteractionEvent[]
}

export type GetInteractionsResponse = ApiResponse<GetInteractionsData>
