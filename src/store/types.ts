import type {
  CreateQrCodeData,
  InteractionEvent,
  LocationStatus,
  QrProfile,
  UserLocation,
} from '../../shared/contracts'

export type CreateSlice = {
  createForm: {
    name: string
    topic: string
    allowColoFallback: boolean
  }
  createStatus: string
  createBusy: boolean
  createdQr: CreateQrCodeData | null
  creatorLocation: UserLocation | null
  creatorLocationStatus: LocationStatus
  copyStatus: string | null

  setCreateName: (value: string) => void
  setCreateTopic: (value: string) => void
  setAllowColoFallback: (value: boolean) => void
  setCopyStatus: (value: string | null) => void
  createQr: () => Promise<void>
}

export type ScanSlice = {
  scanProfile: QrProfile | null
  scanStatus: string
  scanBusy: boolean
  scannerLocationRequested: boolean
  scannerLocationStatus: LocationStatus
  scannerLocation: UserLocation | null

  loadScanProfile: (uuid: string) => Promise<void>
  requestScannerLocation: () => Promise<void>
  acceptScanInteraction: (uuid: string) => Promise<void>
}

export type DetailSlice = {
  detailProfile: QrProfile | null
  detailEvents: InteractionEvent[]
  detailStatus: string
  detailLoading: boolean

  loadDetail: (uuid: string) => Promise<void>
  refreshDetailEvents: (uuid: string) => Promise<void>
}

export type StreamSlice = {
  streamConnected: boolean
  streamSocket: WebSocket | null

  connectDetailStream: (uuid: string) => void
  disconnectDetailStream: () => void
}

export type QrStore = CreateSlice & ScanSlice & DetailSlice & StreamSlice
