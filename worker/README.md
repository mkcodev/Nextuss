# Nexus — relay opcional de Telegram

Este worker es **100% opcional**. Nexus funciona sin él: mientras tienes la app abierta en una
pestaña visible, `useTelegramPoller` habla directo con la Bot API (long polling) y no necesita
nada de esto. Este worker solo sirve para recibir mensajes de Telegram **mientras la app está
cerrada** (recepción 24/7), guardarlos, y que la app se los descargue la próxima vez que se abra.

**Aviso importante**: si despliegas esto, el token de tu bot deja de ser un secreto que solo vive
en tu navegador — pasa a estar también en la cuenta de Cloudflare donde lo despliegues (como
webhook de Telegram, no como variable de este worker: el worker nunca ve el token del bot, solo
recibe los mensajes que Telegram le reenvía). Solo despliega esto si estás cómodo con eso.

## Qué hace

- `POST /<SECRET>/webhook` — Telegram llama aquí en cuanto alguien escribe al bot. Guarda el
  mensaje en KV (7 días de TTL) y responde `200` enseguida.
- `GET /<SECRET>/pending` — Nexus llama aquí al abrirse: devuelve los mensajes pendientes.
- `POST /<SECRET>/clear` — Nexus llama aquí tras procesarlos, para vaciarlos.

El worker **nunca** llama a la Bot API ni ejecuta comandos — solo es un buzón. Procesar `/hoy`,
`/add`, etc. y contestar sigue pasando en la app (mismo código que el polling en vivo,
`src/features/telegram/commands.ts`), porque es donde vive la base de datos real.

## Desplegarlo

1. `cd worker && npm install`
2. Crea el namespace de KV: `npx wrangler kv namespace create NEXUS_KV` — copia el `id` que te
   devuelve y pégalo en `wrangler.toml`.
3. Elige un secreto largo y aleatorio (por ejemplo `openssl rand -hex 16`) y guárdalo como
   secreto de Cloudflare, **no** en el código: `npx wrangler secret put SECRET`.
4. `npm run deploy`. Apunta la URL que te da Cloudflare, algo como
   `https://nexus-telegram-relay.tu-cuenta.workers.dev`.
5. Registra el webhook en Telegram (sustituye `<TOKEN>`, `<WORKER_URL>` y `<SECRET>`):
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/<SECRET>/webhook"
   ```
6. En Nexus, Ajustes → Telegram → "URL del worker (opcional)", pega
   `<WORKER_URL>/<SECRET>` (con el secreto, sin `/webhook` al final).

## Quitarlo

`npx wrangler delete` borra el worker. Luego borra el webhook de Telegram con
`curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"` y vacía el campo en Ajustes.
