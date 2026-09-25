# Hoja de ruta

Estado tras la Fase 17. Cada fase se detalla con su propia pasada de plan-mode solo si tiene
superficie de diseño abierta; las mecánicas se ejecutan directamente. Reglas transversales: un commit
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
| 18 | Huecos funcionales (detalle de proyecto, marcadores de XP, tiempo por atributo, `actualMin`, plantillas editables) | Pendiente |
| 19 | Accesibilidad y teclado (`useListNav` en `/tareas`, reordenar sin arrastrar, `tablist` real) | Pendiente |
| 20 | Cobertura de tests (8 de 15 repositorios sin test) | Pendiente |
| 21 | Verificación manual: issues #7, #9, #10, #11, #12, #13, #14 | Pendiente |

## Bloque B — Diseño (después del A)

| Fase | Contenido | Estado |
|---|---|---|
| 22 | Rediseño de `TaskForm` (issue #6) — con plan-mode propio | Pendiente |
| 23 | Sistema de diseño: tokens, primitivos, páginas "ensambladas", estados vacío/carga, motion, colores | Pendiente |

Decisión cerrada: "Mañana"/"Próxima semana" (#5) suma +1 / +7 días sobre la fecha actual de la
tarea si es futura; sin fecha o en el pasado parte de hoy.
