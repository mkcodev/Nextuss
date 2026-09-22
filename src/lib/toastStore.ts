import { create } from 'zustand'
import type { IconKey } from '../design/icons'

export interface Toast {
  id: number
  title: string
  description?: string
  icon?: IconKey
  variant?: 'default' | 'celebrate' | 'success' | 'warning' | 'error'
  /** Si se da, el toast se vuelve una acción: al hacer click se llama y luego se descarta. */
  onClick?: () => void
  /** No se auto-descarta a los 4s — para toasts con `onClick` que el usuario debe poder ver hasta que actúe. */
  sticky?: boolean
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    if (!toast.sticky) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, 4000)
    }
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
