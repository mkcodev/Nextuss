import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { ChevronsDown, ChevronsUp, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useUIStore, type DockZone } from '../uiStore'
import { PANEL_REGISTRY, type PanelKey } from './panels'
import { SectionErrorBoundary } from '../../design/primitives'
import { cn } from '../../lib/cn'

const DRAG_MIME = 'application/x-nextuss-panel-order'
const SPLIT_MIN = 8
const SPLIT_MAX = 92

interface DropTarget {
  key: PanelKey
  side: 'before' | 'after'
}

/** The row of panel icons. Click selects the panel for this zone; drag reorders the icons horizontally — each zone keeps its own independent order. */
function PanelTabs({
  zone,
  activeKey,
  onSelect,
  idBase,
}: {
  zone: DockZone
  activeKey: PanelKey | null
  onSelect: (key: PanelKey) => void
  idBase: string
}) {
  const order = useUIStore((s) => s.panelOrder[zone])
  const movePanel = useUIStore((s) => s.movePanel)
  const [draggedKey, setDraggedKey] = useState<PanelKey | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const handleDragStart = (e: ReactDragEvent<HTMLButtonElement>, key: PanelKey) => {
    e.dataTransfer.setData(DRAG_MIME, key)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedKey(key)
  }

  const handleDragEnd = () => {
    setDraggedKey(null)
    setDropTarget(null)
  }

  const handleDragOver = (e: ReactDragEvent<HTMLButtonElement>, key: PanelKey) => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (key === draggedKey) {
      setDropTarget(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const side: DropTarget['side'] = e.clientX - rect.left < rect.width / 2 ? 'before' : 'after'
    setDropTarget({ key, side })
  }

  const handleDrop = (e: ReactDragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    const dragged = e.dataTransfer.getData(DRAG_MIME) as PanelKey
    if (dragged && dropTarget && dropTarget.key !== dragged) {
      movePanel(zone, dragged, dropTarget.key, dropTarget.side)
    }
    setDraggedKey(null)
    setDropTarget(null)
  }

  // Pestañas ARIA: flechas mueven y seleccionan, Inicio/Fin a los extremos; Alt+flechas reordena
  // (alternativa de teclado al arrastre), igual que en el resto de listas (Fase 19).
  const listRef = useRef<HTMLDivElement>(null)
  const focusTab = (key: PanelKey) =>
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>(`[data-panel="${key}"]`)?.focus())
  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, key: PanelKey) => {
    const i = order.indexOf(key)
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (dir && e.altKey) {
      const target = order[i + dir]
      if (!target) return
      e.preventDefault()
      movePanel(zone, key, target, dir > 0 ? 'after' : 'before')
      focusTab(key)
      return
    }
    let next: PanelKey | undefined
    if (dir) next = order[(i + dir + order.length) % order.length]
    else if (e.key === 'Home') next = order[0]
    else if (e.key === 'End') next = order[order.length - 1]
    if (!next) return
    e.preventDefault()
    onSelect(next)
    focusTab(next)
  }
  const tabStop = activeKey && order.includes(activeKey) ? activeKey : order[0]

  return (
    <div ref={listRef} role="tablist" aria-label={`Paneles (zona ${zone === 'top' ? 'superior' : 'inferior'})`} className="flex shrink-0 items-center gap-0.5 border-b border-border px-2 py-1.5">
      {order.map((key) => {
        const p = PANEL_REGISTRY[key]
        return (
          <div key={key} className="relative">
            {dropTarget?.key === key && dropTarget.side === 'before' && (
              <span className="absolute -left-[3px] top-0.5 bottom-0.5 w-0.5 rounded-full bg-accent" />
            )}
            <button
              role="tab"
              id={`${idBase}-tab-${key}`}
              data-panel={key}
              aria-selected={activeKey === key}
              aria-controls={`${idBase}-panel`}
              tabIndex={key === tabStop ? 0 : -1}
              onKeyDown={(e) => onTabKeyDown(e, key)}
              draggable
              onDragStart={(e) => handleDragStart(e, key)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, key)}
              onDrop={handleDrop}
              onClick={() => onSelect(key)}
              title={p.label}
              aria-label={p.label}
              className={cn(
                'flex h-9 w-9 md:h-6 md:w-6 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing',
                draggedKey === key && 'opacity-30',
                activeKey === key
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-faint hover:bg-surface-hover hover:text-text',
              )}
            >
              <p.icon size={13} strokeWidth={1.75} />
            </button>
            {dropTarget?.key === key && dropTarget.side === 'after' && (
              <span className="absolute -right-[3px] top-0.5 bottom-0.5 w-0.5 rounded-full bg-accent" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DockZoneBody({ panelKey, idBase }: { panelKey: PanelKey | null; idBase: string }) {
  const def = panelKey ? PANEL_REGISTRY[panelKey] : null
  const PanelComponent = def?.component
  return (
    <div
      id={`${idBase}-panel`}
      role="tabpanel"
      aria-labelledby={panelKey ? `${idBase}-tab-${panelKey}` : undefined}
      className="min-h-0 flex-1 overflow-y-auto p-3"
    >
      {PanelComponent ? (
        <SectionErrorBoundary resetKey={panelKey} label={`el panel ${def.label}`}>
          <PanelComponent />
        </SectionErrorBoundary>
      ) : (
        <p className="text-xs text-text-faint">Elige un panel arriba.</p>
      )}
    </div>
  )
}

/** The two stacked, independently-orderable zones + their drag-to-resize divider. Shared by the
 * desktop sidebar and the mobile bottom-sheet — one shared `dock.splitPct`/`panelOrder`, two shells. */
function DockZones() {
  const dock = useUIStore((s) => s.dock)
  const assignPanel = useUIStore((s) => s.assignPanel)
  const setSplitPct = useUIStore((s) => s.setSplitPct)
  const bodyRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  // Durante el arrastre el porcentaje vive en estado local (un render por fotograma, vía rAF); el
  // store persistido — que escribe en localStorage en cada `set` — solo se toca al soltar.
  const [livePct, setLivePct] = useState<number | null>(null)
  const pendingPct = useRef<number | null>(null)
  const frame = useRef(0)
  const topId = useId()
  const bottomId = useId()

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !bodyRef.current) return
    const rect = bodyRef.current.getBoundingClientRect()
    pendingPct.current = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, ((e.clientY - rect.top) / rect.height) * 100))
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      setLivePct(pendingPct.current)
    })
  }, [])

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      dragging.current = false
      e.currentTarget.releasePointerCapture(e.pointerId)
      if (frame.current) cancelAnimationFrame(frame.current)
      frame.current = 0
      if (pendingPct.current != null) setSplitPct(pendingPct.current)
      pendingPct.current = null
      setLivePct(null)
    },
    [setSplitPct],
  )

  // Teclado (Fase 19): flechas ±5 %, Inicio/Fin a los topes — el mismo rango que el arrastre.
  const onSeparatorKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const step = { ArrowUp: -5, ArrowDown: 5 }[e.key]
    let next: number | null = null
    if (step != null) next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, dock.splitPct + step))
    else if (e.key === 'Home') next = SPLIT_MIN
    else if (e.key === 'End') next = SPLIT_MAX
    if (next == null) return
    e.preventDefault()
    setSplitPct(next)
  }

  return (
    <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-col" style={{ height: `${livePct ?? dock.splitPct}%` }}>
        <PanelTabs zone="top" idBase={topId} activeKey={dock.top} onSelect={(k) => assignPanel('top', k)} />
        <DockZoneBody idBase={topId} panelKey={dock.top} />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Redimensionar paneles"
        aria-valuenow={Math.round(livePct ?? dock.splitPct)}
        aria-valuemin={SPLIT_MIN}
        aria-valuemax={SPLIT_MAX}
        aria-valuetext={`Zona superior al ${Math.round(livePct ?? dock.splitPct)} %`}
        tabIndex={0}
        onKeyDown={onSeparatorKeyDown}
        className="group relative flex h-2.5 shrink-0 cursor-row-resize touch-none items-center justify-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="h-px w-full bg-border transition-colors group-hover:bg-accent/50 group-focus-visible:bg-accent" />
        <div className="absolute flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setSplitPct(SPLIT_MAX)}
            title="Maximizar zona superior"
            aria-label="Maximizar zona superior"
            className="rounded bg-surface p-0.5 text-text-faint hover:text-accent"
          >
            <ChevronsUp size={11} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setSplitPct(SPLIT_MIN)}
            title="Maximizar zona inferior"
            aria-label="Maximizar zona inferior"
            className="rounded bg-surface p-0.5 text-text-faint hover:text-accent"
          >
            <ChevronsDown size={11} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <PanelTabs zone="bottom" idBase={bottomId} activeKey={dock.bottom} onSelect={(k) => assignPanel('bottom', k)} />
        <DockZoneBody idBase={bottomId} panelKey={dock.bottom} />
      </div>
    </div>
  )
}

/** Mobile-only bottom sheet — the dock's entire content (Capture/Focus/Check-in/Progress/Activity/
 * Insights) was previously unreachable on a phone (`RightDock`'s `<aside>` is `hidden` below `md`).
 * Opened from `MobileNav`'s "Panel" tab. Only mounted while open, so it costs nothing when closed. */
function MobileDockSheet() {
  const open = useUIStore((s) => s.mobileDockOpen)
  const close = useUIStore((s) => s.closeMobileDock)
  const reduceMotion = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [open, close])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-dialog flex items-end bg-scrim md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Panel"
            initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.25, 1, 0.5, 1] }}
            className="flex h-[85vh] w-full flex-col rounded-t-2xl border-t border-border bg-bg-soft"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Panel</span>
              <button ref={closeRef} onClick={close} aria-label="Cerrar panel" className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text">
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <DockZones />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function RightDock() {
  const rightOpen = useUIStore((s) => s.rightOpen)

  return (
    <>
      {rightOpen && (
        <aside className="hidden w-80 shrink-0 flex-col border-l border-border bg-bg-soft md:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">Panel</span>
          </div>
          <DockZones />
        </aside>
      )}
      <MobileDockSheet />
    </>
  )
}
