import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

interface MenuContextValue {
  close: () => void
  registerItem: (el: HTMLButtonElement | null) => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

interface MenuProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu'; id: string }) => ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}

/** Accessible dropdown menu: roving arrow-key focus, Escape closes and returns focus to the trigger,
 * click-outside closes, role="menu"/"menuitem" wired up. Replaces the hand-rolled click-outside-only
 * pattern that used to live inline in Navbar's avatar menu. */
export function Menu({ trigger, children, align = 'right', className }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerId = useId()
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Solo devolvemos el foco al trigger al CERRAR: sin `wasOpen`, el efecto corría también en el
  // primer render (open=false) y cada `Menu` montado robaba el foco (en /tareas, uno por fila).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) itemsRef.current[0]?.focus()
    else if (wasOpen.current) document.getElementById(triggerId)?.focus()
    wasOpen.current = open
  }, [open, triggerId])

  function close() {
    setOpen(false)
  }

  function registerItem(el: HTMLButtonElement | null) {
    if (el && !itemsRef.current.includes(el)) itemsRef.current.push(el)
  }

  function onKeyDown(e: KeyboardEvent) {
    const items = itemsRef.current.filter((el): el is HTMLButtonElement => el != null)
    const currentIndex = items.findIndex((el) => el === document.activeElement)
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Tab') {
      // Salir con Tab cierra el menú (antes el foco se iba y el menú quedaba abierto).
      setOpen(false)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(currentIndex + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(currentIndex - 1 + items.length) % items.length]?.focus()
    }
  }

  return (
    <div className={cn('relative', className)} ref={rootRef} onKeyDown={onKeyDown}>
      {trigger({
        onClick: () =>
          setOpen((v) => {
            if (!v) itemsRef.current = []
            return !v
          }),
        'aria-expanded': open,
        'aria-haspopup': 'menu',
        id: triggerId,
      })}
      {open && (
        <div
          role="menu"
          aria-labelledby={triggerId}
          className={cn(
            'absolute top-[calc(100%+0.375rem)] z-dialog max-h-72 w-52 overflow-y-auto overscroll-contain rounded-md border border-border bg-surface py-1 shadow-dialog',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <MenuContext.Provider value={{ close, registerItem }}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

interface MenuItemProps {
  onSelect: () => void
  children: ReactNode
  icon?: ReactNode
  destructive?: boolean
  /** Marca la opción elegida en menús de selección (prioridad, proyecto…): `menuitemradio` + check. */
  checked?: boolean
}

export function MenuItem({ onSelect, children, icon, destructive, checked }: MenuItemProps) {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error('MenuItem must be used inside Menu')

  return (
    <button
      ref={(el) => ctx.registerItem(el)}
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      onClick={() => {
        onSelect()
        ctx.close()
      }}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover',
        destructive ? 'text-danger' : checked ? 'text-text' : 'text-text-muted hover:text-text',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <Check size={14} strokeWidth={2} className="shrink-0 text-accent" aria-hidden="true" />}
    </button>
  )
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="border-b border-border px-3 py-2.5 text-sm font-medium text-text">{children}</div>
}
