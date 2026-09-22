import { useEffect } from 'react'
import { create } from 'zustand'
import type { ReactNode } from 'react'

interface ContextPanelState {
  title: string | null
  content: ReactNode | null
  set: (title: string, content: ReactNode) => void
  clear: () => void
}

export const useContextPanelStore = create<ContextPanelState>((set) => ({
  title: null,
  content: null,
  set: (title, content) => set({ title, content }),
  clear: () => set({ title: null, content: null }),
}))

/** Pages call this to publish their "Contextual" dock panel content while mounted. */
export function useContextPanel(title: string, content: ReactNode, deps: unknown[]) {
  const set = useContextPanelStore((s) => s.set)
  const clear = useContextPanelStore((s) => s.clear)

  useEffect(() => {
    set(title, content)
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
