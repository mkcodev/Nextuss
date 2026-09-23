import { useEffect } from 'react'
import { useCaptureRequestStore } from './captureRequestStore'
import { ensurePanelVisible } from '../dock/ensurePanelVisible'
import { todayKey } from '../../lib/dates'
import { useDayCloseStore } from '../../features/rituals/dayCloseStore'

/**
 * Handles `?action=` launched either from the PWA's app-icon shortcuts (manifest `shortcuts`, see
 * vite.config.ts: "Captura rápida" and "Enfoque") or from a clicked notification (the evening
 * summary, `notifications/rules.ts`) — both land on `/` with an action param since there's no
 * dedicated route. Runs once on mount, then strips the param so a refresh doesn't re-trigger it.
 */
export function usePwaShortcutActions() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    if (!action) return

    if (action === 'capture') {
      ensurePanelVisible('capture')
      useCaptureRequestStore.getState().request()
    } else if (action === 'focus') {
      ensurePanelVisible('focus')
    } else if (action === 'dayClose') {
      useDayCloseStore.getState().openFlow(todayKey())
    }

    params.delete('action')
    const query = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''))
  }, [])
}
