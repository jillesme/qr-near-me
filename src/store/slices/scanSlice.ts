import type { StateCreator } from 'zustand'
import { requestCurrentUserLocation } from '../actions/locationActions'
import {
  fetchQrProfile,
  submitAcceptInteraction,
} from '../actions/qrApiActions'
import { formatApiError } from '../actions/apiErrorMessages'
import type { QrStore, ScanSlice } from '../types'

export const createScanSlice: StateCreator<QrStore, [], [], ScanSlice> = (
  set,
  get,
) => ({
  scanProfile: null,
  scanStatus: 'Loading QR details...',
  scanBusy: false,
  scannerLocationRequested: false,
  scannerLocationStatus: 'unavailable',
  scannerLocation: null,

  loadScanProfile: async (uuid) => {
    set({
      scanBusy: false,
      scanProfile: null,
      scannerLocationRequested: false,
      scannerLocationStatus: 'unavailable',
      scannerLocation: null,
      scanStatus: 'Loading QR details...',
    })

    const response = await fetchQrProfile(uuid)

    if (!response.ok) {
      set({ scanStatus: formatApiError(response.error, 'This QR code does not exist.') })
      return
    }

    set({
      scanProfile: response.data.profile,
      scanStatus: 'Step 1: share your location. Then tap accept.',
    })
  },

  requestScannerLocation: async () => {
    const profile = get().scanProfile
    if (get().scanBusy || !profile) {
      return
    }

    set({ scanBusy: true, scanStatus: 'Requesting your location...' })
    const result = await requestCurrentUserLocation()

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

    const response = await submitAcceptInteraction({
      uuid,
      scannerLocation: get().scannerLocation,
      scannerLocationStatus: get().scannerLocationStatus,
    })

    set({ scanBusy: false })

    if (!response.ok) {
      set({
        scanStatus: formatApiError(response.error, 'Failed to verify interaction.'),
      })
      return
    }

    const result = response.data

    if (result.accepted) {
      if (result.decisionMethod === 'gps_distance' && result.distanceMeters != null) {
        set({
          scanStatus: `Accepted. You are ${Math.round(result.distanceMeters)}m away and within 100m.`,
        })
        return
      }

      if (result.decisionMethod === 'colo_fallback') {
        set({ scanStatus: 'Accepted via Cloudflare colo fallback.' })
        return
      }

      set({ scanStatus: 'Accepted.' })
      return
    }

    if (result.reason === 'scanner_too_far') {
      set({
        scanStatus: 'Sorry, you are not close enough to this user to interact with them.',
      })
      return
    }

    if (result.reason === 'scanner_location_required') {
      set({
        scanStatus: 'Location is required for this QR code. Please share your location.',
      })
      return
    }

    if (result.reason === 'colo_mismatch') {
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
})
