import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { createMorningRoutine, morningTemplateSteps, MORNING_TEMPLATE_NAME } from './templates'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('createMorningRoutine', () => {
  it('crea una rutina con los 5 pasos tipados de la Mañana consciente', async () => {
    const id = await createMorningRoutine()
    const routine = await db.routines.get(id)
    expect(routine?.name).toBe(MORNING_TEMPLATE_NAME)
    expect(routine?.steps.map((s) => s.kind)).toEqual(['simple', 'gratitude', 'visualization', 'intention', 'focusTask'])
    expect(routine?.steps.find((s) => s.kind === 'visualization')?.prompt).toBeTruthy()
  })
})

describe('morningTemplateSteps', () => {
  it('genera ids de paso distintos en cada llamada', () => {
    const a = morningTemplateSteps()
    const b = morningTemplateSteps()
    expect(a[0].id).not.toBe(b[0].id)
  })
})
