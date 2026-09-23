import { useEffect } from 'react'
import { create } from 'zustand'

interface PageTitleState {
  title: string | null
  set: (title: string) => void
  clear: () => void
}

export const usePageTitleStore = create<PageTitleState>((set) => ({
  title: null,
  set: (title) => set({ title }),
  clear: () => set({ title: null }),
}))

/** Pages call this to override the navbar breadcrumb label while mounted (e.g. a navigated date). */
export function usePageTitle(title: string | null, deps: unknown[]) {
  const set = usePageTitleStore((s) => s.set)
  const clear = usePageTitleStore((s) => s.clear)

  useEffect(() => {
    if (title) set(title)
    else clear()
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
