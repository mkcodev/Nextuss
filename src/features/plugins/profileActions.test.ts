import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'
import { useUndoStore } from '../../lib/undoStore'
import { resolveEnabled } from './resolve'
import { PLUGIN_PROFILES } from './profiles'
import { applyProfileWithUndo, describeProfileChanges } from './profileActions'

const adhd = PLUGIN_PROFILES.find((p) => p.id === 'adhd')!
const minimal = PLUGIN_PROFILES.find((p) => p.id === 'minimal')!

describe('describeProfileChanges', () => {
  it('sin nada guardado (todo por defaultEnabled), solo lista lo que el perfil apaga', () => {
    const changes = describeProfileChanges(adhd, undefined)
    expect(changes.every((c) => !c.on)).toBe(true)
    expect(changes.map((c) => c.id).sort()).toEqual(['ai', 'launchers', 'stats', 'telegram', 'weeklyReview'])
  })

  it('no lista plugins que ya coinciden con el perfil', () => {
    // 'minimal' apaga todo lo no-núcleo; si ya está todo apagado, no hay cambios.
    const stored = Object.fromEntries(PLUGIN_PROFILES.find((p) => p.id === 'full')!.plugins.map((id) => [id, false]))
    expect(describeProfileChanges(minimal, stored)).toEqual([])
  })
})

describe('applyProfileWithUndo', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    useUndoStore.setState({ past: [], future: [] })
    useToastStore.setState({ toasts: [] })
  })

  it('deja encendidos exactamente los plugins del perfil (núcleo aparte) y un toast con «Deshacer»', async () => {
    await getOrCreateSettings()
    await applyProfileWithUndo(adhd, (await getOrCreateSettings()).plugins)

    const enabled = resolveEnabled((await getOrCreateSettings()).plugins)
    for (const id of adhd.plugins) expect(enabled.has(id)).toBe(true)
    expect(enabled.has('telegram')).toBe(false)
    expect(enabled.has('ai')).toBe(false)

    const toast = useToastStore.getState().toasts.at(-1)
    expect(toast?.title).toBe('Aplicaste el perfil «Enfoque TDAH»')
    expect(toast?.action?.label).toBe('Deshacer')

    toast!.action!.onClick()
    const restored = resolveEnabled((await getOrCreateSettings()).plugins)
    expect(restored.has('telegram')).toBe(true) // vuelve al defaultEnabled de antes de aplicar el perfil
  })

  it('el núcleo nunca aparece en Settings.plugins, el perfil no lo toca', async () => {
    await getOrCreateSettings()
    await applyProfileWithUndo(minimal, (await getOrCreateSettings()).plugins)
    const settings = await getOrCreateSettings()
    expect(settings.plugins?.today).toBeUndefined()
    expect(settings.plugins?.tasks).toBeUndefined()
    expect(resolveEnabled(settings.plugins).has('today')).toBe(true) // núcleo, siempre activo
  })
})
