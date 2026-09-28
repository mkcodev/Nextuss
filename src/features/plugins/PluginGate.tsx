import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button, EmptyState } from '../../design/primitives'
import { setPluginEnabled } from './actions'
import { usePluginEnabled, usePluginsStore } from './pluginsStore'
import { getPlugin } from './registry'
import type { PluginId } from './types'

/** Pinta `children` solo si el plugin está activo. Para tarjetas, indicadores y bloques sueltos. */
export function IfPlugin({ id, children }: { id: PluginId; children: ReactNode }) {
  return usePluginEnabled(id) ? <>{children}</> : null
}

/** Página de un plugin: con el plugin desactivado, la ruta sigue existiendo (enlaces y accesos de la
 * PWA no dan 404) y ofrece reactivarlo. Sus datos siguen ahí. */
export function PluginGate({ id, children }: { id: PluginId; children: ReactNode }) {
  const enabled = usePluginEnabled(id)
  const loaded = usePluginsStore((s) => s.loaded)
  const [busy, setBusy] = useState(false)
  if (enabled) return <>{children}</>
  // Hasta leer los ajustes vale el valor por defecto (activo), así que aquí nunca se ve un aviso falso.
  if (!loaded) return null
  const plugin = getPlugin(id)
  return (
    <div className="mx-auto max-w-5xl p-6 lg:p-8">
      <EmptyState
        icon={plugin.icon}
        title={`${plugin.name} está desactivado`}
        description="Tus datos siguen guardados. Actívalo para volver a verlo en la navegación, la paleta y los avisos."
        action={
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await setPluginEnabled(id, true)
              setBusy(false)
            }}
          >
            Activar {plugin.name}
          </Button>
        }
      />
    </div>
  )
}
