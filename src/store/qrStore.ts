import { create } from 'zustand'
import { createCreateSlice } from './slices/createSlice'
import { createDetailSlice } from './slices/detailSlice'
import { createScanSlice } from './slices/scanSlice'
import { createStreamSlice } from './slices/streamSlice'
import type { QrStore } from './types'

export const useQrStore = create<QrStore>()((...args) => ({
  ...createCreateSlice(...args),
  ...createScanSlice(...args),
  ...createDetailSlice(...args),
  ...createStreamSlice(...args),
}))
