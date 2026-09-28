import { Dialog } from '../design/primitives'
import { useOverlayStore } from './shortcuts/overlayStore'
import { EXTRA_GO_ITEMS, NAV_ITEMS, selectNav } from './navItems'
import { useEnabledPlugins } from '../features/plugins/pluginsStore'
import type { PluginId } from '../features/plugins/types'

function groups(enabled: ReadonlySet<PluginId>): { title: string; items: [string, string][] }[] {
  return [
    {
      title: 'Interfaz',
      items: [
        ['Alt + H', 'Colapsar / expandir navegación'],
        ['Alt + L', 'Mostrar / ocultar panel derecho'],
        ['Ctrl / ⌘ + K', 'Abrir la paleta de comandos'],
        ['Ctrl / ⌘ + Z', 'Deshacer (borrados, ediciones, arrastres)'],
        ['Ctrl / ⌘ + Shift + Z', 'Rehacer'],
        ['i', 'Captura rápida (abre y enfoca el panel de Captura)'],
        ['n', 'Tarea rápida (fecha, hora, prioridad, etiqueta y objetivo en el propio texto)'],
        ['?', 'Mostrar esta ayuda'],
        ['Esc', 'Cerrar diálogo o paleta'],
      ],
    },
    {
      title: 'Navegación (pulsa g, luego la letra)',
      items: [...selectNav(NAV_ITEMS, enabled), ...selectNav(EXTRA_GO_ITEMS, enabled)].map(
        ({ goKey, label }): [string, string] => [`g ${goKey}`, `Ir a ${label}`],
      ),
    },
    {
      title: 'Vista Día (Hoy)',
      items: [
        ['[ / ]', 'Día anterior / siguiente'],
        ['t', 'Volver a hoy'],
      ],
    },
    {
      title: 'Listas',
      items: [
        ['j / k', 'Moverse abajo / arriba'],
        ['Enter', 'Marcar el elemento seleccionado'],
        ['c', 'Crear (en Hábitos y Objetivos, uno nuevo; en el resto, una tarea)'],
      ],
    },
  ]
}

export function ShortcutsHelpModal() {
  const enabled = useEnabledPlugins()
  const helpOpen = useOverlayStore((s) => s.helpOpen)
  const closeHelp = useOverlayStore((s) => s.closeHelp)

  return (
    <Dialog open={helpOpen} onClose={closeHelp} title="Atajos de teclado">
      <div className="space-y-5">
        {groups(enabled).map((group) => (
          <div key={group.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
              {group.title}
            </p>
            <div className="space-y-1.5">
              {group.items.map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-muted">{desc}</span>
                  <kbd className="shrink-0 rounded-md border border-border bg-bg-soft px-2 py-0.5 text-xs font-medium text-text">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
