import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { createRoutine } from '../../db/repositories/routines'
import { setPluginEnabled } from './actions'
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
