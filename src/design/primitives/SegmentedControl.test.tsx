// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'a', label: 'Uno' },
  { value: 'b', label: 'Dos' },
]

describe('SegmentedControl · touch', () => {
  it('con `touch` las opciones miden 44 px en móvil y lo de `size` en escritorio', () => {
    const { container } = render(<SegmentedControl options={OPTIONS} value="a" onChange={() => {}} label="Prueba" touch />)
    const option = container.querySelector('[role=radio]')!
    expect(option.className).toContain('h-11')
    expect(option.className).toContain('md:h-6')
  })

  it('sin `touch` no cambia nada: solo la altura de `size`', () => {
    const { container } = render(<SegmentedControl options={OPTIONS} value="a" onChange={() => {}} label="Prueba" />)
    const option = container.querySelector('[role=radio]')!
    expect(option.className).toContain('h-6')
    expect(option.className).not.toContain('h-11')
  })
})
