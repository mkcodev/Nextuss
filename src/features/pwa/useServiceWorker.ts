import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToastStore } from '../../lib/toastStore'

/** Registra el service worker (`registerType: 'prompt'` — nunca se actualiza sin avisar) y ofrece
 * un toast accionable cuando hay una versión nueva esperando. Montado una vez en AppShell. */
export function useServiceWorker() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisterError: (error) => console.error('Fallo al registrar el service worker', error),
  })
  const push = useToastStore((s) => s.push)

  useEffect(() => {
    if (!needRefresh) return
    push({
      title: 'Actualización disponible · Recargar',
      icon: 'sparkles',
      sticky: true,
      onClick: () => updateServiceWorker(true),
    })
  }, [needRefresh, updateServiceWorker, push])
}
