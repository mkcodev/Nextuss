import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../uiStore'
import { useOverlayStore } from './overlayStore'
import { useListNavStore } from './listNavStore'
import { useDayNavStore } from './dayNavStore'
import { useCaptureRequestStore } from './captureRequestStore'
import { useQuickAddStore } from '../../features/tasks/quickAddStore'
import { useUndoStore } from '../../lib/undoStore'
import { NAV_ITEMS } from '../navItems'
import { ensurePanelVisible } from '../dock/ensurePanelVisible'

const GO_SEQUENCE_WINDOW_MS = 700

// Entradas del acorde "g <letra>" que no son una ruta de NAV_ITEMS (sub-tabs, anclas, etc).
const EXTRA_GO_TARGETS: Record<string, string> = {
  o: '/planificacion?tab=objetivos',
}

const GO_TARGETS: Record<string, string> = {
  ...Object.fromEntries(NAV_ITEMS.map((n) => [n.goKey, n.to])),
  ...EXTRA_GO_TARGETS,
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** Mounted once in AppShell. Owns every global key binding: Alt+H/L, Ctrl/Cmd+K, g-sequences, j/k/Enter/c, ?, Escape. */
export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const pendingGo = useRef(false)
  const goTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const { toggleLeft, toggleRight } = useUIStore.getState()
      const { paletteOpen, helpOpen, togglePalette, closePalette, closeHelp, openHelp } =
        useOverlayStore.getState()

      // Alt+H / Alt+L — sidebar toggles. Modifier-based, safe even while typing.
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyH') {
        e.preventDefault()
        toggleLeft()
        return
      }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyL') {
        e.preventDefault()
        toggleRight()
        return
      }

      // Ctrl/Cmd+K — command palette, works anywhere.
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault()
        togglePalette()
        return
      }

      // Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z — deshacer/rehacer, funciona en cualquier sitio (papelera, drags…).
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault()
        if (e.shiftKey) void useUndoStore.getState().redo()
        else void useUndoStore.getState().undo()
        return
      }

      if (e.key === 'Escape') {
        if (paletteOpen) closePalette()
        if (helpOpen) closeHelp()
        return
      }

      // Everything below is letter-based and must not fire while the user is typing.
      if (isTypingTarget(e.target) || paletteOpen) return

      if (e.key === '?') {
        e.preventDefault()
        openHelp()
        return
      }

      // "i" — quick capture, works from anywhere: surfaces the Captura panel and focuses it.
      if (e.key === 'i') {
        e.preventDefault()
        ensurePanelVisible('capture')
        useCaptureRequestStore.getState().request()
        return
      }

      // "n" — quick-add universal de tareas, works from anywhere.
      if (e.key === 'n') {
        e.preventDefault()
        useQuickAddStore.getState().openQuickAdd()
        return
      }

      if (e.key === 'g' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        pendingGo.current = true
        if (goTimeout.current) clearTimeout(goTimeout.current)
        goTimeout.current = setTimeout(() => {
          pendingGo.current = false
        }, GO_SEQUENCE_WINDOW_MS)
        return
      }

      if (pendingGo.current) {
        const target = GO_TARGETS[e.key]
        pendingGo.current = false
        if (goTimeout.current) clearTimeout(goTimeout.current)
        if (target) {
          e.preventDefault()
          navigate(target)
        }
        return
      }

      // [ / ] / t — navegación entre días, solo mientras la vista Día registra sus handlers.
      if (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === '[' || e.key === ']' || e.key === 't')) {
        const dayNav = useDayNavStore.getState().handlers
        if (dayNav) {
          e.preventDefault()
          if (e.key === '[') dayNav.onPrev()
          else if (e.key === ']') dayNav.onNext()
          else dayNav.onToday()
        }
        return
      }

      const { handlers } = useListNavStore.getState()
      if (e.key === 'j') {
        if (handlers) {
          e.preventDefault()
          handlers.onNext()
        }
        return
      }
      if (e.key === 'k') {
        if (handlers) {
          e.preventDefault()
          handlers.onPrev()
        }
        return
      }
      if (e.key === 'Enter') {
        if (handlers) handlers.onActivate()
        return
      }
      if (e.key === 'c') {
        e.preventDefault()
        if (handlers?.onCreate) {
          handlers.onCreate()
        } else {
          // La tarea es la entidad central: sin lista que registre su propio "crear", `c` abre la
          // captura rápida de tarea (antes caía en el formulario de hábito, incluso en /tareas).
          useQuickAddStore.getState().openQuickAdd()
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (goTimeout.current) clearTimeout(goTimeout.current)
    }
  }, [navigate])
}
