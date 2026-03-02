import type { StateCreator } from 'zustand'
import {
  openInteractionsStream,
  parseInteractionRecordedEvent,
} from '../actions/streamActions'
import type { QrStore, StreamSlice } from '../types'
import { upsertEvent } from '../utils/events'

const RECONNECT_BASE_DELAY_MS = 500
const RECONNECT_MAX_DELAY_MS = 10_000
const RECONNECT_JITTER_RATIO = 0.3

function nextReconnectDelay(attempt: number): number {
  const exponential = Math.min(
    RECONNECT_MAX_DELAY_MS,
    RECONNECT_BASE_DELAY_MS * 2 ** attempt,
  )
  const jitterRange = exponential * RECONNECT_JITTER_RATIO
  const jitter = (Math.random() * 2 - 1) * jitterRange
  return Math.max(0, Math.round(exponential + jitter))
}

export const createStreamSlice: StateCreator<QrStore, [], [], StreamSlice> = (
  set,
  get,
) => {
  let reconnectTimerId: number | null = null
  let reconnectAttempt = 0
  let reconnectEnabled = false
  let activeUuid: string | null = null
  let streamSessionId = 0

  const clearReconnectTimer = () => {
    if (reconnectTimerId !== null) {
      window.clearTimeout(reconnectTimerId)
      reconnectTimerId = null
    }
  }

  const scheduleReconnect = (sessionId: number) => {
    if (!reconnectEnabled || !activeUuid || sessionId !== streamSessionId) {
      return
    }

    const delay = nextReconnectDelay(reconnectAttempt)
    reconnectAttempt += 1
    clearReconnectTimer()

    set({ detailStatus: 'Live updates disconnected. Reconnecting...' })

    reconnectTimerId = window.setTimeout(() => {
      if (!reconnectEnabled || !activeUuid || sessionId !== streamSessionId) {
        return
      }

      openSocket(sessionId)
    }, delay)
  }

  const openSocket = (sessionId: number) => {
    if (!activeUuid || sessionId !== streamSessionId) {
      return
    }

    const socket = openInteractionsStream(activeUuid)
    set({ streamSocket: socket, streamConnected: false })

    socket.onopen = () => {
      if (sessionId !== streamSessionId) {
        socket.close()
        return
      }

      reconnectAttempt = 0
      clearReconnectTimer()
      set({ streamConnected: true })
    }

    socket.onmessage = (messageEvent) => {
      if (sessionId !== streamSessionId) {
        return
      }

      const event = parseInteractionRecordedEvent(messageEvent.data)
      if (!event) {
        return
      }

      set((state) => ({
        detailEvents: upsertEvent(state.detailEvents, event),
        detailStatus: 'Live updates connected.',
      }))
    }

    socket.onerror = () => {
      if (sessionId !== streamSessionId) {
        return
      }

      set({ detailStatus: 'Live updates error. Reconnecting automatically...' })
    }

    socket.onclose = () => {
      if (sessionId !== streamSessionId) {
        return
      }

      set({ streamConnected: false, streamSocket: null })
      scheduleReconnect(sessionId)
    }
  }

  return {
    streamConnected: false,
    streamSocket: null,

    connectDetailStream: (uuid) => {
      get().disconnectDetailStream()

      reconnectEnabled = true
      reconnectAttempt = 0
      activeUuid = uuid
      streamSessionId += 1

      set({ detailStatus: 'Connecting live updates...' })
      openSocket(streamSessionId)
    },

    disconnectDetailStream: () => {
      reconnectEnabled = false
      activeUuid = null
      reconnectAttempt = 0
      streamSessionId += 1
      clearReconnectTimer()

      const socket = get().streamSocket
      if (socket) {
        socket.onopen = null
        socket.onmessage = null
        socket.onerror = null
        socket.onclose = null
        socket.close()
      }

      set({ streamConnected: false, streamSocket: null })
    },
  }
}
