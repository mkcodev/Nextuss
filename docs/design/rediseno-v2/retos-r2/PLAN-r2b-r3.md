# Rediseño v2 · Retos R2b + R3: vistas, selector, resumen en Hoy y cierre del reto

Resumen de lo que se hace en este PR (rama `rediseno-v2/191-retos-r2b-r3`, hacia `rediseno-v2/integracion`, «Parte de #191»). Se agrupan R2b y R3 porque comparten zona de código (la lista de retos, `markChallengeDay` y las filas de marca de hoy). Se ejecuta sin modo plan, como pide la regla de fases pequeñas.

## R2b · Cadena, Horizonte y selector

- **Selector visible** en la cabecera de «Retos propios», solo cuando hay retos propios en marcha (con el vacío no hay lista que cambiar). Es el `SegmentedControl` existente, que ya es un `radiogroup` con flechas, Inicio y Fin, y deja el foco en la opción. Tres opciones: Mezcla (por defecto), Cadena y Horizonte. La preferencia sigue en `uiStore.challengesView` (ya existe desde R1a, con migración de valores desconocidos a Mezcla).
- **Cadena** (`ChallengeListChain`): una tarjeta por reto con la racha, la cadena completa de días (una celda por día, con forma y no solo color, como `DayMark`), «Día N de M», escudos y el botón «Marcar hoy». Los terminados usan la misma tarjeta. La cadena es una imagen con texto resumen para lectores de pantalla (no 66 elementos sueltos); el detalle día a día sigue en el calendario de la ficha.
- **Horizonte** (`ChallengeListHorizon`): una barra por reto sobre un eje de fechas con el marcador de «hoy», con marcas de escudo, «Hoy no» y fallo. La lógica de rango y posiciones es pura (`src/lib/challenges/horizon.ts`) y se prueba aparte. **No depende de arrastrar:** no hay arrastre en ningún sitio; marcar, abrir la ficha y crear usan los mismos botones, teclado y diálogo que las demás vistas (WCAG 2.5.7). A 375 la etiqueta va sobre la barra, sin scroll horizontal.
- Las tres listas comparten contrato (`ChallengeListProps`), `data-challenge-id` y `data-challenge-row`, así que `j`/`k`, `x`, `Enter`, `c` y la devolución del foco al cerrar la ficha funcionan igual en las tres. Cambiar de vista no reinicia nada.

## R3 · Hoy, cierre en el momento, celebración y logros

- **Resumen en Hoy:** una celda ancha «Retos» dentro de «Tu día en números», con el mismo formato que Foco, Tareas y Progreso (`CELL`, `LABEL`, `VALUE`, `META`). Resumen «N de M misiones» y retos por marcar, hasta 3 retos con botón de marcar, mini barra de progreso con marcador de hoy y «quedan N d» o «último día». Enlace a `/retos`. Solo con el plugin `challenges` encendido y si hay misiones o retos en marcha. Marcar desde Hoy celebra igual que en `/retos` (acción de la persona).
- **Cierre en el momento:** al marcar hoy como hecho en el último día de un reto activo, `markChallengeDay` cierra el reto en esa misma transacción (rellena con escudo o fallo los días pasados sin cerrar, calcula «perfecto», da el bonus de XP si la gamificación está activa y pone `completedAt`). Hasta ahora lo cerraba la reconciliación al día siguiente. **Deshacer** la marca del último día reabre el reto y devuelve el bonus. El código de cierre se comparte con `reconcileOne`.
- **Celebración de «reto cumplido»:** al cerrarse por una marca de la persona se lanza la `Celebration` (solo si `celebrationEnabled`) y un aviso «Reto cumplido» con «Deshacer» sustituye al de «Hoy marcado». Ni el deshacer, ni la reconciliación, ni las misiones celebran.
- **Logros:** el sistema existe (`src/lib/achievements.ts`, `unlockAchievement`). Se añaden `first_challenge` (primer reto cumplido), `challenge_perfect` (un reto sin ningún fallo) y `challenges_5` (cinco cumplidos), con su aviso al desbloquear. Igual que tareas y hábitos, no dependen del plugin `gamification` (solo el XP depende de él).
- **Barra móvil:** se revisa a 375 con el enlace de Hoy ya puesto y se anota la conclusión en `retos-r0/README.md` («Impacto en R2»).

## Fuera de alcance

Editar un reto, elegir la fecha de inicio, arrastrar barras, y que «Hoy no» en el último día cierre el reto (lo sigue cerrando la reconciliación del día siguiente). El XP global (#193).
