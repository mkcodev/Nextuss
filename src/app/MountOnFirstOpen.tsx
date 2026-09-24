import { useState, type ReactNode } from 'react'

/** No monta (ni, por tanto, descarga) a sus hijos hasta la primera vez que `open` es true; después
 * los mantiene montados para que la animación de cierre y el estado interno sigan funcionando. */
export function MountOnFirstOpen({ open, children }: { open: boolean; children: ReactNode }) {
  const [everOpened, setEverOpened] = useState(open)
  if (open && !everOpened) setEverOpened(true)
  return everOpened ? <>{children}</> : null
}
