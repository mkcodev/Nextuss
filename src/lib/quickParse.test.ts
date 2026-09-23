import { describe, expect, it } from 'vitest'
import { dateKey } from './dates'
import { quickParse } from './quickParse'

const NOW = new Date(2026, 8, 22) // martes, 2026-09-22

describe('quickParse', () => {
  it('deja el título intacto cuando no hay tokens', () => {
    expect(quickParse('Preparar la reunión', NOW).title).toBe('Preparar la reunión')
  })

  it('reconoce "mañana"', () => {
    const r = quickParse('Llamar al médico mañana', NOW)
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 8, 23)))
    expect(r.title).toBe('Llamar al médico')
  })

  it('reconoce "pasado mañana" distinto de "mañana"', () => {
    const r = quickParse('Enviar informe pasado mañana', NOW)
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 8, 24)))
  })

  it('reconoce "hoy"', () => {
    const r = quickParse('Revisar correo hoy', NOW)
    expect(r.scheduledDate).toBe(dateKey(NOW))
  })

  it('reconoce un día de la semana futuro', () => {
    const r = quickParse('Cita el viernes', NOW)
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 8, 25)))
  })

  it('usa hoy cuando el día nombrado es el de hoy', () => {
    const r = quickParse('Reunión el martes', NOW)
    expect(r.scheduledDate).toBe(dateKey(NOW))
  })

  it('"próximo" fuerza la semana siguiente aunque coincida el día', () => {
    const r = quickParse('Reunión el próximo martes', NOW)
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 8, 29)))
  })

  it('reconoce "en N días"', () => {
    const r = quickParse('Seguimiento en 3 días', NOW)
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 8, 25)))
  })

  it('reconoce "en N semanas"', () => {
    const r = quickParse('Revisión en 2 semanas', NOW)
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 9, 6)))
  })

  it('reconoce hora HH:mm', () => {
    const r = quickParse('Dentista a las 15:30', NOW)
    expect(r.scheduledStart).toBe('15:30')
    expect(r.title).toBe('Dentista')
  })

  it('reconoce hora en formato "Npm"', () => {
    const r = quickParse('Llamada 3pm', NOW)
    expect(r.scheduledStart).toBe('15:00')
  })

  it('reconoce prioridad !1-!4', () => {
    const r = quickParse('Pagar factura !1', NOW)
    expect(r.priority).toBe(1)
    expect(r.title).toBe('Pagar factura')
  })

  it('ignora una prioridad fuera de rango', () => {
    const r = quickParse('Tarea !9', NOW)
    expect(r.priority).toBeUndefined()
    expect(r.title).toBe('Tarea !9')
  })

  it('reconoce duración en minutos', () => {
    const r = quickParse('Estirar 15m', NOW)
    expect(r.estimateMin).toBe(15)
  })

  it('reconoce duración en horas y minutos', () => {
    const r = quickParse('Sesión de foco 1h30', NOW)
    expect(r.estimateMin).toBe(90)
  })

  it('reconoce etiquetas múltiples', () => {
    const r = quickParse('Comprar leche #casa #compras', NOW)
    expect(r.tagNames).toEqual(['casa', 'compras'])
    expect(r.title).toBe('Comprar leche')
  })

  it('reconoce mención de objetivo', () => {
    const r = quickParse('Escribir capítulo @tesis', NOW)
    expect(r.goalQuery).toBe('tesis')
    expect(r.title).toBe('Escribir capítulo')
  })

  it('combina varios tokens a la vez', () => {
    const r = quickParse('Preparar demo mañana a las 10:00 !2 45m #trabajo @lanzamiento', NOW)
    expect(r.title).toBe('Preparar demo')
    expect(r.scheduledDate).toBe(dateKey(new Date(2026, 8, 23)))
    expect(r.scheduledStart).toBe('10:00')
    expect(r.priority).toBe(2)
    expect(r.estimateMin).toBe(45)
    expect(r.tagNames).toEqual(['trabajo'])
    expect(r.goalQuery).toBe('lanzamiento')
  })
})
