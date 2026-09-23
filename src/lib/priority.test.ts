import { describe, expect, it } from 'vitest'
import { compareByPriorityThenSortKey } from './priority'

describe('compareByPriorityThenSortKey', () => {
  it('ordena por prioridad ascendente, P1 primero', () => {
    const items = [
      { priority: 3, sortKey: 0 },
      { priority: 1, sortKey: 0 },
      { priority: 2, sortKey: 0 },
    ]
    expect(items.sort(compareByPriorityThenSortKey).map((i) => i.priority)).toEqual([1, 2, 3])
  })

  it('deja sin prioridad siempre al final', () => {
    const items = [
      { priority: undefined, sortKey: 0 },
      { priority: 4, sortKey: 0 },
    ]
    expect(items.sort(compareByPriorityThenSortKey).map((i) => i.priority)).toEqual([4, undefined])
  })

  it('dentro de la misma prioridad, ordena por sortKey', () => {
    const items = [
      { priority: 2, sortKey: 500 },
      { priority: 2, sortKey: 100 },
    ]
    expect(items.sort(compareByPriorityThenSortKey).map((i) => i.sortKey)).toEqual([100, 500])
  })
})
