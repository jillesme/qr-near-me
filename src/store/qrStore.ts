import { create } from 'zustand'
import { connectScansStream, getScans, postScan } from '../lib/api'
import { requestUserLocation } from '../lib/location'
import type { GetScansResponse, ScanEvent } from '../types/scan'

function createUuid() {
  return crypto.randomUUID()
}

function upsertEvent(events: ScanEvent[], next: ScanEvent): ScanEvent[] {
  if (events.some((event) => event.eventId === next.eventId)) {
    return events
  }

  return [...events, next]
}

type QrStore = {
  uuid: string
  scanStatus: string
  scanBusy: boolean
  detailStatus: string
  detailLoading: boolean
  streamConnected: boolean
  events: ScanEvent[]
  setUuid: (uuid: string) => void
  regenerateUuid: () => void
  completeScan: (uuid: string) => Promise<void>
  loadScans: (uuid: string) => Promise<void>
  connectStream: (uuid: string) => void
  disconnectStream: () => void
  streamSocket: WebSocket | null
}

export const useQrStore = create<QrStore>((set, get) => ({
  uuid: createUuid(),
  scanStatus: 'Ready to request location and record this scan.',
  scanBusy: false,
  detailStatus: 'Loading scan history...',
  detailLoading: false,
  streamConnected: false,
  events: [],
  streamSocket: null,
  setUuid: (uuid) => set({ uuid }),
  regenerateUuid: () => set({ uuid: createUuid() }),
  completeScan: async (uuid) => {
    if (get().scanBusy) {
      return
    }

    set({ scanBusy: true, scanStatus: 'Requesting location permission...' })

    const location = await requestUserLocation()
    set({ scanStatus: 'Recording scan event...' })

    const response = await postScan({
      uuid,
      userLocation: location.userLocation,
      locationStatus: location.locationStatus,
    }).catch(() => ({ ok: false, error: 'Network error' }))

    if (!response.ok) {
      set({
        scanBusy: false,
        scanStatus: `Failed to record scan: ${response.error ?? 'Unknown error'}`,
      })
      return
    }

    if (location.locationStatus === 'granted') {
      set({
        scanBusy: false,
        scanStatus: 'Scan recorded with browser location and Cloudflare colo.',
      })
      return
    }

    set({
      scanBusy: false,
      scanStatus: `Scan recorded without precise browser location (${location.locationStatus}).`,
    })
  },
  loadScans: async (uuid) => {
    set({ detailLoading: true, detailStatus: 'Loading scan history...' })

    const response: GetScansResponse = await getScans(uuid).catch(() => ({
      ok: false,
      error: 'Network error',
    }))

    if (!response.ok) {
      set({
        detailLoading: false,
        detailStatus: `Failed to load scans: ${response.error ?? 'Unknown error'}`,
      })
      return
    }

    const events = response.events ?? []
    set({
      events,
      detailLoading: false,
      detailStatus: events.length === 0 ? 'No scans recorded yet.' : 'Loaded scans.',
    })
  },
  connectStream: (uuid) => {
    get().disconnectStream()

    const socket = connectScansStream(uuid)

    socket.onopen = () => {
      set({ streamConnected: true })
    }

    socket.onmessage = (messageEvent) => {
      const payload = JSON.parse(messageEvent.data as string) as {
        type?: string
        event?: ScanEvent
      }

      if (payload.type !== 'scan_recorded' || !payload.event) {
        return
      }

      set((state) => ({
        events: upsertEvent(state.events, payload.event as ScanEvent),
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
  disconnectStream: () => {
    const socket = get().streamSocket
    if (socket) {
      socket.close()
    }

    set({ streamConnected: false, streamSocket: null })
  },
}))
