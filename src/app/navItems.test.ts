import { describe, expect, it } from 'vitest'
import { EXTRA_GO_ITEMS, NAV_ITEMS, selectNav } from './navItems'
import { isPanelVisible } from './dock/panels'
import { resolveEnabled } from '../features/plugins/resolve'

describe('navegación según plugins', () => {
  it('con todo activo no cambia nada', () => {
    const enabled = resolveEnabled(undefined)
    expect(selectNav(NAV_ITEMS, enabled)).toHaveLength(NAV_ITEMS.length)
    expect(selectNav(EXTRA_GO_ITEMS, enabled)).toHaveLength(EXTRA_GO_ITEMS.length)
  })

  it('un plugin desactivado desaparece de la navegación y de su acorde g', () => {
    const enabled = resolveEnabled({ routines: false, stats: false })
    const routes = selectNav(NAV_ITEMS, enabled).map((n) => n.to)
    expect(routes).not.toContain('/rutinas')
    expect(routes).not.toContain('/estadisticas')
    expect(routes).toContain('/ajustes') // sin plugin: siempre visible
  })

  it('los paneles del dock siguen a su plugin', () => {
    const enabled = resolveEnabled({ focus: false })
    expect(isPanelVisible('focus', enabled)).toBe(false)
    expect(isPanelVisible('capture', enabled)).toBe(true)
  })
})
