// Interpreta el texto de «Nuevo reto» («Leer 20 minutos 30 días 2 escudos»): saca la duración y los
// escudos y deja el resto como título. Función pura; el formulario enseña lo detectado en chips y el
// usuario puede corregirlo en los campos.
import { MAX_DURATION_DAYS, MAX_SHIELDS, MIN_DURATION_DAYS } from './custom'

export interface ChallengeDraft {
  title: string
  /** Duración detectada, de 1 a 365. Sin definir si el texto no trae ninguna. */
  days?: number
  /** Escudos detectados, de 0 a 3. Sin definir si el texto no trae ninguno. */
  shields?: number
}

// `\b` no entiende las tildes, por eso el final de palabra se comprueba con una mirada adelante.
const DAYS = /(\d{1,4})\s*d[ií]as?(?![\p{L}\d])/iu
const SHIELDS = /(\d{1,2})\s*escudos?(?![\p{L}\d])/iu
const NO_SHIELDS = /\bsin\s+escudos?(?![\p{L}\d])/iu
/** Conectores que se quedan colgando al quitar la duración («… durante 30 días» → «… durante»). */
const TRAILING = /[\s,;:·–—-]*(?:durante|por|con|y|en|de)?[\s,;:·–—-]*$/iu
const LEADING = /^[\s,;:·–—-]+/u

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function parseChallengeDraft(text: string): ChallengeDraft {
  let rest = text
  const draft: ChallengeDraft = { title: '' }

  const d = DAYS.exec(rest)
  if (d) {
    draft.days = clamp(Number(d[1]), MIN_DURATION_DAYS, MAX_DURATION_DAYS)
    rest = rest.replace(DAYS, ' ')
  }

  const s = SHIELDS.exec(rest)
  if (s) {
    draft.shields = clamp(Number(s[1]), 0, MAX_SHIELDS)
    rest = rest.replace(SHIELDS, ' ')
  } else if (NO_SHIELDS.test(rest)) {
    draft.shields = 0
    rest = rest.replace(NO_SHIELDS, ' ')
  }

  // Quita los conectores sueltos de los extremos, hasta que no quede ninguno («… y con» → «…»).
  let previous: string
  do {
    previous = rest
    rest = rest.replace(TRAILING, '').replace(LEADING, '')
  } while (rest !== previous)

  draft.title = rest.replace(/\s+/g, ' ').trim()
  return draft
}
