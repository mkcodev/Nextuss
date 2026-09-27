// Parte ligera del módulo de IA: errores tipados y contador de uso. Vive aparte de `client.ts` para
// que quien solo necesita `AiError`/`recordAiUsage` no arrastre el SDK de Anthropic (~190 KB) al
// bundle inicial — `client.ts` y `prompts.ts` se cargan con `import()` solo al usar la IA.
import { updateSettings } from '../../db/repositories/settings'
import type { AiModel, Settings } from '../../db/types'

export const DEFAULT_AI_MODEL: AiModel = 'claude-sonnet-5'

/** Para el selector de Ajustes — precio orientativo para un solo usuario (~150-300 usos/mes). */
export const AI_MODEL_OPTIONS: { value: AiModel; label: string; priceHint: string }[] = [
  { value: 'claude-haiku-4-5', label: 'Haiku 4.5', priceHint: '~1-2 $/mes' },
  { value: 'claude-sonnet-5', label: 'Sonnet 5', priceHint: '~2-5 $/mes' },
  { value: 'claude-opus-5', label: 'Opus 5', priceHint: '~6-14 $/mes' },
]

export function resolveAiModel(model: AiModel | undefined): AiModel {
  return model ?? DEFAULT_AI_MODEL
}

/** Haiku 4.5 responde 400 si se le manda `output_config.effort` — Sonnet 5 y Opus 5 sí lo aceptan. */
export function modelSupportsEffort(model: AiModel): boolean {
  return model !== 'claude-haiku-4-5'
}

export type AiErrorKind = 'no-key' | 'invalid-key' | 'rate-limited' | 'network' | 'malformed' | 'unknown'

export class AiError extends Error {
  kind: AiErrorKind
  constructor(kind: AiErrorKind, message: string) {
    super(message)
    this.kind = kind
    this.name = 'AiError'
  }
}

/** Incrementa el contador de uso estimado — llamada aparte (no bloqueante) tras cada éxito. */
export async function recordAiUsage(current: Settings | undefined): Promise<void> {
  await updateSettings({ aiUsageCount: (current?.aiUsageCount ?? 0) + 1 })
}
