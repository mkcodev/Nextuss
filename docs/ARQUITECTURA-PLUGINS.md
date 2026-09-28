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
