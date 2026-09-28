import { beforeEach, describe, expect, it } from 'vitest'
import { useUndoStore } from './undoStore'

describe('undoStore.undoEntry', () => {
  beforeEach(() => useUndoStore.setState({ past: [], future: [] }))

  it('deshace la entrada indicada aunque no sea la última', async () => {
    const log: string[] = []
    const entry = (label: string) => ({
      label,
      undo: async () => void log.push(`undo ${label}`),
      redo: async () => void log.push(`redo ${label}`),
    })
    const { push, undoEntry } = useUndoStore.getState()
    const first = push(entry('a'))
    push(entry('b'))

    await undoEntry(first)

    expect(log).toEqual(['undo a'])
    expect(useUndoStore.getState().past.map((e) => e.label)).toEqual(['b'])
    expect(useUndoStore.getState().future.map((e) => e.label)).toEqual(['a'])
  })

  it('ignora una entrada que ya no existe', async () => {
    await useUndoStore.getState().undoEntry(999)
    expect(useUndoStore.getState().future).toEqual([])
  })
})
