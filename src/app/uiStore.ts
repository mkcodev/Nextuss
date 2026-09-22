import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PANEL_ORDER, type PanelKey } from './dock/panels'

export type DockZone = 'top' | 'bottom'

interface DockState {
  top: PanelKey | null
  bottom: PanelKey | null
  splitPct: number // % height of the top zone, 0..100
}

type PanelOrderState = Record<DockZone, PanelKey[]>

interface UIState {
  leftCollapsed: boolean
  rightOpen: boolean
  /** Mobile-only bottom-sheet visibility for the dock — independent of `rightOpen`, which is a
   * desktop concept (Alt+L). Not persisted: a drawer should always start closed on reload. */
  mobileDockOpen: boolean
  dock: DockState
  /** Tab strip order — independent per zone. */
  panelOrder: PanelOrderState
  toggleLeft: () => void
  toggleRight: () => void
  openMobileDock: () => void
  closeMobileDock: () => void
  /** Puts `panel` in `zone`. If the other zone already shows it, they swap — a zone is never left empty and no panel is ever shown twice. */
  assignPanel: (zone: DockZone, panel: PanelKey) => void
  setSplitPct: (pct: number) => void
  /** Reorders `zone`'s own tab strip: moves `dragged` to just before/after `target`. */
  movePanel: (zone: DockZone, dragged: PanelKey, target: PanelKey, side: 'before' | 'after') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftCollapsed: false,
      rightOpen: true,
      mobileDockOpen: false,
      dock: { top: 'progress', bottom: 'activity', splitPct: 55 },
      panelOrder: { top: [...DEFAULT_PANEL_ORDER], bottom: [...DEFAULT_PANEL_ORDER] },
      toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
      openMobileDock: () => set({ mobileDockOpen: true }),
      closeMobileDock: () => set({ mobileDockOpen: false }),
      assignPanel: (zone, panel) =>
        set((s) => {
          if (s.dock[zone] === panel) return s
          const other: DockZone = zone === 'top' ? 'bottom' : 'top'
          const next: DockState = { ...s.dock, [zone]: panel }
          if (s.dock[other] === panel) next[other] = s.dock[zone]
          return { dock: next }
        }),
      setSplitPct: (pct) =>
        set((s) => ({ dock: { ...s.dock, splitPct: Math.min(85, Math.max(15, pct)) } })),
      movePanel: (zone, dragged, target, side) =>
        set((s) => {
          if (dragged === target) return s
          const without = s.panelOrder[zone].filter((k) => k !== dragged)
          const targetIndex = without.indexOf(target)
          const insertAt = side === 'before' ? targetIndex : targetIndex + 1
          without.splice(insertAt, 0, dragged)
          return { panelOrder: { ...s.panelOrder, [zone]: without } }
        }),
    }),
    {
      name: 'nextuss-ui-layout',
      version: 4,
      partialize: (state) => {
        const { mobileDockOpen: _mobileDockOpen, ...rest } = state
        return rest
      },
      // v1 stored panelOrder as a single flat array shared by both zones.
      // v3+ reconciles each zone's order against the current panel catalog, so
      // newly added panels (or ones removed) stay in sync for existing users.
      // v4: added the 'insights' panel (Fase 4.8) — bumping forces `migrate` to
      // run again for already-persisted users so it gets merged into their panelOrder.
      migrate: (persisted) => {
        const state = persisted as UIState
        if (!state.panelOrder || Array.isArray(state.panelOrder)) {
          state.panelOrder = { top: [...DEFAULT_PANEL_ORDER], bottom: [...DEFAULT_PANEL_ORDER] }
        }
        for (const zone of ['top', 'bottom'] as DockZone[]) {
          const known = new Set(DEFAULT_PANEL_ORDER)
          const existing = (state.panelOrder[zone] ?? []).filter((k) => known.has(k))
          const missing = DEFAULT_PANEL_ORDER.filter((k) => !existing.includes(k))
          state.panelOrder[zone] = [...existing, ...missing]
        }
        return state
      },
    },
  ),
)
