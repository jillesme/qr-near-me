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

export type ScanCreateRequest = {
  uuid: string
  userLocation: UserLocation | null
  locationStatus: LocationStatus
}

export type ScanEvent = {
  eventId: string
  uuid: string
  scannedAt: string
  colo: string | null
  locationStatus: LocationStatus
  userLocation: UserLocation | null
  client: {
    userAgent: string | null
  }
}
