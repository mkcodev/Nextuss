import { create } from 'zustand'

interface CaptureRequestState {
  requestId: number
  request: () => void
}

/** Bumped by the global "i" shortcut; CapturePanel watches it to focus its textarea. */
export const useCaptureRequestStore = create<CaptureRequestState>((set) => ({
  requestId: 0,
  request: () => set((s) => ({ requestId: s.requestId + 1 })),
}))
