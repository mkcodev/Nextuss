import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { createTask, trashTask } from '../../db/repositories/tasks'
import { createHabit } from '../../db/repositories/habits'
import { createGoal } from '../../db/repositories/goals'
import { searchIndex } from './searchIndex'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  searchIndex.resetForTests()
})

describe('searchIndex (Fase 8.7)', () => {
  it('encuentra una tarea por prefijo de palabra, sin distinguir acentos', async () => {
    await createTask({ title: 'Preparar reunión de diseño' })
    await searchIndex.ensureBuilt()

    expect(searchIndex.search('reun').map((d) => d.title)).toContain('Preparar reunión de diseño')
    expect(searchIndex.search('reunion').map((d) => d.title)).toContain('Preparar reunión de diseño')
  })

  it('exige que todas las palabras de la consulta encuentren coincidencia (AND)', async () => {
    await createTask({ title: 'Comprar leche' })
    await createTask({ title: 'Comprar pan' })
    await searchIndex.ensureBuilt()

    expect(searchIndex.search('comprar leche').map((d) => d.title)).toEqual(['Comprar leche'])
  })

  it('busca también hábitos y objetivos', async () => {
    await createHabit({ name: 'Meditar', icon: 'brain', color: '#fff', type: 'binary', weekdays: [] })
    await createGoal({ period: 'week', periodKey: '2026-W38', title: 'Lanzar la web' })
    await searchIndex.ensureBuilt()

    expect(searchIndex.search('medit').map((d) => d.type)).toContain('habit')
    expect(searchIndex.search('lanzar').map((d) => d.type)).toContain('goal')
  })

  it('no devuelve una tarea borrada de antes de construir el índice', async () => {
    const id = await createTask({ title: 'Tarea descartable' })
    await trashTask(id)
    await searchIndex.ensureBuilt()

    expect(searchIndex.search('descartable')).toEqual([])
  })

  it('se mantiene al día vía los hooks de Dexie tras el build inicial', async () => {
    await searchIndex.ensureBuilt()
    const id = await createTask({ title: 'Tarea creada después del build' })

    expect(searchIndex.search('despues').map((d) => d.id)).toContain(id)

    await trashTask(id)
    expect(searchIndex.search('despues')).toEqual([])
  })
})
