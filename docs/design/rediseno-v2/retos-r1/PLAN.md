# Rediseño v2 · Retos R1: datos y plugin `challenges` (sin UI de página)

## Contexto

R0 (#191, PR #192, caa0f82) fijó cómo se ven los retos: vista D Mezcla por defecto más Cadena y Horizonte, y las reglas de los datos. R1 construye lo que hay debajo:

- la tabla y la migración a Dexie v18;
- el registro extensible de tipos (`CHALLENGE_KINDS`);
- la lógica pura de racha, escudos y fallo;
- la generación y la evaluación de las misiones;
- el plugin `challenges`;
- la preferencia de vista;
- la entrada en las copias de seguridad.

Sin página: `/retos` es R2. Va hacia `rediseno-v2/integracion`, con «Parte de #191» y PARADA tras cada PR.

**Hallazgos de la exploración que condicionan el plan:**

1. **No hay ninguna prueba de migración real.** Ningún test abre una base v17 y la actualiza. Solo están `migrations.sync.test.ts` (texto) y `backup.test.ts` (importar). Además, `NextussDB` fija el nombre `'nexus'`.
2. **La importación no valida nada** (`src/db/backup.ts:48`). Las tablas que no vienen en la copia se saltan, incluso con `replace`.
3. **El XP no se filtra por `gamification` en la capa de datos.** Tareas, hábitos, objetivos y Virtualización suman XP aunque el plugin esté apagado: solo se oculta la UI. Los retos sí lo filtrarán. Arreglar el resto queda **fuera de R1**: propongo un issue aparte.
4. **No hay ningún gancho de medianoche.** Lo que hay es `clock.tick` (`src/lib/events/clock.ts:36`, cada 30 s, con `date` = `dateKey` local), y se puede reutilizar.
5. **Hay dos cortes de día.** Estadísticas usa `dateKey` a las 00:00 locales (`src/lib/dates.ts:5`). Los lanzadores usan un día lógico que empieza a las 04:00. **Los retos usan `dateKey`, como Estadísticas.**
6. **Los escudos de hábitos son un bote global mensual** (`Progress.shields`, 2 al mes, `src/db/repositories/gamification.ts:26-42`).
7. **`main` ya está dentro de la integración** (88bf48f), así que no hay nada que traer.

## Respuestas a las preguntas de R0 (recomendación)

| Pregunta | Recomendación | Por qué |
|---|---|---|
| ¿Escudos por reto o globales? | **Por reto**, fijados al crear (de 0 a 5; por defecto `floor(días/10)`, con un máximo de 3) y separados del bote mensual de hábitos. No se recargan. | Un reto de 7 días y uno de 66 necesitan presupuestos distintos. Un bote global haría que un hábito te dejara sin escudos para un reto. El mockup ya los enseña por reto. |
| ¿Hora de renovación? | **00:00 local, con `dateKey`**, igual que Estadísticas. No con el día lógico de las 04:00 de los lanzadores. | Lo pides así, y es lo que enseña el mockup («se renuevan a las 00:00»). Las cifras de Hoy y de Estadísticas casan con las misiones. |
| ¿Abandonar o pausar? | **Las dos cosas.**<br>• **Abandonar** pasa el reto a `abandoned`. Conserva el historial y el XP ganado, y no se puede retomar.<br>• **Pausar** empieza **mañana**, porque hoy sigue contando y si no no sería un «Hoy no» gratis. Los días en pausa son neutros: ni rompen ni suman racha, no gastan escudo y alargan `endDate` un día cada uno. Se reanuda cuando quieras. | La pausa hace falta de todos modos para respetar que se apague el plugin (ver abajo). Exponerla al usuario cuesta casi nada. |
| ¿Fallo sin escudos? | **La racha vuelve a 0 y el reto sigue** hasta `endDate`. Al cerrar el último día pasa a `done`. Es `perfect` si no tuvo ningún fallo (los escudos sí se permiten), y solo entonces da el bonus. | Es lo que dice R0 («racha a 0»). Terminar el reto al primer fallo desanima a mitad de camino. El bonus premia la cadena intacta. |
| ¿Qué dato genera cada misión? | El catálogo de abajo. Solo usa tareas, foco, check-in y hábitos. | Es la regla de R0. |

## Modelo de datos (Dexie v18, sin `.upgrade()`: solo tablas nuevas)

```ts
// src/db/types.ts
type ChallengeStatus = 'active' | 'paused' | 'done' | 'expired' | 'abandoned'
interface Challenge {
  id?: number
  kind: string                 // 'daily-mission' | 'custom' en v1; abierto a tipos futuros
  status: ChallengeStatus
  title: string
  startDate: string            // 'YYYY-MM-DD'
  endDate: string              // inclusivo (misión: = startDate)
  params: unknown              // JSON propio del tipo, sin índice; lo valida su módulo
  xpAwarded: number            // XP de misión o bonus final; el deshacer resta exactamente esto
  pausedSince?: string         // dateKey desde el que cuenta la pausa
  pausedBy?: 'user' | 'plugin'
  createdAt: number; updatedAt: number; completedAt?: number
  deletedAt: number            // 0 = vivo (papelera, como tasks)
  sortKey: number
}
type ChallengeDayState = 'done' | 'shield' | 'skip' | 'fail' | 'pause' // skip = «Hoy no»
interface ChallengeDay { id?: number; challengeId: number; date: string; state: ChallengeDayState; xp: number; at: number }
```

```ts
this.version(18).stores({                        // Retos (#191 R1)
  challenges: '++id, kind, status, startDate, endDate, deletedAt, sortKey, [kind+startDate]',
  challengeDays: '++id, challengeId, date, at, &[challengeId+date]',
})
```

- **Por qué hay una tabla de días:** el calendario, el registro y la racha necesitan una fila por día, y el índice `&[challengeId+date]` impide duplicados. Las misiones no usan esta tabla, porque viven un solo día y guardan su progreso en `params`.
- **Comentarios a actualizar:** los de `schema.ts:219-221` y `types.ts:274-276`, porque la Fase 29 (#105) pasa a **v19**.
- **Constructor:** `NextussDB` pasa a `constructor(name = 'nexus')` para poder probar la migración con otro nombre. El comportamiento no cambia.
- **Papelera:** `challenges` entra en `TrashableTable`, y `purgeTrashEntry` borra también sus `challengeDays`.

## Registro `CHALLENGE_KINDS` (extensible sin migración)

`src/features/challenges/kinds/index.ts`, al estilo de `PLUGIN_SETTINGS`:

```ts
interface ChallengeKindModule<P> {
  kind: string
  parseParams(raw: unknown): P | null              // lectura e importación; null = fila no válida
  daily(ctx: DailyCtx): Promise<void>              // generar o cerrar (misiones) / reconciliar (propios)
  summarize(ch: Challenge, days: ChallengeDay[], today: string): ChallengeSummary // lo común que pintan las 3 vistas
  ui?: unknown                                     // plantilla de UI: hueco para R2
}
```

- **Un tipo desconocido** (por ejemplo, de una versión futura) se conserva en la base y en las copias, pero no se mantiene ni se muestra.
- **Añadir un tipo** consiste en registrar un módulo más, con su `params`, sin cambiar de versión.
- **`custom`:** `params = { durationDays, shields }`. Más adelante caben `weekdays` y lo que haga falta sin migrar.
- **`daily-mission`:** `params = { template, source, target, progress, refs? }`.

## Lógica pura (`src/lib/challenges/`, con tests)

**`customStreak.ts`**
- `summarizeCustom(ch, days, today)` devuelve:
  - la racha actual y la mejor;
  - los escudos que quedan;
  - las cuentas de hecho, escudo, «Hoy no», fallo y pausa;
  - el cumplimiento;
  - «día N de M»;
  - el estado de hoy.
- Reglas:
  - El escudo, el «Hoy no» y la pausa conservan la racha sin alargarla, como en `calculateStreak` de hábitos.
  - El fallo la deja en 0.
  - Hoy sin marcar nunca rompe.

**`reconcileCustom(ch, days, today)`** devuelve las filas a insertar y los cambios en el reto.
- **Qué días recorre:** cada día sin fila en `[startDate, min(endDate, ayer)]`, en orden cronológico. Así, tras días sin abrir la app, los escudos se gastan primero en los días más antiguos.
- **Qué escribe en cada uno:**
  - si está en pausa, `pause` y `endDate + 1`;
  - si no, y quedan escudos, `shield`;
  - si no quedan, `fail`.
- **Al pasar `endDate`:** el reto pasa a `done`, con `perfect` y el bonus.
- **Es idempotente.**

**`dayRange.ts`:** recorre las claves de día con `parseDateKey` y `addDays`, de modo que el cambio de hora no salta ni repite días.

**`missionCatalog.ts`:** `generateMissions(date, history, enabledSources, count)`.
- **Es determinista:** usa un PRNG con semilla en el `dateKey`, así que regenerar el mismo día da lo mismo.
- **Reparte por fuentes:** como mucho una misión por fuente, hasta `count`.
- **Plantillas,** con objetivos calculados sobre días ANTERIORES (sin hoy) y fijados al generar:

| Plantilla | Fuente | Cuándo puede salir | Objetivo | XP |
|---|---|---|---|---|
| `tasks.complete-n` | Tareas | ≥1 tarea raíz completada en los 14 días anteriores | mediana de las completadas por día activo, más 1, entre 2 y 8 | 15 |
| `tasks.high-priority` | Tareas | hay alguna tarea abierta de prioridad 1 | 1 | 10 |
| `focus.minutes` | Foco (plugin `focus`) | ≥1 sesión en los 7 días anteriores | `max(15, media anterior × 1,1)`, redondeado a 5 y con un máximo de 120 (reutiliza `summarizeFocus`) | 15 |
| `checkin.answer` | Check-in (plugin `checkin`) | ≥1 check-in respondido alguna vez | responder los 3 valores | 10 |
| `habits.all-today` | Hábitos (plugin `habits`) | ≥1 hábito no periódico programado hoy (`isHabitScheduledOn`) | todos los de `refs.habitIds`, fijados al generar | 20 |

- **Primer día sin historial:** si no puede salir ninguna, no se genera nada. La nota «tus primeras misiones llegan mañana» es de R2.

**`missionEval.ts`:** `evaluateMission(params, snapshot)` devuelve el progreso.
- Reutiliza las consultas de Estadísticas: `getTasksCompletedInRange`, `getFocusSessionsInRange`, `getHabitLogsInRange` y `getCheckInForDate`.
- Cuenta solo las tareas raíz, como `countTasks` en `todayNumbersData.ts`.
- Una sesión de foco cuenta en el día en que **empieza**, igual que en `aggregate.ts:77`.

## Ciclo diario y motor

- **`src/db/repositories/challenges.ts`:**
  - `ensureDailyMissions(today)`: dentro de una transacción `rw`, solo genera si no hay ninguna `daily-mission` con `startDate = today`. Así es seguro con varias pestañas.
  - `closeMissions(beforeDate)`: las misiones activas de días pasados pasan a `expired`, sin penalización.
  - `syncMissionProgress(today)`: escribe el progreso. Al llegar al objetivo la misión pasa a `done` y suma XP. **Si el dato baja el mismo día** (deshaces una tarea), vuelve a `active` y resta exactamente su `xpAwarded`, como el deshacer de una tarea. Una vez cerrado el día, ya no cambia.
  - `reconcileChallenges(today)`.
  - Las operaciones de los retos propios, para R2:
    - `createChallenge`, validado (título de 1 a 80; de 1 a 365 días; de 0 a 5 escudos; empieza hoy o hasta 30 días después);
    - `markToday` y `unmarkToday` (solo hoy; los días pasados los cierra la reconciliación);
    - `skipToday` (solo si queda algún escudo, y se puede deshacer en el día);
    - `pause` y `resume`, `abandon`, y `trash` (con `trashRows`).
- **`ChallengesEngine`** se monta en `PluginEngines.tsx`, así que solo existe con el plugin encendido. No pinta nada (`null`).
  1. Al montarse, y en cada `clock.tick` cuyo `date` cambia, ejecuta `closeMissions`, `reconcileChallenges` y `ensureDailyMissions`.
  2. Con `useLiveQuery` sobre tareas, foco, check-ins y registros de hábitos de hoy (nunca sobre `challenges`, para no entrar en bucle), ejecuta `syncMissionProgress`.

## Plugin `challenges`

- **Alta:** se añade a `PLUGIN_IDS` (`types.ts:4`) y a `registry.ts`. Nombre «Retos», categoría `motivacion`, `enhances: ['gamification']` y sin `appView` (llega en R2).
- **`defaultEnabled: false` en R1 y `true` en R2a.** Así no se generan misiones ni se suma XP de forma invisible mientras no hay página. No llega a producción, porque la integración no despliega.
- **`settingsSpec.ts`:**
  - un campo `missionsPerDay` (segmentado, con 1, 2 o 3; por defecto 3) en `Settings` y `SETTINGS_DEFAULTS`, más su regla en `settingsTransfer.RULES`, que lo exige al compilar (entero de 1 a 3);
  - `dataSummary`: retos activos y misiones cumplidas;
  - `lastActivityAt`: el último `challengeDays.at`.
  - Se registra en `PLUGIN_SETTINGS`.

**XP**
- Se aplica con `applyXpDelta` **solo si `isPluginEnabled('gamification')`** en ese momento. Si está apagado, se guarda `xp`/`xpAwarded = 0` y no se reparte con efecto retroactivo al encenderlo.
- Cantidades:
  - las misiones, lo de la tabla;
  - cada día hecho de un reto propio, `XP_PER_CHALLENGE_DAY = 5`;
  - el bonus por terminar `perfect`, `min(2 × días, 150)`.
- Las constantes van en `src/lib/xp.ts`.

**Apagar el plugin = pausa automática**
- Un observador de `usePluginsStore` (`subscribe`, que ignora la carga inicial) detecta cuándo `challenges` pasa de encendido a apagado. Entonces pausa todos los retos activos con `pausedBy: 'plugin'`, desde mañana. Al volver a encenderlo, reanuda solo los que tienen `pausedBy: 'plugin'`.
- Cubre el interruptor, el deshacer y la importación de ajustes, porque todos pasan por `Settings.plugins`.
- Mientras el plugin está apagado:
  - no se generan misiones;
  - no se suma XP;
  - no se reconcilia nada;
  - se conservan los datos.
- La misión del día del apagado caduca (`expired`) al volver a encenderlo.

## Preferencia de vista

- `src/app/uiStore.ts` tiene un campo nuevo, `challengesView: 'mix' | 'chain' | 'horizon'`, con `'mix'` por defecto, y su setter. Uso nombres con significado en vez de `d`/`b`/`c`.
- `persist` pasa de la versión 5 a la 6. `migrate` convierte cualquier valor desconocido (como `'a'` o basura) en `'mix'`.
- No toca Dexie, ni `Settings`, ni la exportación.

## Exportar, importar y copia de seguridad

- **Copia completa y automática (#103):** `exportDatabase` ya vuelca todas las tablas, así que `challenges` y `challengeDays` entran sin tocar nada. La copia de v18 lleva `version: 18`. Una copia de v18 en una app de v17 ya se rechaza (`BackupVersionMismatchError`).
- **Importar una copia de v≤17:** no trae retos.
  - **Cambio que propongo:** en modo `replace`, vaciar también las tablas **que no existían en la versión de la copia** (hoy se salta lo que no viene). Si no, «reemplazar» dejaría los retos actuales mezclados con datos viejos. El modo `merge` no cambia.
- **Validación nueva**, solo de las tablas de retos (`validateChallengeTables` en `src/db/backupValidate.ts`). Corre antes de escribir nada, y si falla no se escribe nada.
  - **Qué rechaza** con un error claro (qué tabla y qué fila):
    - `kind` que no sea texto;
    - `status` fuera de la lista;
    - fechas sin el patrón `YYYY-MM-DD`;
    - `endDate` anterior a `startDate`;
    - un `challengeDays` con un `state` desconocido o un `[challengeId+date]` duplicado.
  - **Qué no rechaza:** un `params` que no cumpla su tipo. Esa fila se queda en la base y se ignora al leerla (`parseParams` devuelve `null`).
  - **Días huérfanos:** se descartan.
  - **Un `kind` desconocido:** se conserva.
- **Exportar ajustes:** solo `missionsPerDay`, más el estado del plugin, que ya viaja en `plugins`.
- **Queda fuera de la exportación:** la vista elegida, que va por dispositivo.

## Tests

- **`customStreak.test.ts`:**
  - racha con escudo, «Hoy no», pausa y fallo, más la mejor racha;
  - un hueco de varios días que gasta los escudos del más antiguo al más nuevo, y el siguiente es un fallo;
  - hoy sin marcar no rompe;
  - el cierre en `endDate` con `perfect` o sin él;
  - la pausa alarga `endDate`;
  - la reconciliación es idempotente;
  - un rango que cruza el cambio de hora de marzo y de octubre.
- **`missionCatalog.test.ts`:**
  - es determinista para la misma fecha;
  - como mucho una por fuente y como mucho `count`;
  - respeta los plugins apagados;
  - el primer día sin historial no da nada;
  - los objetivos se calculan sobre días anteriores, sin contar hoy;
  - los límites de los objetivos.
- **`missionEval.test.ts` (límite de medianoche):**
  - una tarea a las 23:59:59.999 cuenta el día D, y a las 00:00:00.000 cuenta el día D+1;
  - una sesión de foco que empieza a las 23:50 cuenta el día D;
  - las subtareas no cuentan;
  - check-in a medias = 0.
- **`challenges.repo.test.ts`:**
  - `ensureDailyMissions` es idempotente;
  - `closeMissions` pasa las misiones a `expired`;
  - en `syncMissionProgress`, si el dato baja, se resta el XP;
  - XP con `gamification` apagado = 0 y sin `applyXpDelta`;
  - `skipToday` sin escudos falla;
  - pausar y reanudar por plugin;
  - la papelera, y la purga que borra los días.
- **`schema.migration.test.ts` (nuevo patrón):**
  1. Crear un `Dexie('mig-v17-test')` con el esquema de v17. Se saca por introspección de las tablas de `NextussDB`, menos las dos nuevas; si eso falla, se copia literal en un fixture.
  2. Sembrar tareas, hábitos con sus registros, ajustes y progreso, y cerrar.
  3. Abrir `new NextussDB('mig-v17-test')`.
  4. Comprobar:
     - `verno === 18`;
     - las filas siguen intactas;
     - las tablas nuevas están vacías;
     - los índices `[kind+startDate]` y `&[challengeId+date]` funcionan, incluido que el segundo rechaza duplicados.
- **`backup.test.ts`, casos nuevos:**
  - ida y vuelta de una copia de v18 con retos;
  - importar una de v17 con `replace` vacía los retos;
  - una fila no válida rechaza la importación sin escribir nada.
- **También:** `uiStore` (migración de la 5 a la 6 y valor desconocido igual a `'mix'`), `settingsTransfer` (`missionsPerDay`) y las de registro y `settingsSpec`, que ya existen y fallarán si falta algo.

## Entrega: 2 PRs hacia la integración, con PARADA tras cada uno

- **R1a · Datos**, en `rediseno-v2/191-retos-r1a-datos`. Lleva:
  - los tipos;
  - la v18 y el constructor con nombre;
  - los comentarios v18 → v19;
  - la papelera;
  - el repositorio base (crear, leer y operaciones de los retos propios);
  - la validación y el `replace` de la importación;
  - `challengesView` en `uiStore`;
  - los tests de migración, de copia y de `uiStore`.
- **R1b · Lógica y plugin**, en `rediseno-v2/191-retos-r1b-plugin`, que sale de la integración después de R1a. Lleva:
  - `src/lib/challenges/*`;
  - `CHALLENGE_KINDS`;
  - el motor;
  - el plugin y `settingsSpec`;
  - `missionsPerDay`;
  - el XP;
  - la pausa por plugin;
  - los tests de lógica y de repositorio.
- **En los dos:**
  - commits pequeños;
  - `npm ci` (con `vite preview` parado);
  - `npm run build`, `npm test` y `npm run lint`;
  - medidas del precache;
  - «Parte de #191»;
  - squash merge solo con tu OK.
- **Issue aparte (propuesta, no se toca en R1):** que el XP de tareas, hábitos, objetivos y Virtualización respete `gamification`.

## Archivos críticos

- `src/db/schema.ts` y `src/db/types.ts`, más `src/db/trash.ts`.
- `src/db/backup.ts`, más el nuevo `src/db/backupValidate.ts`.
- El nuevo `src/db/repositories/challenges.ts`. Se reutilizan `applyXpDelta` y las consultas de `stats.ts`, `checkins.ts` y `habits.ts`.
- El nuevo `src/lib/challenges/*`. Se reutilizan `src/lib/dates.ts`, `src/lib/xp.ts` y `summarizeFocus` y `countTasks` de `src/features/today/todayNumbersData.ts`.
- El nuevo `src/features/challenges/` (`kinds/`, `ChallengesEngine.tsx`, `settingsSpec.ts` y `pluginWatch.ts`).
- En `src/features/plugins/`: `types.ts`, `registry.ts`, `PluginEngines.tsx` y `settings/index.ts`.
- `src/features/settings/settingsTransfer.ts`, más `SETTINGS_DEFAULTS`.
- `src/app/uiStore.ts`.

## Verificación

- `npm test`: todo en verde, más los nuevos (lógica, medianoche, migración, copia y `uiStore`).
- Humo manual en `vite preview` por CDP (script en el scratchpad):
  1. encender el plugin;
  2. ver que se generan misiones en `challenges`;
  3. completar tareas y ver que la misión llega a `done` y suma XP;
  4. deshacer y ver que se resta;
  5. apagar `gamification` y ver que da XP 0;
  6. apagar `challenges` y ver que el reto pasa a `paused`;
  7. exportar e importar la copia.
- Comprobar que Virtualización y Cabina no se rompen.
