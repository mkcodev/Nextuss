# Arquitectura común: plugins, eventos y lanzadores

Base sobre la que se apoyan la Virtualización (#97), la página de Plugins (#98), los Lanzadores (#99)
y el Test de entrada (#100). Se construye por capas (#113-#119).

## Plugins (`src/features/plugins/`)

- `registry.ts` es la única lista de módulos. Núcleo fijo: Hoy, Tareas, Proyectos, Planificación.
  El resto se puede desactivar y puede depender de otros (`requires`).
- El estado vive en `Settings.plugins` (solo lo que el usuario cambió; sin definir = `defaultEnabled`).
  `resolveEnabled` y `planToggle` son funciones puras; `setPluginEnabled` guarda con la cascada.
- `usePluginsStore` da una copia síncrona (`isPluginEnabled`) para atajos, motores y reglas.
- Desactivar un plugin **nunca borra datos**. Lo que aporta se declara con un `pluginId` junto a su
  sitio y cada host filtra:
  - navegación, acorde `g` y ayuda: `NavItem.pluginId` + `selectNav`;
  - paleta: `on(id)` y `SEARCH_PLUGIN`;
  - dock: `PanelDef.pluginId` + `isPanelVisible`;
  - tarjetas e indicadores: `<IfPlugin id>`;
  - páginas: `<PluginGate id>` (la ruta sigue existiendo y ofrece reactivar);
  - avisos: `RULES` en `notifications/scheduler.ts`;
  - motores: `PluginEngines`.

## Eventos (`src/lib/events/`)

- `bus.ts`: `emit(type, payload, cause?)` y `on(type, handler)`, tipados con `AppEvents`. `cause` es la
  cadena de lanzadores que provocó el evento (para cortar bucles). En desarrollo,
  `window.__nextussEvents()` devuelve los últimos 200 (sin los ticks).
- `clock.ts`: reloj único de 30 s (`clock.tick`) y `day.firstOpen`, con día lógico que cambia a las
  04:00. La última apertura se guarda en `nextuss-device` (por dispositivo, fuera de las copias).
- Emisores, siempre después de escribir:

  | evento | quién |
  |---|---|
  | `app.opened` | `clock.ts`, una vez por arranque de la app |
  | `task.completed` | `toggleTaskDone`, al pasar a hecha |
  | `habit.logged` | `setHabitLog`, al completarse ese día |
  | `focus.finished` | `logFocusSession` |
  | `checkin.completed` | `upsertCheckIn`, cuando energía, ánimo y foco quedan respondidos |
  | `routine.finished` | `routines/actions.ts#saveRun` |
  | `day.closed` | `DayCloseFlow` al terminar |
  | `virtualization.completed` | la Virtualización (#97) |

- **Con la app cerrada no se guarda ningún evento.** `day.firstOpen` sale al abrir. Los lanzadores
  de hora pueden recuperarse al abrir (#118). `day.closed` no se recupera. El service worker no
  ejecuta lanzadores.

## Lanzadores (`src/features/launchers/`, Dexie v15)

- Tablas `launchers` (regla: disparador, condiciones, acciones; borrado suave; los integrados solo se
  desactivan) y `launcherRuns` (registro; se purga a los 30 días).
- `runner.ts` (puro): `matchLaunchers(evento, lanzadores, contexto)` devuelve qué se dispara y el
  motivo de cada salto: días, franja, una vez al día, «si no se ha hecho», plugin desactivado,
  bienvenida sin terminar, bucle, cadena demasiado larga (4) y tope diario (20).
- Los lanzadores de hora son siempre «una vez al día». Con `catchUpMin`, el primer tick tras abrir la
  app dentro de ese margen los dispara (recuperación sin guardar eventos).
- `actions.ts`: cada acción se registra con `registerLauncherAction(tipo, ejecutor, plugin?)`. Una sin
  ejecutor falla con motivo legible (`virtualization.start` hasta #97).
- `engine.ts`: escucha el bus en fila, ejecuta y apunta `ok`/`error`; los saltos se apuntan salvo los
  de `clock.tick`. Lo monta `PluginEngines` con el plugin Lanzadores activo.
- Límite conocido: la cadena de causas solo pasa de un lanzador al evento que emite él mismo de forma
  síncrona. Un evento que llega después por acción del usuario (terminar la rutina que abrió un
  lanzador) empieza cadena nueva, que es lo que se quiere.

## Integrados y recetas

- `db/builtinLaunchers.ts`: «Empezar el día» (`app.opened` → `dayStart.open`, si no está hecho hoy).
  Se crea al arrancar si falta. Su acción aplica la puerta de siempre (`rituals/dayStartGate.ts` →
  `shouldOpenDayStart`) y, si no hay nada que preparar, se apunta como salto. `TodayView` ya no lo abre.
- Como es un lanzador, con el plugin Lanzadores desactivado «Empezar el día» tampoco se abre.
- `features/launchers/recipes.ts`: «Mañana consciente» (Virtualización → rutina matutina → check-in →
  Hoy; con «Hoy no» pregunta «¿Rutina igualmente?»). `installMorningRecipe(routineId)` la instala y
  desactiva «Empezar el día». La Virtualización (#97) la sembrará cuando exista su acción.
