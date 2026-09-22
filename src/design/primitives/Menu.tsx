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

  useEffect(() => {
    if (open) itemsRef.current[0]?.focus()
    else document.getElementById(triggerId)?.focus()
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
            'absolute top-[calc(100%+0.5rem)] z-dialog w-52 overflow-hidden rounded-xl border border-border bg-bg-soft py-1 shadow-card',
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
}

export function MenuItem({ onSelect, children, icon, destructive }: MenuItemProps) {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error('MenuItem must be used inside Menu')

  return (
    <button
      ref={(el) => ctx.registerItem(el)}
      role="menuitem"
      onClick={() => {
        onSelect()
        ctx.close()
      }}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover',
        destructive ? 'text-danger' : 'text-text-muted hover:text-text',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="border-b border-border px-3 py-2.5 text-sm font-medium text-text">{children}</div>
}
