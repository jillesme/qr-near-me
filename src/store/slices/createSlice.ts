import type { StateCreator } from 'zustand'
import { requestCurrentUserLocation } from '../actions/locationActions'
import { submitCreateQrCode } from '../actions/qrApiActions'
import { formatApiError } from '../actions/apiErrorMessages'
import type { QrStore, CreateSlice } from '../types'

export const createCreateSlice: StateCreator<QrStore, [], [], CreateSlice> = (
  set,
  get,
) => ({
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

    const location = await requestCurrentUserLocation()
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

    const response = await submitCreateQrCode({
      name,
      topic,
      allowColoFallback,
      creatorLocation: location.userLocation,
      creatorLocationStatus: location.locationStatus,
    })

    if (!response.ok) {
      set({
        createBusy: false,
        createStatus: formatApiError(response.error, 'Failed to create QR code.'),
      })
      return
    }

    set({
      createBusy: false,
      createdQr: response.data,
      createStatus: 'QR created. Share it so someone nearby can scan it.',
    })
  },
})
