// Relay opcional (Fase 5.5): recibe el webhook de Telegram 24/7 y guarda los mensajes en KV.
// Nextuss (la app) los descarga y los vacía al abrirse — este worker nunca habla con la Bot API
// directamente más allá de recibir el webhook; procesar comandos y responder sigue siendo cosa de
// la app, que es donde vive la base de datos real del usuario.
export interface Env {
  NEXTUSS_KV: KVNamespace
  SECRET: string
}

interface StoredUpdate {
  update_id: number
  message?: {
    message_id: number
    text?: string
    chat: { id: number }
    date: number
  }
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

const SEVEN_DAYS_SEC = 60 * 60 * 24 * 7

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const segments = new URL(request.url).pathname.split('/').filter(Boolean)
    const [secret, action] = segments

    if (!env.SECRET || secret !== env.SECRET) {
      return new Response('Not found', { status: 404 })
    }

    if (action === 'webhook' && request.method === 'POST') {
      const update = (await readJson(request)) as StoredUpdate | null
      if (update && typeof update.update_id === 'number') {
        const key = `update:${Date.now()}:${update.update_id}`
        await env.NEXTUSS_KV.put(key, JSON.stringify(update), { expirationTtl: SEVEN_DAYS_SEC })
      }
      // Telegram solo necesita un 200 rápido — la app procesa el contenido más tarde.
      return new Response('ok')
    }

    if (action === 'pending' && request.method === 'GET') {
      const list = await env.NEXTUSS_KV.list({ prefix: 'update:' })
      const updates = await Promise.all(
        list.keys.map(async (k) => JSON.parse((await env.NEXTUSS_KV.get(k.name)) ?? 'null') as StoredUpdate | null),
      )
      return Response.json({ updates: updates.filter((u): u is StoredUpdate => u != null), keys: list.keys.map((k) => k.name) })
    }

    if (action === 'clear' && request.method === 'POST') {
      const body = (await readJson(request)) as { keys?: string[] } | null
      await Promise.all((body?.keys ?? []).map((k) => env.NEXTUSS_KV.delete(k)))
      return new Response('ok')
    }

    return new Response('Not found', { status: 404 })
  },
}
