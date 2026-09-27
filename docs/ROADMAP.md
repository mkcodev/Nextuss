# Hoja de ruta

Estado tras el rediseño (Bloque B completo, 2026-09-26). Cada fase se detalla con su propia pasada de plan-mode solo si tiene
superficie de diseño abierta; las mecánicas se ejecutan directamente. Flujo issue → rama → PR en
`docs/FLUJO.md`. Reglas transversales: una PR
por fase, una versión Dexie por porción entregable (ninguna fase de este plan la necesita), cero emoji
(solo Lucide), nunca `confirm()` nativo, diálogos hermanos en `AppShell` (nunca anidados), y
`npm run build && npm run test -- --run && npm run lint` en verde al cerrar cada fase.

## Bloque A — Mejoras funcionales

| Fase | Contenido | Estado |
|---|---|---|
| 14 | Bugs y pérdida de datos (borrador de vistas en `/tareas`, confirmaciones, `getProject`, foco de `Menu`, emojis) | Hecha |
| 15 | Interacción: issues #4 (arrastre), #5 (Mañana/Próxima semana incremental), #8 (`[`/`]`/`t`) | Hecha |
| 16 | Rendimiento: code-splitting de Recharts (~370 KB) y SDK de Anthropic (~190 KB), `/tareas` con render progresivo | Hecha |
| 17 | Convención de carga/error para `useLiveQuery` (101 usos, 3 patrones) | Hecha |
| 18 | Huecos funcionales (detalle de proyecto, marcadores de XP, tiempo por atributo, `actualMin`, plantillas editables) | Hecha |
| 19 | Accesibilidad y teclado (Alt+flechas para reordenar en todas las listas, Esc/Ctrl+A y `aria-sort` en `/tareas`, j/k en `/proyectos`, separador del panel con teclado) | Hecha |
| 20 | Cobertura de tests: los 15 repositorios y los validadores de IA (382 tests; arreglado `deleteAttribute`) | Hecha |
| 21 | Verificación manual de #7 y #9–#14 con clics reales; arreglados #63 («Esta y futuras» vaciaba la serie) y #64 (reordenar con teclado) | Hecha |
| 24 | IA opcional (#60): sugerir hábitos, generar plantillas de proyecto y proponer tareas de un objetivo. Variante A (botón + revisión) con entrada en línea en objetivos vacíos; mockups en `docs/design/ia/` | Hecha |

## Bloque B — Diseño (después del A)

| Fase | Contenido | Estado |
|---|---|---|
| 22 | Rediseño de `TaskForm` (issue #6) | Hecha (#44) |
| 23 | Sistema de diseño: tokens, primitivos, páginas, estados vacío/carga, motion, colores | Hecha (#39, #41, #43, #52, #55, #56) |

Guía paso a paso, herramientas y prompt: [`docs/design/PLAN-REDISENO.md`](design/PLAN-REDISENO.md).
Orden recomendado dentro del bloque: dirección visual (`DESIGN.md`) → base del sistema (23) → TaskForm (22) → resto.

Decisión cerrada: "Mañana"/"Próxima semana" (#5) suma +1 / +7 días sobre la fecha actual de la
tarea si es futura; sin fecha o en el pasado parte de hoy.
