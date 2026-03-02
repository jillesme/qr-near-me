import { create } from 'zustand'

function createUuid() {
  return crypto.randomUUID()
}

type QrStore = {
  uuid: string
  setUuid: (uuid: string) => void
  regenerateUuid: () => void
}

export const useQrStore = create<QrStore>((set) => ({
  uuid: createUuid(),
  setUuid: (uuid) => set({ uuid }),
  regenerateUuid: () => set({ uuid: createUuid() }),
}))
