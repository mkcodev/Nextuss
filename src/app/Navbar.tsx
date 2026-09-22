import { useNavigate, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronRight,
  Keyboard,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  Search,
  Settings as SettingsIcon,
  WifiOff,
} from 'lucide-react'
import { db } from '../db/schema'
import { useUIStore } from './uiStore'
import { useOverlayStore } from './shortcuts/overlayStore'
import { useHabitFormStore } from '../features/habits/habitFormStore'
import { usePlayerProgress } from '../features/gamification/usePlayerProgress'
import { useOnlineStatus } from '../features/pwa/useOnlineStatus'
import { initials } from '../lib/text'
import { NAV_ITEMS } from './navItems'
import { Avatar, Kbd, Menu, MenuItem, MenuLabel } from '../design/primitives'

const BREADCRUMB: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((n) => [n.to, n.label]),
)

function AvatarMenu() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const { openHelp } = useOverlayStore()
  const navigate = useNavigate()

  const name = settings?.displayName?.trim()

  return (
    <Menu
      trigger={(props) => (
        <button
          {...props}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
        >
          <Avatar name={name} initials={name ? initials(name) : undefined} size={32} />
        </button>
      )}
    >
      {name && <MenuLabel>{name}</MenuLabel>}
      <MenuItem onSelect={() => navigate('/ajustes')} icon={<SettingsIcon size={15} strokeWidth={1.75} />}>
        Ajustes
      </MenuItem>
      <MenuItem onSelect={openHelp} icon={<Keyboard size={15} strokeWidth={1.75} />}>
        Atajos de teclado
        <span className="ml-auto text-xs text-text-faint">?</span>
      </MenuItem>
    </Menu>
  )
}

export function Navbar() {
  const location = useLocation()
  const leftCollapsed = useUIStore((s) => s.leftCollapsed)
  const toggleLeft = useUIStore((s) => s.toggleLeft)
  const rightOpen = useUIStore((s) => s.rightOpen)
  const toggleRight = useUIStore((s) => s.toggleRight)
  const openPalette = useOverlayStore((s) => s.openPalette)
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const { level } = usePlayerProgress()
  const online = useOnlineStatus()

  const currentLabel =
    BREADCRUMB[location.pathname] ??
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.to) && item.to !== '/')?.label

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
      <button
        onClick={toggleLeft}
        title="Colapsar navegación (Alt+H)"
        aria-label={leftCollapsed ? 'Mostrar navegación' : 'Colapsar navegación'}
        className="hidden rounded-md p-1.5 text-text-faint transition-colors hover:bg-surface-hover hover:text-text md:flex"
      >
        {leftCollapsed ? (
          <PanelLeftOpen size={17} strokeWidth={1.75} />
        ) : (
          <PanelLeftClose size={17} strokeWidth={1.75} />
        )}
      </button>

      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent shadow-glow" />
        <span className="hidden text-sm font-semibold tracking-[0.14em] text-text sm:inline">
          NEXUS
        </span>
      </div>

      {currentLabel && (
        <div className="hidden items-center gap-1.5 text-sm text-text-faint sm:flex">
          <ChevronRight size={14} strokeWidth={1.75} />
          <span className="text-text-muted">{currentLabel}</span>
        </div>
      )}

      <button
        onClick={openPalette}
        className="ml-2 flex flex-1 max-w-sm items-center gap-2 rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-left text-text-faint transition-colors hover:border-border-strong"
      >
        <Search size={14} strokeWidth={1.75} />
        <span className="flex-1 text-xs">Buscar o ejecutar un comando…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {!online && (
          <div
            className="flex items-center gap-1 rounded-lg border border-warning/30 bg-warning/10 px-2 py-1.5 text-warning"
            title="Sin conexión — sigues pudiendo trabajar, tus datos están en este dispositivo"
          >
            <WifiOff size={13} strokeWidth={1.75} />
            <span className="hidden text-xs font-medium sm:inline">Sin conexión</span>
          </div>
        )}

        <button
          onClick={() => openCreate()}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white shadow-glow transition-opacity hover:opacity-90"
        >
          <Plus size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Nuevo</span>
        </button>

        <div
          className="hidden items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-text-muted sm:flex"
          title="Tu nivel"
        >
          <span className="text-xs font-semibold tabular-nums text-accent">Nv. {level}</span>
        </div>

        <AvatarMenu />

        <button
          onClick={toggleRight}
          title="Mostrar/ocultar panel (Alt+L)"
          aria-label={rightOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          className="hidden rounded-md p-1.5 text-text-faint transition-colors hover:bg-surface-hover hover:text-text md:flex"
        >
          <PanelRightOpen size={17} strokeWidth={1.75} className={rightOpen ? 'text-accent' : ''} />
        </button>
      </div>
    </header>
  )
}
