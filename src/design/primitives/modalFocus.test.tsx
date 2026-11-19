// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { Dialog } from './Dialog'
import { Menu, MenuItem } from './Menu'
import { Sheet } from './Sheet'

/** Una hoja con un botón que abre un diálogo de confirmación encima (como la ficha de un reto). */
function Harness({ fallback }: { fallback?: () => HTMLElement | null }) {
  const [sheet, setSheet] = useState(false)
  const [dlg, setDlg] = useState(false)
  return (
    <>
      <button onClick={() => setSheet(true)}>abrir hoja</button>
      <h1 id="cab" tabIndex={-1}>
        Página
      </h1>
      <Sheet open={sheet} onClose={() => setSheet(false)} labelledBy="t" returnFocusTo={fallback}>
        <h2 id="t">Ficha</h2>
        <button>uno</button>
        <button onClick={() => setDlg(true)}>abrir diálogo</button>
      </Sheet>
      <Dialog open={dlg} onClose={() => setDlg(false)} title="Confirmar">
        <button>cancelar</button>
        <button>aceptar</button>
      </Dialog>
    </>
  )
}

afterEach(cleanup)

const esc = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
const tab = (shift = false) => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: shift })
const gone = (name: string) => waitFor(() => expect(screen.queryByRole('dialog', { name })).toBeNull())

function abrirHoja() {
  const opener = screen.getByText('abrir hoja')
  opener.focus()
  fireEvent.click(opener)
  return opener
}

describe('Sheet', () => {
  it('toma el foco al abrir, lo atrapa con Tab y lo devuelve a quien lo abrió al cerrar con Esc', async () => {
    render(<Harness />)
    const opener = abrirHoja()
    const sheet = await screen.findByRole('dialog', { name: 'Ficha' })
    expect(sheet.contains(document.activeElement)).toBe(true)
    expect(document.activeElement?.textContent).toBe('uno')

    // Tab solo se intercepta en los extremos (en medio lo mueve el navegador): del primero hacia atrás
    // va al último, y del último hacia delante vuelve al primero, sin escaparse a la página.
    tab(true)
    expect(document.activeElement?.textContent).toBe('abrir diálogo')
    tab()
    expect(document.activeElement?.textContent).toBe('uno')

    esc()
    await gone('Ficha')
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })

  it('cierra con un clic en el fondo y no con un clic dentro', async () => {
    render(<Harness />)
    abrirHoja()
    const sheet = await screen.findByRole('dialog', { name: 'Ficha' })
    fireEvent.pointerDown(sheet)
    fireEvent.click(sheet)
    expect(screen.queryByRole('dialog', { name: 'Ficha' })).not.toBeNull()

    const scrim = sheet.parentElement!
    fireEvent.pointerDown(scrim)
    fireEvent.click(scrim)
    await gone('Ficha')
  })

  it('si quien la abrió ya no está (enlace directo), el foco va a `returnFocusTo`', async () => {
    render(<Harness fallback={() => document.getElementById('cab')} />)
    // Sin ningún control enfocado al abrir: el foco estaba en <body>.
    ;(document.activeElement as HTMLElement | null)?.blur()
    fireEvent.click(screen.getByText('abrir hoja'))
    await screen.findByRole('dialog', { name: 'Ficha' })
    esc()
    await gone('Ficha')
    expect(document.activeElement).toBe(document.getElementById('cab'))
  })
})

describe('Dialog', () => {
  it('mantiene su comportamiento: foco inicial, Tab atrapado, Esc cierra y el foco vuelve', async () => {
    function Solo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>abrir</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Solo">
            <button>a</button>
            <button>b</button>
          </Dialog>
        </>
      )
    }
    render(<Solo />)
    const opener = screen.getByText('abrir')
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog', { name: 'Solo' })
    expect(document.activeElement?.textContent).toBe('a')
    tab(true) // del primero hacia atrás: al último del DOM, la X de cerrar
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Cerrar')
    tab() // y del último hacia delante: otra vez al primero
    expect(document.activeElement?.textContent).toBe('a')
    esc()
    await gone('Solo')
    expect(document.activeElement).toBe(opener)
  })
})

describe('foco de origen con un hijo con autoFocus', () => {
  it('Dialog: el foco vuelve al botón que lo abrió aunque un campo de dentro lo tomara al abrir', async () => {
    function ConCampo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>abrir</button>
          <Dialog open={open} onClose={() => setOpen(false)} title="Con campo">
            <input aria-label="nombre" autoFocus />
          </Dialog>
        </>
      )
    }
    render(<ConCampo />)
    const opener = screen.getByText('abrir')
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog', { name: 'Con campo' })
    expect(document.activeElement?.getAttribute('aria-label')).toBe('nombre')
    esc()
    await gone('Con campo')
    expect(document.activeElement).toBe(opener)
  })

  it('Sheet: igual con un botón con autoFocus (como «Marcar hoy» en la ficha)', async () => {
    function ConAccion() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>abrir</button>
          <Sheet open={open} onClose={() => setOpen(false)} labelledBy="h">
            <h2 id="h">Ficha</h2>
            <button>cerrar</button>
            <button autoFocus>acción</button>
          </Sheet>
        </>
      )
    }
    render(<ConAccion />)
    const opener = screen.getByText('abrir')
    opener.focus()
    fireEvent.click(opener)
    await screen.findByRole('dialog', { name: 'Ficha' })
    expect(document.activeElement?.textContent).toBe('acción')
    esc()
    await gone('Ficha')
    expect(document.activeElement).toBe(opener)
  })
})

describe('Menu dentro de una hoja', () => {
  function ConMenu() {
    const [open, setOpen] = useState(true)
    return (
      <Sheet open={open} onClose={() => setOpen(false)} labelledBy="t">
        <h2 id="t">Ficha</h2>
        <Menu trigger={(p) => <button {...p}>más</button>}>
          <MenuItem onSelect={() => {}}>Una</MenuItem>
        </Menu>
      </Sheet>
    )
  }

  it('con el menú cerrado y el foco en su botón, Esc cierra la hoja', async () => {
    render(<ConMenu />)
    await screen.findByRole('dialog', { name: 'Ficha' })
    const trigger = screen.getByText('más')
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'Escape' })
    await gone('Ficha')
  })

  it('con el menú abierto, Esc cierra solo el menú', async () => {
    render(<ConMenu />)
    await screen.findByRole('dialog', { name: 'Ficha' })
    fireEvent.click(screen.getByText('más'))
    await screen.findByRole('menu')
    fireEvent.keyDown(screen.getByText('Una'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    expect(screen.getByRole('dialog', { name: 'Ficha' })).toBeTruthy()
  })
})

describe('pila de modales (un diálogo sobre una hoja)', () => {
  it('solo el de encima atiende Esc y atrapa el foco; al cerrarlo la hoja sigue abierta con su foco', async () => {
    render(<Harness />)
    abrirHoja()
    await screen.findByRole('dialog', { name: 'Ficha' })
    const abrirDlg = screen.getByText('abrir diálogo')
    abrirDlg.focus()
    fireEvent.click(abrirDlg)
    const dlg = await screen.findByRole('dialog', { name: 'Confirmar' })
    expect(dlg.contains(document.activeElement)).toBe(true)

    // Tab en los extremos del diálogo no lo roba la hoja de debajo.
    tab(true)
    expect(dlg.contains(document.activeElement)).toBe(true)
    tab()
    expect(dlg.contains(document.activeElement)).toBe(true)

    esc()
    await gone('Confirmar')
    expect(screen.queryByRole('dialog', { name: 'Ficha' })).not.toBeNull()
    expect(document.activeElement).toBe(abrirDlg) // el foco vuelve al botón que abrió el diálogo
    expect(document.body.style.overflow).toBe('hidden') // la hoja sigue bloqueando el scroll

    act(() => esc())
    await gone('Ficha')
    expect(document.body.style.overflow).toBe('')
  })
})
