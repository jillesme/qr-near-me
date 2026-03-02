import type { StateCreator } from 'zustand'
import { formatApiError } from '../actions/apiErrorMessages'
import { fetchInteractions, fetchQrProfile } from '../actions/qrApiActions'
import type { DetailSlice, QrStore } from '../types'

export const createDetailSlice: StateCreator<QrStore, [], [], DetailSlice> = (
  set,
) => ({
  detailProfile: null,
  detailEvents: [],
  detailStatus: 'Loading interaction history...',
  detailLoading: true,

  loadDetail: async (uuid) => {
    set({
      detailProfile: null,
      detailEvents: [],
      detailLoading: true,
      detailStatus: 'Loading interaction history...',
    })

    const [profileResponse, eventsResponse] = await Promise.all([
      fetchQrProfile(uuid),
      fetchInteractions(uuid),
    ])

    if (profileResponse.ok) {
      set({ detailProfile: profileResponse.data.profile })
    }

    if (!eventsResponse.ok) {
      set({
        detailLoading: false,
        detailStatus: formatApiError(
          eventsResponse.error,
          'Failed to load interaction history.',
        ),
      })
      return
    }

    const events = eventsResponse.data.events

    set({
      detailEvents: events,
      detailLoading: false,
      detailStatus:
        events.length === 0
          ? 'No interactions recorded yet.'
          : 'Loaded interaction history.',
    })
  },

  refreshDetailEvents: async (uuid) => {
    set({ detailLoading: true, detailStatus: 'Refreshing interaction history...' })

    const response = await fetchInteractions(uuid)

    if (!response.ok) {
      set({
        detailLoading: false,
        detailStatus: formatApiError(
          response.error,
          'Failed to refresh interaction history.',
        ),
      })
      return
    }

    const events = response.data.events

    set({
      detailEvents: events,
      detailLoading: false,
      detailStatus:
        events.length === 0
          ? 'No interactions recorded yet.'
          : 'Loaded interaction history.',
    })
  },
})
