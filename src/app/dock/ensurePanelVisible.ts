import { useUIStore } from '../uiStore'
import type { PanelKey } from './panels'

/** Opens the right dock if needed and makes sure `panel` is showing in some zone (bottom, if it
 * isn't already in either). Also opens the mobile bottom-sheet — harmless on desktop (it's
 * `md:hidden`), and it's what makes the `i` shortcut / PWA app-icon shortcuts actually reach
 * something visible on a phone, where the desktop `<aside>` is always `hidden`. */
export function ensurePanelVisible(panel: PanelKey) {
  const { rightOpen, toggleRight, dock, assignPanel, openMobileDock } = useUIStore.getState()
  if (!rightOpen) toggleRight()
  if (dock.top !== panel && dock.bottom !== panel) {
    assignPanel('bottom', panel)
  }
  openMobileDock()
}
