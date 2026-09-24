import { describe, expect, it } from 'vitest'
import { dropPositionFromPointer, reorderNeighbors } from './reorder'

const items = [
  { id: 1, sortKey: 10 },
  { id: 2, sortKey: 20 },
  { id: 3, sortKey: 30 },
  { id: 4, sortKey: 40 },
]
const getId = (i: { id: number }) => i.id

describe('reorderNeighbors', () => {
  it('antes del primero: sin vecino anterior', () => {
    expect(reorderNeighbors(items, getId, 3, 1, 'before')).toEqual({ before: null, after: 10 })
  })

  it('después del último: sin vecino posterior', () => {
    expect(reorderNeighbors(items, getId, 1, 4, 'after')).toEqual({ before: 40, after: null })
  })

  it('entre dos filas, ignorando al propio arrastrado', () => {
    expect(reorderNeighbors(items, getId, 4, 2, 'before')).toEqual({ before: 10, after: 20 })
    expect(reorderNeighbors(items, getId, 1, 3, 'before')).toEqual({ before: 20, after: 30 })
  })

  it('bajar una fila: "después" de la siguiente, no al principio (bug del cálculo anterior)', () => {
    expect(reorderNeighbors(items, getId, 2, 3, 'after')).toEqual({ before: 30, after: 40 })
    // subir justo encima del vecino inmediato ya no manda la fila a la cabeza
    expect(reorderNeighbors(items, getId, 2, 3, 'before')).toBeNull()
  })

  it('devuelve null si no cambia nada o el destino no existe', () => {
    expect(reorderNeighbors(items, getId, 2, 2, 'before')).toBeNull()
    expect(reorderNeighbors(items, getId, 2, 1, 'after')).toBeNull()
    expect(reorderNeighbors(items, getId, 2, 99, 'before')).toBeNull()
  })
})

describe('dropPositionFromPointer', () => {
  const rect = { top: 100, left: 50, width: 200, height: 40 }
  it('eje vertical: mitad superior = before, inferior = after', () => {
    expect(dropPositionFromPointer(rect, { x: 60, y: 110 })).toBe('before')
    expect(dropPositionFromPointer(rect, { x: 60, y: 130 })).toBe('after')
  })
  it('eje horizontal usa X', () => {
    expect(dropPositionFromPointer(rect, { x: 80, y: 130 }, 'horizontal')).toBe('before')
    expect(dropPositionFromPointer(rect, { x: 200, y: 110 }, 'horizontal')).toBe('after')
  })
})
