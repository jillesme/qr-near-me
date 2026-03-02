import { create } from 'zustand'
import {
  acceptInteraction,
  connectInteractionsStream,
  createQrCode,
  getInteractions,
  getQrProfile,
} from '../lib/api'
import { requestUserLocation } from '../lib/location'
import type {
  AcceptInteractionResponse,
  CreateQrCodeResponse,
  GetInteractionsResponse,
  GetQrProfileResponse,
  InteractionEvent,
  LocationStatus,
  QrProfile,
  UserLocation,
} from '../../shared/contracts'

function upsertEvent(events: InteractionEvent[], incoming: InteractionEvent) {
  if (events.some((event) => event.eventId === incoming.eventId)) {
    return events
  }

  return [incoming, ...events]
}

type QrStore = {
  createForm: {
    name: string
    topic: string
    allowColoFallback: boolean
  }
  createStatus: string
  createBusy: boolean
  createdQr: CreateQrCodeResponse | null
  creatorLocation: UserLocation | null
  creatorLocationStatus: LocationStatus
  copyStatus: string | null

  scanProfile: QrProfile | null
  scanStatus: string
  scanBusy: boolean
  scannerLocationRequested: boolean
  scannerLocationStatus: LocationStatus
  scannerLocation: UserLocation | null

  detailProfile: QrProfile | null
  detailEvents: InteractionEvent[]
  detailStatus: string
  detailLoading: boolean
  streamConnected: boolean
  streamSocket: WebSocket | null

  setCreateName: (value: string) => void
  setCreateTopic: (value: string) => void
  setAllowColoFallback: (value: boolean) => void
  setCopyStatus: (value: string | null) => void
  createQr: () => Promise<void>

  loadScanProfile: (uuid: string) => Promise<void>
  requestScannerLocation: () => Promise<void>
  acceptScanInteraction: (uuid: string) => Promise<void>

  loadDetail: (uuid: string) => Promise<void>
  refreshDetailEvents: (uuid: string) => Promise<void>
  connectDetailStream: (uuid: string) => void
  disconnectDetailStream: () => void
}

export const useQrStore = create<QrStore>((set, get) => ({
  createForm: {
    name: '',
    topic: '',
    allowColoFallback: false,
  },
  createStatus: 'Fill in your details to create a QR code.',
  createBusy: false,
  createdQr: null,
  creatorLocation: null,
  creatorLocationStatus: 'unavailable',
  copyStatus: null,

  scanProfile: null,
  scanStatus: 'Loading QR details...',
  scanBusy: false,
  scannerLocationRequested: false,
  scannerLocationStatus: 'unavailable',
  scannerLocation: null,

  detailProfile: null,
  detailEvents: [],
  detailStatus: 'Loading interaction history...',
  detailLoading: true,
  streamConnected: false,
  streamSocket: null,

  setCreateName: (value) =>
    set((state) => ({
      createForm: {
        ...state.createForm,
        name: value,
      },
    })),

  setCreateTopic: (value) =>
    set((state) => ({
      createForm: {
        ...state.createForm,
        topic: value,
      },
    })),

  setAllowColoFallback: (value) =>
    set((state) => ({
      createForm: {
        ...state.createForm,
        allowColoFallback: value,
      },
    })),

  setCopyStatus: (value) => set({ copyStatus: value }),

  createQr: async () => {
    if (get().createBusy) {
      return
    }

    const { name, topic, allowColoFallback } = get().createForm

    set({
      createBusy: true,
      createStatus: 'Requesting your location...',
      createdQr: null,
    })

    const location = await requestUserLocation()
    set({
      creatorLocation: location.userLocation,
      creatorLocationStatus: location.locationStatus,
    })

    if (location.locationStatus !== 'granted') {
      set({
        createBusy: false,
        createStatus:
          'Location permission is required to create a QR code. No QR was created.',
      })
      return
    }

    set({ createStatus: 'Creating QR code...' })

    const response: CreateQrCodeResponse = await createQrCode({
      name,
      topic,
      allowColoFallback,
      creatorLocation: location.userLocation,
      creatorLocationStatus: location.locationStatus,
    }).catch(
      (): CreateQrCodeResponse => ({ ok: false, error: 'Network error' }),
    )

    if (!response.ok || !response.uuid) {
      set({
        createBusy: false,
        createStatus: response.error ?? 'Failed to create QR code.',
      })
      return
    }

    const browserOrigin =
      typeof window === 'undefined' ? '' : window.location.origin
    const normalizedResponse: CreateQrCodeResponse = {
      ok: true,
      uuid: response.uuid,
      scanUrl: `${browserOrigin}/q/${response.uuid}`,
      detailUrl: `${browserOrigin}/qr/${response.uuid}`,
    }

    set({
      createBusy: false,
      createdQr: normalizedResponse,
      createStatus: 'QR created. Share it so someone nearby can scan it.',
    })
  },

  loadScanProfile: async (uuid) => {
    set({
      scanBusy: false,
      scanProfile: null,
      scannerLocationRequested: false,
      scannerLocationStatus: 'unavailable',
      scannerLocation: null,
      scanStatus: 'Loading QR details...',
    })

    const response: GetQrProfileResponse = await getQrProfile(uuid).catch(
      (): GetQrProfileResponse => ({ ok: false, error: 'Network error' }),
    )

    if (!response.ok || !response.profile) {
      set({ scanStatus: response.error ?? 'This QR code does not exist.' })
      return
    }

    set({
      scanProfile: response.profile,
      scanStatus: 'Step 1: share your location. Then tap accept.',
    })
  },

  requestScannerLocation: async () => {
    const profile = get().scanProfile
    if (get().scanBusy || !profile) {
      return
    }

    set({ scanBusy: true, scanStatus: 'Requesting your location...' })
    const result = await requestUserLocation()

    set({
      scanBusy: false,
      scannerLocationRequested: true,
      scannerLocationStatus: result.locationStatus,
      scannerLocation: result.userLocation,
    })

    if (result.locationStatus === 'granted') {
      set({ scanStatus: 'Location captured. Step 2: tap accept interaction.' })
      return
    }

    if (profile.allowColoFallback) {
      set({
        scanStatus:
          'Location unavailable. You can still tap accept and we will try Cloudflare colo fallback.',
      })
      return
    }

    set({
      scanStatus: 'Location is required for this QR code. Please enable location access.',
    })
  },

  acceptScanInteraction: async (uuid) => {
    const state = get()
    if (
      state.scanBusy ||
      !state.scanProfile ||
      !state.scannerLocationRequested
    ) {
      return
    }

    set({ scanBusy: true, scanStatus: 'Checking if you are close enough...' })

    const response: AcceptInteractionResponse = await acceptInteraction({
      uuid,
      scannerLocation: get().scannerLocation,
      scannerLocationStatus: get().scannerLocationStatus,
    }).catch(
      (): AcceptInteractionResponse => ({ ok: false, error: 'Network error' }),
    )

    set({ scanBusy: false })

    if (!response.ok) {
      set({ scanStatus: response.error ?? 'Failed to verify interaction.' })
      return
    }

    if (response.accepted) {
      if (response.decisionMethod === 'gps_distance' && response.distanceMeters != null) {
        set({
          scanStatus: `Accepted. You are ${Math.round(response.distanceMeters)}m away and within 100m.`,
        })
        return
      }

      if (response.decisionMethod === 'colo_fallback') {
        set({ scanStatus: 'Accepted via Cloudflare colo fallback.' })
        return
      }

      set({ scanStatus: 'Accepted.' })
      return
    }

    if (response.reason === 'scanner_too_far') {
      set({
        scanStatus: 'Sorry, you are not close enough to this user to interact with them.',
      })
      return
    }

    if (response.reason === 'scanner_location_required') {
      set({
        scanStatus: 'Location is required for this QR code. Please share your location.',
      })
      return
    }

    if (response.reason === 'colo_mismatch') {
      set({
        scanStatus:
          'Sorry, your Cloudflare network location does not match this user, so interaction is blocked.',
      })
      return
    }

    set({
      scanStatus: 'Sorry, you are not close enough to this user to interact with them.',
    })
  },

  loadDetail: async (uuid) => {
    set({ detailLoading: true, detailStatus: 'Loading interaction history...' })

    const [profileResponse, eventsResponse] = await Promise.all([
      getQrProfile(uuid).catch(
        (): GetQrProfileResponse => ({ ok: false, error: 'Network error' }),
      ),
      getInteractions(uuid).catch(
        (): GetInteractionsResponse => ({ ok: false, error: 'Network error' }),
      ),
    ])

    if (profileResponse.ok && profileResponse.profile) {
      set({ detailProfile: profileResponse.profile })
    }

    if (!eventsResponse.ok || !eventsResponse.events) {
      set({
        detailLoading: false,
        detailStatus: eventsResponse.error ?? 'Failed to load interaction history.',
      })
      return
    }

    set({
      detailEvents: eventsResponse.events,
      detailLoading: false,
      detailStatus:
        eventsResponse.events.length === 0
          ? 'No interactions recorded yet.'
          : 'Loaded interaction history.',
    })
  },

  refreshDetailEvents: async (uuid) => {
    set({ detailLoading: true, detailStatus: 'Refreshing interaction history...' })

    const response: GetInteractionsResponse = await getInteractions(uuid).catch(
      (): GetInteractionsResponse => ({ ok: false, error: 'Network error' }),
    )

    if (!response.ok || !response.events) {
      set({
        detailLoading: false,
        detailStatus: response.error ?? 'Failed to refresh interaction history.',
      })
      return
    }

    set({
      detailEvents: response.events,
      detailLoading: false,
      detailStatus:
        response.events.length === 0
          ? 'No interactions recorded yet.'
          : 'Loaded interaction history.',
    })
  },

  connectDetailStream: (uuid) => {
    get().disconnectDetailStream()
    const socket = connectInteractionsStream(uuid)

    socket.onopen = () => {
      set({ streamConnected: true })
    }

    socket.onmessage = (messageEvent) => {
      const payload = JSON.parse(messageEvent.data as string) as {
        type?: string
        event?: InteractionEvent
      }

      if (payload.type !== 'interaction_recorded' || !payload.event) {
        return
      }

      set((state) => ({
        detailEvents: upsertEvent(state.detailEvents, payload.event as InteractionEvent),
        detailStatus: 'Live updates connected.',
      }))
    }

    socket.onerror = () => {
      set({ detailStatus: 'Live updates error. You can still refresh manually.' })
    }

    socket.onclose = () => {
      set({ streamConnected: false, streamSocket: null })
    }

    set({ streamSocket: socket })
  },

  disconnectDetailStream: () => {
    const socket = get().streamSocket
    if (socket) {
      socket.close()
    }
    set({ streamConnected: false, streamSocket: null })
  },
}))
