// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../../db/schema'
import { PluginSettingsPanel } from './PluginSettingsPanel'
import type { PluginSettingsSpec } from './types'
import type { Settings } from '../../../db/types'

const SPEC: PluginSettingsSpec = {
  fields: [{ kind: 'number', key: 'pomodoroWorkMin', label: 'Foco', unit: 'min', min: 1, max: 180, group: 'Duraciones' }],
  notify: ['notifyPomodoroEnd'],
}

class FakeIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(async () => {
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  await db.settings.put({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22, pomodoroWorkMin: 50 })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderPanel(settings: Settings | undefined, initialEntry = '/plugins/focus') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PluginSettingsPanel spec={SPEC} settings={settings} notificationsEnabled={true} />
    </MemoryRouter>,
  )
}

describe('SettingRow (vía PluginSettingsPanel)', () => {
  it('muestra el punto de "modificado" y restablece al valor por defecto al pulsar ↺', async () => {
    const settings = await db.settings.get(1)
    renderPanel(settings)

    expect((screen.getByLabelText('Foco') as HTMLInputElement).value).toBe('50')
    const restore = screen.getByRole('button', { name: /Restablecer «Foco»/ })
    fireEvent.click(restore)

    await waitFor(async () => {
      const updated = await db.settings.get(1)
      expect(updated?.pomodoroWorkMin).toBe(25) // SETTINGS_DEFAULTS.pomodoroWorkMin
    })
  })

  it('sin diferencia con el default, no muestra el botón de restablecer', () => {
    renderPanel({ id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22, pomodoroWorkMin: 25 })
    expect(screen.queryByRole('button', { name: /Restablecer/ })).toBeNull()
  })
})

describe('enlace profundo', () => {
  it('resalta el campo al llegar con #campo en la URL', async () => {
    const settings = await db.settings.get(1)
    renderPanel(settings, '/plugins/focus#pomodoroWorkMin')

    const row = document.getElementById('pomodoroWorkMin')
    expect(row).toBeTruthy()
    await waitFor(() => expect(row?.className).toContain('bg-accent-soft'))
  })
})
