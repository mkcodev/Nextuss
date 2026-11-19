# Nextuss

Contexto de producto y diseño: `PRODUCT.md` y `DESIGN.md` (fuente de verdad del aspecto). Flujo general
(issue, rama, commits, CI, squash) y reglas heredadas (una versión Dexie por porción, cero emoji, nunca
`confirm()` nativo): `docs/FLUJO.md` y `docs/ROADMAP.md`.

## Rediseño v2 · reglas fijas

Estas reglas mandan sobre `docs/FLUJO.md` mientras dure el rediseño. Lo que no se dice aquí, se sigue
como en `FLUJO.md`.

### Git
- Nunca hacia `main`: todo va a `rediseno-v2/integracion`. Solo el PR final de integración va a `main`.
- Antes de cada fase: `git fetch` y, si `main` avanzó, merge de `main` en la integración.
- Issue, rama desde la integración actualizada, commits pequeños, squash local, `git push -u`, PR con
  «Parte de #N» (sin `Closes`).
- `npm ci` tras cambiar de rama, con `vite preview` parado. Sin cambios ajenos (`git add -p`).
- No tocar `.impeccable/` sin preguntar.

### Planes y fusión
- Plan (modo plan) solo para fases grandes o nuevas. Las pequeñas se ejecutan directamente.
- Cada plan aprobado se copia a `docs/design/rediseno-v2/<fase>/PLAN.md` (`~/.claude/plans` se
  sobrescribe). Si algo del plan no encaja, se dice en el informe del PR con el motivo.
- Agrupar en un solo PR los pasos pequeños que comparten zona de código (por ejemplo, R2b y R3).
- Fusión (squash) por mí en PRs pequeños, si `verify` está en verde y el PR no cambia el comportamiento
  de ningún primitivo ni el esquema de Dexie; avisar después con el hash.
- Necesitan OK explícito: las fases grandes (3 y 4), los cambios de Dexie y el PR final a `main`. En
  esos casos, PARADA al abrir el PR.

### Diseño
- Dirección Línea. Cifras en Instrument Sans con `tabular-nums`; Geist Mono solo donde lo diga `DESIGN.md`.
- Estados con forma y texto, nunca solo color. Contraste de texto mínimo 4,5:1.
- Movimiento solo desde `src/design/motion.ts` (`PRESET`/`motionFor`). Sin bucles ambientales. Con
  `reduced-motion`, solo fundidos.
- `Celebration` solo en la transición no hecho a hecho causada por el usuario, y solo con
  `useCelebrationEnabled()`. Deshacer, importar, sincronizar o cargar no celebran.

### Accesibilidad
- Todo usable con teclado; el foco vuelve a su origen al cerrar fichas y diálogos.
- Arrastrar nunca es la única forma de hacer algo (WCAG 2.5.7).
- Zonas de toque de 44 px en móvil. Sin scroll horizontal a 375.
- Cifras animadas: el lector de pantalla oye solo el valor final.

### Atajos globales
- `n` = nueva tarea en toda la app; no se reasigna en ninguna página. Para crear el elemento propio de
  una página se usa `c`.

### Datos
- XP solo si `gamification` está activa en ese momento (no retroactivo).
- Cambios de Dexie: versión nueva con test de migración real desde la anterior.
- Copias de seguridad: validar antes de escribir; si falla, no se escribe nada.

### Retos
- Las misiones solo salen de datos que la app ya registra (tareas, foco, check-in, hábitos).
- El día se corta a las 00:00 locales con `dateKey`, como Estadísticas.
- Escudos por reto, de 0 a 3. «Hoy no» gasta escudo.

### Entrega de cada PR (repo público)
- Capturas solo de las pantallas y estados que cambian (claro y oscuro, 1440 y 375), sin capturas
  «antes». Solo datos demo, nunca reales.
- GIF solo si el PR añade o cambia movimiento (normal y con `reduced-motion`).
- Scripts de capturas y de humo por CDP en el repo (`docs/design/rediseno-v2/<fase>/`), no en el scratchpad.
- `npm run build`, `npm test` y `npm run lint` en verde; `verify` en verde antes de pedir el merge.
- Medidas frente a la integración: JS inicial gzip, CSS, JS total y precache.
- Audits por PR: `/impeccable audit` y `web-design-guidelines`. `modern-web-guidance` solo una vez,
  antes del PR final a `main`. Si alguno no se pasó, decirlo.
- Comprobar que Virtualización y Cabina siguen bien.
- Cambios de comportamiento en primitivos: señalados en el PR, cada uno con un test que falle sin el cambio.
- Memoria `project_rediseno_visual_v2` al día antes de la parada o del aviso de fusión.
