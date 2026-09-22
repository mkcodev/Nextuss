import { useEffect } from 'react'
import { create } from 'zustand'

export interface ListNavHandlers {
  onNext: () => void
  onPrev: () => void
  onActivate: () => void
  onCreate?: () => void
}

interface ListNavState {
  handlers: ListNavHandlers | null
  register: (handlers: ListNavHandlers) => void
  unregister: () => void
}

/**
 * Registry for the page currently owning j/k/Enter/c list navigation. Only
 * one page's list is ever "focused" for keyboard purposes, so this is a
 * single slot rather than a stack.
 */
export const useListNavStore = create<ListNavState>((set) => ({
  handlers: null,
  register: (handlers) => set({ handlers }),
  unregister: () => set({ handlers: null }),
}))

export function useListNav(handlers: ListNavHandlers | null) {
  const register = useListNavStore((s) => s.register)
  const unregister = useListNavStore((s) => s.unregister)

  useEffect(() => {
    if (!handlers) return
    register(handlers)
    return unregister
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers])
}
