import { useCallback, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react'
import { ChevronsDown, ChevronsUp, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useUIStore, type DockZone } from '../uiStore'
import { PANEL_REGISTRY, type PanelKey } from './panels'
import { cn } from '../../lib/cn'

const DRAG_MIME = 'application/x-nextuss-panel-order'

interface DropTarget {
  key: PanelKey
  side: 'before' | 'after'
}

/** The row of panel icons. Click selects the panel for this zone; drag reorders the icons horizontally — each zone keeps its own independent order. */
function PanelTabs({
  zone,
  activeKey,
  onSelect,
}: {
  zone: DockZone
  activeKey: PanelKey | null
  onSelect: (key: PanelKey) => void
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

  return (
    <div role="tablist" aria-label={`Paneles (zona ${zone === 'top' ? 'superior' : 'inferior'})`} className="flex shrink-0 items-center gap-0.5 border-b border-border px-2 py-1.5">
      {order.map((key) => {
        const p = PANEL_REGISTRY[key]
        return (
          <div key={key} className="relative">
            {dropTarget?.key === key && dropTarget.side === 'before' && (
              <span className="absolute -left-[3px] top-0.5 bottom-0.5 w-0.5 rounded-full bg-accent shadow-glow" />
            )}
            <button
              role="tab"
              aria-selected={activeKey === key}
              draggable
              onDragStart={(e) => handleDragStart(e, key)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, key)}
              onDrop={handleDrop}
              onClick={() => onSelect(key)}
              title={p.label}
              aria-label={p.label}
              className={cn(
                'flex h-6 w-6 cursor-grab items-center justify-center rounded-md transition-colors active:cursor-grabbing',
                draggedKey === key && 'opacity-30',
                activeKey === key
                  ? 'bg-accent-soft text-accent'
                  : 'text-text-faint hover:bg-surface-hover hover:text-text',
              )}
            >
              <p.icon size={13} strokeWidth={1.75} />
            </button>
            {dropTarget?.key === key && dropTarget.side === 'after' && (
              <span className="absolute -right-[3px] top-0.5 bottom-0.5 w-0.5 rounded-full bg-accent shadow-glow" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function DockZoneBody({ panelKey }: { panelKey: PanelKey | null }) {
  const def = panelKey ? PANEL_REGISTRY[panelKey] : null
  const PanelComponent = def?.component
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {PanelComponent ? (
        <PanelComponent />
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

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging.current || !bodyRef.current) return
      const rect = bodyRef.current.getBoundingClientRect()
      setSplitPct(((e.clientY - rect.top) / rect.height) * 100)
    },
    [setSplitPct],
  )

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-col" style={{ height: `${dock.splitPct}%` }}>
        <PanelTabs zone="top" activeKey={dock.top} onSelect={(k) => assignPanel('top', k)} />
        <DockZoneBody panelKey={dock.top} />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Redimensionar paneles"
        className="group relative flex h-2.5 shrink-0 cursor-row-resize touch-none items-center justify-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="h-px w-full bg-border transition-colors group-hover:bg-accent/50" />
        <div className="absolute flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setSplitPct(92)}
            title="Maximizar zona superior"
            aria-label="Maximizar zona superior"
            className="rounded bg-surface p-0.5 text-text-faint hover:text-accent"
          >
            <ChevronsUp size={11} strokeWidth={2} />
          </button>
          <button
            onClick={() => setSplitPct(8)}
            title="Maximizar zona inferior"
            aria-label="Maximizar zona inferior"
            className="rounded bg-surface p-0.5 text-text-faint hover:text-accent"
          >
            <ChevronsDown size={11} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <PanelTabs zone="bottom" activeKey={dock.bottom} onSelect={(k) => assignPanel('bottom', k)} />
        <DockZoneBody panelKey={dock.bottom} />
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-dialog flex items-end bg-black/40 backdrop-blur-sm md:hidden"
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
              <button onClick={close} aria-label="Cerrar panel" className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text">
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
