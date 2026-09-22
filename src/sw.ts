/// <reference lib="webworker" />
// Service worker propio (injectManifest — ver vite.config.ts). Precache de Workbox +
// notificationclick (enfoca/abre la app y navega a la ruta del dato) + message desde la página
// (SKIP_WAITING para el flujo "Actualización disponible", SHOW_NOTIFICATION para el scheduler de
// notificaciones de la Fase 5.2 — la página decide CUÁNDO, el SW solo la muestra).
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL, type PrecacheEntry } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<PrecacheEntry | string> }

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
clientsClaim()

// Nextuss es una SPA: sin esto, navegar (o refrescar) sin conexión a una ruta que no sea "/" exacta
// (p. ej. /estadisticas) no encontraría nada en caché — el precache de Workbox solo sirve
// coincidencias exactas de URL, no rutas cliente. Toda navegación cae de vuelta al shell cacheado.
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')))

interface ShowNotificationMessage {
  type: 'SHOW_NOTIFICATION'
  title: string
  options?: NotificationOptions & { data?: { url?: string } }
}

interface SkipWaitingMessage {
  type: 'SKIP_WAITING'
}

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as ShowNotificationMessage | SkipWaitingMessage | undefined
  if (!data) return

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (data.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(self.registration.showNotification(data.title, data.options))
  }
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const targetUrl = (event.notification.data as { url?: string } | undefined)?.url ?? '/'

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const targetHref = new URL(targetUrl, self.location.origin).href

      for (const client of clientsList) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await (client as WindowClient).navigate(targetHref)
          return
        }
      }
      await self.clients.openWindow(targetHref)
    })(),
  )
})
