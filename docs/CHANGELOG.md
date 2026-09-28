# Changelog

## Fase 28b.3 — Indicador de tiempo en la barra superior (#93)
- «Tiempo de hoy» en miniatura junto a los de foco y rutina, con el estilo elegido en Hoy: «Llamada en
  25 min» (regla), anillo + «6 h 02» (anillo) o «11 libres» (bloques). Solo durante la jornada y fuera de
  Hoy; clic lleva a Hoy. Etiqueta accesible con el resumen completo.

## Fase 28b.2 — Tiempo de hoy (#92)
- Tarjeta «Tiempo de hoy» en Hoy (encima de «Ahora»): cuánto queda de la jornada, cuánto de eso está
  libre y cuánto falta para el siguiente bloque. Tres estilos intercambiables, guardados en Ajustes
  (`dayTimeView`): **Regla** (la jornada con tus bloques y la línea de ahora), **Anillo** (lo que queda en
  grande) y **Bloques** (casillas de 30 min libres/ocupadas/pasadas). Se oculta al acabar la jornada.
- En hoy, el aviso de capacidad solo sale si te pasas: su «te quedan x libres» contaba la jornada entera y
  contradecía a la tarjeta.
- `useNowMinutes` pasa a `lib/` para compartirlo.
- Mockups: `docs/design/tiempo/` (se eligieron las tres, con selector).

## Fase 28b.1 — Avisos de transición (#91)
- Aviso 5 min antes de que empiece una tarea programada y al acabarse su hueco si sigue sin hacer (dice
  qué viene después). Si otra tarea empieza justo entonces, basta con su aviso de inicio.
- Interruptor «Transiciones» en Ajustes › Notificaciones.
- Arreglo: dos evaluaciones simultáneas del programador (dos pestañas, doble montaje en desarrollo) ya no
  lanzan `ConstraintError` al apuntar el mismo aviso.

## Fase 28a — Rutinas (#88)
- Dexie v14: tablas `routines` (pasos con duración, hora y días opcionales; papelera y orden manual) y
  `routineRuns` (pasadas, de donde sale «hecha hoy»). Sin `.upgrade()`: tablas nuevas.
- Página `/rutinas` (`g u`, paleta: «Crear rutina» y «Empezar rutina: …»): lista con arrastre, j/k/Enter,
  editor con pasos (Enter añade, Alt+flechas mueve), total y hora de fin.
- Reproductor a pantalla completa con dos vistas intercambiables (`V` o selector): «Paso» (un paso
  enorme con cuenta atrás) y «Línea» (todos los pasos con su hora real o estimada). Las dos llevan barra de
  progreso total y «Terminas a las HH:mm (x min tarde/antes)». Pausa, +1 min, Saltar, Hecho; minimizar a
  un indicador en la barra superior; sobrevive a recargar (reloj real, no ticks).
- Tras suspender el equipo se pone al día de golpe: cada paso vencido acaba en su hora exacta y suena una vez.
- Sonido al cambiar de paso (silenciable) y aviso si la pestaña está oculta; aviso a la hora de la rutina y
  tarjeta «Rutina de ahora» en Hoy (15 min antes hasta 30 min después de su fin). Interruptor «Rutinas» en
  Ajustes › Notificaciones.
- Mockups: `docs/design/rutinas/` (se eligieron A + B combinadas).

## Fase 17 — Convención de carga/error para `useLiveQuery`
- Convención documentada en `docs/CONVENCIONES.md`: `undefined` = cargando, `null` = sin fila; `?? []` solo
  para datos auxiliares; las puertas esperan a todas sus entradas; los errores suben a un límite.
- `getReview`, `getCheckInForDate` y `getRecurrenceRule` devuelven `null` si no existe.
- Bugs: el aviso de revisión semanal ya no aparece mientras carga; "Empezar el día" / "Cerrar el día" esperan
  a `checkin` (y a los hábitos) antes de decidir si abrirse.
- Sin parpadeo de estado vacío en `/tareas`, Planificación, Objetivos, detalle de proyecto y revisión
  semanal (`Skeleton` mientras carga; `GoalSection` acepta `goals` `undefined`).
- `SectionErrorBoundary` (primitivo): un panel del dock que falla ya no tira la pantalla entera.

## Fase 16 — Rendimiento y carga
- Bundle inicial: 1 567 kB -> 166 kB (`index`) + 312 kB (`vendor-react`); ningún chunk supera 500 kB.
  Rutas (salvo Hoy) con `React.lazy` + `Suspense`; Recharts queda tras `/estadisticas` (409 kB).
- SDK de Anthropic (188 kB) solo se descarga al usar la IA: `AiError`/`recordAiUsage` viven en
  `ai/errors.ts` y `client`/`prompts` se cargan con `import()`.
- `CommandPalette` (cmdk) y `TaskBreakdownDialog` se montan (y descargan) en su primera apertura
  (`MountOnFirstOpen`).
- `vendor-react` como chunk estable; todos los chunks siguen en el precache del service worker.
- Resumen: el heatmap anual ya no consulta el año anterior (6 consultas menos).
- `getGoalForTask`/`unlinkTaskFromAllGoals` usan el índice `*taskIds`.
- `RightDock`: el redimensionado va por rAF en estado local y solo persiste al soltar (antes escribía
  localStorage en cada `pointermove`).
- `/tareas`: 100 filas por tanda + "Mostrar más" (en lugar de virtualizar: sin dependencia nueva y sin
  romper la selección con Shift).

## Fase 15 — Interacción
- Arrastre con destino visible (#4): hook `useDragReorder` + `DropIndicator` compartidos por la bandeja
  de tareas, proyectos, hábitos y vistas de `/tareas`. Preview propio del arrastre, fila atenuada y línea
  de inserción antes/después según la mitad de la fila. `reorderNeighbors` corrige un bug: soltar justo
  sobre el vecino inmediato mandaba la fila al principio de la lista.
- "Mañana" / "Próxima semana" (#5) son incrementales: +1 / +7 sobre la fecha actual si es futura; sin
  fecha, hoy o pasada parten de hoy (`nextRelativeDate`, en `TaskQuickMenu` y `TaskForm`).
- Atajos `[` / `]` / `t` en la vista Día (#8), registrados vía `dayNavStore`; `g t` sigue yendo a Tareas.

## Fase 14 — Bugs y pérdida de datos
- `/tareas`: filtros, columnas y orden van a un borrador local (Guardar / Guardar como nueva /
  Restablecer); explorar ya no reescribe las vistas de fábrica.
- Borrar una vista y "Eliminar ya" de la papelera piden confirmación inline.
- `getProject` devuelve `null` para proyectos borrados o inexistentes; el detalle muestra
  "Proyecto no encontrado".
- `Menu` ya no roba el foco al montar.
- `activateHabitEntry` avisa con un toast si falla la escritura.
- La papelera etiqueta proyectos; "Backup" y "Papelera" de la paleta anclan a Ajustes.
- `c` y "Crear" móvil abren una tarea; eliminados los emojis restantes.

## Fase 13 — Premium
- 13.1 Dashboard de proyectos · 13.2 Vista de tareas y vistas guardadas · 13.3 Selección múltiple y
  edición en lote · 13.4 Registro manual de tiempo · 13.5 Plantillas de tarea y de proyecto.
