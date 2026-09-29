import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { createRoutine } from '../../db/repositories/routines'
import { useToastStore } from '../../lib/toastStore'
import { useUndoStore } from '../../lib/undoStore'
import { cascadeDescription, setPluginEnabled, togglePluginWithUndo } from './actions'
import { resolveEnabled } from './resolve'

describe('setPluginEnabled', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
  })

  it('guarda el cambio en Settings.plugins sin tocar los datos del plugin', async () => {
    await createRoutine({ name: 'Mañana', icon: 'sunrise', color: '#7c84e8', steps: [], weekdays: [] })
    await setPluginEnabled('routines', false)
    const settings = await getOrCreateSettings()
    expect(settings.plugins).toEqual({ routines: false })
    expect(resolveEnabled(settings.plugins).has('routines')).toBe(false)
    expect(await db.routines.count()).toBe(1)
  })

  it('devuelve la cascada', async () => {
    // weeklyReview depende de planning, que es núcleo: desactivarla no arrastra a nadie.
    expect(await setPluginEnabled('weeklyReview', false)).toEqual([])
  })
})

describe('togglePluginWithUndo', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) await table.clear()
    })
    useUndoStore.setState({ past: [], future: [] })
    useToastStore.setState({ toasts: [] })
  })

  it('deja un toast con «Deshacer» que restaura el estado anterior', async () => {
    const cascaded = await togglePluginWithUndo('virtualization', false)
    expect(cascaded).toEqual([])
    expect(resolveEnabled((await getOrCreateSettings()).plugins).has('virtualization')).toBe(false)

    const toast = useToastStore.getState().toasts.at(-1)
    expect(toast?.title).toBe('Desactivaste Virtualización')
    expect(toast?.description).toBeUndefined() // sin cascada real, no hay nada más que avisar
    expect(toast?.action?.label).toBe('Deshacer')

    toast!.action!.onClick()
    expect(resolveEnabled((await getOrCreateSettings()).plugins).has('virtualization')).toBe(true)
  })

  it('cascadeDescription nombra los plugins arrastrados', () => {
    expect(cascadeDescription([])).toBeUndefined()
    expect(cascadeDescription(['focus', 'habits'])).toBe('También cambió: Foco, Hábitos.')
  })
})
