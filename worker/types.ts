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
