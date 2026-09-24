// Cliente de IA (Fase 5.4): llamada directa desde el navegador a la API de Anthropic con la clave
// del usuario (`Settings.claudeApiKey`, guardada en texto plano — ver el aviso en Ajustes). Sin
// backend propio, así que `dangerouslyAllowBrowser` es intencional, no un descuido.
import Anthropic from '@anthropic-ai/sdk'
import { AiError } from './errors'

const MODEL = 'claude-opus-5'

function toAiError(err: unknown): AiError {
  if (err instanceof Anthropic.AuthenticationError) return new AiError('invalid-key', 'Clave de API inválida o revocada.')
  if (err instanceof Anthropic.RateLimitError) return new AiError('rate-limited', 'Límite de peticiones alcanzado. Prueba en un momento.')
  if (err instanceof Anthropic.APIConnectionError) return new AiError('network', 'No se pudo conectar con la API de Anthropic.')
  if (err instanceof Anthropic.APIError) return new AiError('unknown', err.message)
  return new AiError('unknown', err instanceof Error ? err.message : 'Error desconocido')
}

interface CallToolInput<T> {
  apiKey: string
  system: string
  user: string
  tool: Anthropic.Tool
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
  /** Valida y normaliza el `input` crudo del tool_use antes de que nada lo toque — nunca se
   * escribe en la base de datos lo que el modelo devuelve sin pasar por aquí. */
  validate: (raw: unknown) => T
}

async function callTool<T>({ apiKey, system, user, tool, effort = 'medium', maxTokens = 2048, validate }: CallToolInput<T>): Promise<T> {
  if (!apiKey) throw new AiError('no-key', 'No hay clave de API configurada.')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  let response: Anthropic.Message
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      output_config: { effort },
      system,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: user }],
    })
  } catch (err) {
    throw toAiError(err)
  }

  if (response.stop_reason === 'refusal') {
    throw new AiError('malformed', 'El modelo rechazó la petición.')
  }

  const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  if (!block) throw new AiError('malformed', 'El modelo no devolvió una respuesta estructurada.')

  return validate(block.input)
}

/** Prueba mínima de conexión: una petición barata y rápida solo para validar la clave. */
export async function testAiConnection(apiKey: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!apiKey) return { ok: false, message: 'No hay clave configurada.' }
  try {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    await client.messages.create({
      model: MODEL,
      max_tokens: 8,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: 'di "ok"' }],
    })
    return { ok: true }
  } catch (err) {
    const aiErr = toAiError(err)
    return { ok: false, message: aiErr.message }
  }
}

export { callTool, AiError, type Anthropic }
