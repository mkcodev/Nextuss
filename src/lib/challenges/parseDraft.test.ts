import { describe, expect, it } from 'vitest'
import { parseChallengeDraft } from './parseDraft'
import { missionFraction, missionProgressText } from './missionLabels'
import { CHALLENGE_TEMPLATES } from './templates'
import { MAX_SHIELDS } from './custom'

describe('parseChallengeDraft', () => {
  it('saca duración y escudos y deja el resto como título', () => {
    expect(parseChallengeDraft('Leer 20 minutos 30 días 2 escudos')).toEqual({ title: 'Leer 20 minutos', days: 30, shields: 2 })
  })

  it('un texto sin duración ni escudos solo trae título', () => {
    expect(parseChallengeDraft('  Beber agua  ')).toEqual({ title: 'Beber agua' })
  })

  it('acepta singular, sin tilde y mayúsculas', () => {
    expect(parseChallengeDraft('Meditar 1 DIA 1 escudo')).toEqual({ title: 'Meditar', days: 1, shields: 1 })
    expect(parseChallengeDraft('Correr 21 dias')).toEqual({ title: 'Correr', days: 21 })
  })

  it('«sin escudos» da 0 escudos', () => {
    expect(parseChallengeDraft('Sin azúcar 21 días sin escudos')).toEqual({ title: 'Sin azúcar', days: 21, shields: 0 })
  })

  it('quita el conector que queda colgando', () => {
    expect(parseChallengeDraft('Leer durante 30 días')).toEqual({ title: 'Leer', days: 30 })
    expect(parseChallengeDraft('30 días: escribir diario')).toEqual({ title: 'escribir diario', days: 30 })
  })

  it('limita la duración a 1–365 y los escudos a 0–3', () => {
    expect(parseChallengeDraft('Algo 999 días 9 escudos')).toEqual({ title: 'Algo', days: 365, shields: MAX_SHIELDS })
    expect(parseChallengeDraft('Algo 0 días')).toEqual({ title: 'Algo', days: 1 })
  })

  it('«20 minutos» o «dias» dentro de otra palabra no se toman por duración', () => {
    expect(parseChallengeDraft('Leer 20 minutos')).toEqual({ title: 'Leer 20 minutos' })
    expect(parseChallengeDraft('Entrenar 3 diaria')).toEqual({ title: 'Entrenar 3 diaria' })
  })

  it('si solo hay duración, el título queda vacío (el formulario lo exige)', () => {
    expect(parseChallengeDraft('30 días 2 escudos')).toEqual({ title: '', days: 30, shields: 2 })
  })
})

describe('plantillas', () => {
  it('cumplen los límites del repositorio (escudos de 0 a 3, título de 1 a 80)', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(3)
    for (const t of CHALLENGE_TEMPLATES) {
      expect(t.shields).toBeGreaterThanOrEqual(0)
      expect(t.shields).toBeLessThanOrEqual(MAX_SHIELDS)
      expect(t.title.length).toBeGreaterThan(0)
      expect(t.title.length).toBeLessThanOrEqual(80)
    }
  })
})

describe('textos de misión', () => {
  it('el progreso no pasa del objetivo y los minutos llevan unidad', () => {
    expect(missionProgressText({ template: 'tasks.complete-n', target: 5, progress: 3 })).toBe('3 de 5')
    expect(missionProgressText({ template: 'focus.minutes', target: 45, progress: 60 })).toBe('45 de 45 min')
    expect(missionFraction({ target: 4, progress: 1 })).toBe(0.25)
    expect(missionFraction({ target: 0, progress: 1 })).toBe(0)
  })
})
