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

export type CreateQrCodeResponse = {
  ok: boolean
  uuid: string
  scanUrl: string
  detailUrl: string
}

export type CreateScanResponse = {
  ok: boolean
  eventId?: string
  error?: string
}

export type GetScansResponse = {
  ok: boolean
  events?: ScanEvent[]
  error?: string
}
