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
import { usePageTitleStore } from './pageTitleStore'
import { useOverlayStore } from './shortcuts/overlayStore'
import { useQuickAddStore } from '../features/tasks/quickAddStore'
import { usePlayerProgress } from '../features/gamification/usePlayerProgress'
import { useOnlineStatus } from '../features/pwa/useOnlineStatus'
import { FocusIndicator } from '../features/focus/FocusIndicator'
import { RoutineIndicator } from '../features/routines/RoutineIndicator'
import { DayTimeIndicator } from '../features/today/DayTimeIndicator'
import { initials } from '../lib/text'
import { NAV_ITEMS, useNavItems } from './navItems'
import { usePluginEnabled } from '../features/plugins/pluginsStore'
import { Avatar, Kbd, Menu, MenuItem, MenuLabel } from '../design/primitives'

const AVATAR_NAV_ROUTES = new Set(['/estadisticas', '/proyectos', '/rutinas', '/retos'])

const BREADCRUMB: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((n) => [n.to, n.label]),
)

/** Marca de Línea: cuadrado de 16 px partido en diagonal, acento y texto (corte duro, sin degradado). */
function LinMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <clipPath id="lin-mark-clip">
        <rect width="16" height="16" rx="4" />
      </clipPath>
      <g clipPath="url(#lin-mark-clip)">
        <path d="M0 0H16L0 16Z" className="fill-accent" />
        <path d="M16 0V16H0Z" className="fill-text" />
      </g>
    </svg>
  )
}

function AvatarMenu() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const { openHelp } = useOverlayStore()
  const navigate = useNavigate()
  const avatarNav = useNavItems().filter((n) => AVATAR_NAV_ROUTES.has(n.to))

  const name = settings?.displayName?.trim()

  return (
    <Menu
      trigger={(props) => (
        <button
          {...props}
          className="flex h-7.5 w-7.5 items-center justify-center rounded-full transition-opacity duration-(--dur-fast) hover:opacity-80"
        >
          <Avatar name={name} initials={name ? initials(name) : undefined} size={30} />
        </button>
      )}
    >
      {name && <MenuLabel>{name}</MenuLabel>}
      {/* Destinos que no caben en la barra móvil: aquí siguen a un toque. */}
      {avatarNav.map(({ to, label, icon: NavIcon }) => (
        <MenuItem key={to} onSelect={() => navigate(to, { viewTransition: true })} icon={<NavIcon size={15} strokeWidth={1.75} />}>
          {label}
        </MenuItem>
      ))}
      <MenuItem onSelect={() => navigate('/ajustes', { viewTransition: true })} icon={<SettingsIcon size={15} strokeWidth={1.75} />}>
        Ajustes
      </MenuItem>
      <MenuItem onSelect={openHelp} icon={<Keyboard size={15} strokeWidth={1.75} />}>
        Atajos de teclado
        <span className="ml-auto text-xs text-text-faint">?</span>
      </MenuItem>
    </Menu>
  )
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

export function Navbar() {
  const location = useLocation()
  const leftCollapsed = useUIStore((s) => s.leftCollapsed)
  const toggleLeft = useUIStore((s) => s.toggleLeft)
  const dayTimeOn = usePluginEnabled('dayTime')
  const routinesOn = usePluginEnabled('routines')
  const focusOn = usePluginEnabled('focus')
  const gamificationOn = usePluginEnabled('gamification')
  const rightOpen = useUIStore((s) => s.rightOpen)
  const toggleRight = useUIStore((s) => s.toggleRight)
  const openPalette = useOverlayStore((s) => s.openPalette)
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)
  const { level } = usePlayerProgress()
  const online = useOnlineStatus()
  const pageTitle = usePageTitleStore((s) => s.title)

  const currentLabel =
    pageTitle ??
    BREADCRUMB[location.pathname] ??
    NAV_ITEMS.find((item) => location.pathname.startsWith(item.to) && item.to !== '/')?.label

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
      <button
        onClick={toggleLeft}
        title="Colapsar navegación (Alt+H)"
        aria-label={leftCollapsed ? 'Mostrar navegación' : 'Colapsar navegación'}
        className="hidden h-7.5 w-7.5 items-center justify-center rounded-sm text-text-faint transition-colors duration-(--dur-fast) hover:bg-surface-hover hover:text-text md:flex"
      >
        {leftCollapsed ? (
          <PanelLeftOpen size={16} strokeWidth={1.75} />
        ) : (
          <PanelLeftClose size={16} strokeWidth={1.75} />
        )}
      </button>

      <div className="flex items-center gap-1.5">
        <LinMark />
        <span className="hidden text-sm font-[650] tracking-[-0.01em] text-text sm:inline">Nextuss</span>
      </div>

      {currentLabel && (
        <div className="hidden items-center gap-1.5 text-ui text-text-faint sm:flex">
          <ChevronRight size={14} strokeWidth={1.75} />
          <span className="text-text-muted">{currentLabel}</span>
        </div>
      )}

      <button
        onClick={openPalette}
        className="ml-2 flex h-7.5 min-w-0 flex-1 items-center gap-2 rounded-[7px] bg-surface px-3 text-left text-text-muted shadow-edge transition-colors duration-(--dur-fast) hover:bg-surface-hover md:w-[min(384px,32vw)] md:flex-none"
      >
        <Search size={14} strokeWidth={1.75} />
        <span className="flex-1 truncate text-ui">Buscar o ejecutar un comando…</span>
        <Kbd>{IS_MAC ? '⌘K' : 'Ctrl K'}</Kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {!online && (
          <div
            className="flex items-center gap-1 rounded-sm border border-warning/30 bg-warning/10 px-2 py-1.5 text-warning"
            title="Sin conexión — sigues pudiendo trabajar, tus datos están en este dispositivo"
          >
            <WifiOff size={13} strokeWidth={1.75} />
            <span className="hidden text-xs font-medium sm:inline">Sin conexión</span>
          </div>
        )}

        {dayTimeOn && <DayTimeIndicator />}
        {routinesOn && <RoutineIndicator />}
        {focusOn && <FocusIndicator />}

        <button
          type="button"
          onClick={() => openQuickAdd()}
          aria-label="Nueva tarea"
          title="Nueva tarea (n)"
          className="flex h-7.5 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-ui font-medium text-text shadow-card transition-colors duration-(--dur-fast) hover:bg-surface-hover"
        >
          <Plus size={14} strokeWidth={2} />
          <span className="hidden sm:inline">Nuevo</span>
          <Kbd className="hidden sm:inline-flex">n</Kbd>
        </button>

        {gamificationOn && (
          <div
            className="hidden h-7.5 items-center gap-1 rounded-sm px-2 text-text-muted shadow-edge sm:flex"
            title="Tu nivel"
          >
            <span className="text-xs font-semibold tabular-nums text-accent-text">Nv. {level}</span>
          </div>
        )}

        <AvatarMenu />

        <button
          onClick={toggleRight}
          title="Mostrar/ocultar panel (Alt+L)"
          aria-label={rightOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
          className="hidden h-7.5 w-7.5 items-center justify-center rounded-sm text-text-faint transition-colors duration-(--dur-fast) hover:bg-surface-hover hover:text-text md:flex"
        >
          <PanelRightOpen size={16} strokeWidth={1.75} className={rightOpen ? 'text-accent-text' : ''} />
        </button>
      </div>
    </header>
  )
}
