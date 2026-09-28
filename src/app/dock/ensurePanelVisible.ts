import { useUIStore } from '../uiStore'
import type { PanelKey } from './panels'

/** Opens the right dock if needed and makes sure `panel` is showing in some zone (bottom, if it
 * isn't already in either). On phones it opens the bottom-sheet instead, since the desktop
 * `<aside>` is hidden there; only there, so resizing a desktop window never reveals a stale sheet. */
export function ensurePanelVisible(panel: PanelKey) {
  const { rightOpen, toggleRight, dock, assignPanel, openMobileDock } = useUIStore.getState()
  if (!rightOpen) toggleRight()
  if (dock.top !== panel && dock.bottom !== panel) {
    assignPanel('bottom', panel)
  }
  if (window.matchMedia('(max-width: 767px)').matches) openMobileDock()
}
