// Punto de montaje en PluginEngines: mientras no haya sesión activa, no carga three.js/R3F (peso
// evitado). En cuanto `useVirtualizationStore().active` pasa a true (lanzador `virtualization.start`),
// `MountOnFirstOpen` monta el Canvas perezoso una sola vez y lo deja montado (igual que los diálogos
// lazy de `AppShell.tsx`).
import { Suspense } from 'react'
import { MountOnFirstOpen } from '../../app/MountOnFirstOpen'
import { lazyNamed } from '../../app/lazy'
import { useVirtualizationStore } from './engine/useVirtualizationStore'

const Virtualization = lazyNamed(() => import('./Virtualization'), 'Virtualization')

export function VirtualizationEngine() {
  const active = useVirtualizationStore((s) => s.active)
  return (
    <MountOnFirstOpen open={active}>
      <Suspense fallback={null}>
        <Virtualization />
      </Suspense>
    </MountOnFirstOpen>
  )
}
