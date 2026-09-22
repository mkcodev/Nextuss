import { create } from 'zustand'

interface OverlayState {
  paletteOpen: boolean
  helpOpen: boolean
  openPalette: () => void
  closePalette: () => void
  togglePalette: () => void
  openHelp: () => void
  closeHelp: () => void
  toggleHelp: () => void
}

/** Transient (non-persisted) visibility for the command palette and shortcuts help modal. */
export const useOverlayStore = create<OverlayState>((set) => ({
  paletteOpen: false,
  helpOpen: false,
  openPalette: () => set({ paletteOpen: true, helpOpen: false }),
  closePalette: () => set({ paletteOpen: false }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen, helpOpen: false })),
  openHelp: () => set({ helpOpen: true, paletteOpen: false }),
  closeHelp: () => set({ helpOpen: false }),
  toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen, paletteOpen: false })),
}))
