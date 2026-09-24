// Parte ligera del módulo de IA: errores tipados y contador de uso. Vive aparte de `client.ts` para
// que quien solo necesita `AiError`/`recordAiUsage` no arrastre el SDK de Anthropic (~190 KB) al
// bundle inicial — `client.ts` y `prompts.ts` se cargan con `import()` solo al usar la IA.
import { updateSettings } from '../../db/repositories/settings'
import type { Settings } from '../../db/types'

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
