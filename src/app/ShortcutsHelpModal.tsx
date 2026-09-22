import { Dialog } from '../design/primitives'
import { useOverlayStore } from './shortcuts/overlayStore'
import { NAV_ITEMS } from './navItems'

// Entradas del grupo "Navegación" que no son una ruta de NAV_ITEMS (sub-tabs, anclas, etc).
const EXTRA_NAV_SHORTCUTS: [string, string][] = [['g o', 'Ir a Objetivos']]

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Interfaz',
    items: [
      ['Alt + H', 'Colapsar / expandir navegación'],
      ['Alt + L', 'Mostrar / ocultar panel derecho'],
      ['Ctrl / ⌘ + K', 'Abrir la paleta de comandos'],
      ['i', 'Captura rápida (abre y enfoca el panel de Captura)'],
      ['?', 'Mostrar esta ayuda'],
      ['Esc', 'Cerrar diálogo o paleta'],
    ],
  },
  {
    title: 'Navegación (pulsa g, luego la letra)',
    items: [
      ...NAV_ITEMS.map(({ goKey, label }): [string, string] => [`g ${goKey}`, `Ir a ${label}`]),
      ...EXTRA_NAV_SHORTCUTS,
    ],
  },
  {
    title: 'Listas',
    items: [
      ['j / k', 'Moverse abajo / arriba'],
      ['Enter', 'Marcar el elemento seleccionado'],
      ['c', 'Crear un hábito nuevo'],
    ],
  },
]

export function ShortcutsHelpModal() {
  const helpOpen = useOverlayStore((s) => s.helpOpen)
  const closeHelp = useOverlayStore((s) => s.closeHelp)

  return (
    <Dialog open={helpOpen} onClose={closeHelp} title="Atajos de teclado">
      <div className="space-y-5">
        {GROUPS.map((group) => (
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
