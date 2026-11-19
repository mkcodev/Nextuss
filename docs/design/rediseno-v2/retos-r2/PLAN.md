# Rediseño v2 · Retos R2a: página `/retos` con la vista D Mezcla

## Contexto

R0 (caa0f82) fijó el aspecto de los retos: la vista D Mezcla por defecto y una base común (misiones, ficha, crear, vacío, celebración y atajos). R1a (0931625) y R1b (c178691) construyeron los datos, la lógica, el motor y el plugin `challenges`. Lo hicieron sin página y con `defaultEnabled: false`.

R2a añade la página `/retos` con la vista D y toda la base común, y enciende el plugin por defecto. Las vistas Cadena y Horizonte, y el selector visible, quedan para R2b. El resumen en Hoy, los logros y la celebración al cumplir un reto entero quedan para R3.

Va en un solo PR hacia `rediseno-v2/integracion`, con «Parte de #191», y termina en PARADA.

**Hallazgos que condicionan el plan:**
- `appView` es solo metadato: no crea la ruta. Una página nueva toca cuatro sitios:
  - `src/app/router.tsx`, con `lazyNamed` y `<PluginGate id="challenges">`;
  - `src/app/navItems.ts`, que alimenta la barra lateral, el breadcrumb y la paleta;
  - `registry.ts`;
  - `registry.test.ts`.
- `Settings.plugins` solo guarda lo que el usuario cambió (`resolve.ts:13`). Con `defaultEnabled: true`, el plugin se enciende para todos los que no lo tocaron.
- No existe ningún primitivo de hoja lateral. `Dialog` ya atrapa el foco y lo devuelve al cerrar (`Dialog.tsx:71,122`). `MobileDockSheet` también lo devuelve, pero no atrapa el foco.
- Marcar el último día no cierra el reto en el momento: `reconcileOne` lo pasa a `done` al día siguiente. Por eso la celebración de «reto entero cumplido» es de R3, y en R2a solo se celebra marcar un día.
- La demo no siembra retos. Su rango termina ayer: hoy queda limpio.
- Teclas globales: `n` = tarea (no se toca); `c`, `j`, `k` y `Enter` pasan por `useListNav`; `x` está libre como tecla suelta.

## Decisiones del usuario (2026-11-19)

- **`n` sigue siendo tarea**, como en Hábitos. En `/retos`, `c` abre «Nuevo reto». La regla global de `n` no se toca. La pista de la página dice «c nuevo reto», y la ayuda de atajos incluye `/retos` con `c`, `j`/`k` y `x`.
- **Se amplía `demoSeed`.** Lleva de 3 a 4 retos propios cuyo historial cubre todos los estados:
  - hecho, escudo, «Hoy no» y fallo;
  - uno en pausa;
  - uno cumplido `perfect` y otro cumplido con fallos.
  Lleva también misiones de días pasados (`done` y `expired`). Escudos siempre de 0 a 3. `clearDemoData` lo borra todo, incluidos los `challengeDays`. Sin XP si la gamificación está apagada. Con su test.
- **En móvil, Retos va al menú del avatar** (`MOBILE_EXCLUDED` y `AVATAR_NAV_ROUTES`). La barra inferior se queda con 4 destinos. **Nota para el plan y para el README de retos:** «revisar tras R3, cuando el resumen de Hoy enlace a `/retos`; si se echa en falta, reconsiderar la barra».

## Ajustes del usuario al aprobar (2026-11-19)

1. **Eliminar:** «Más acciones» de la ficha añade «Eliminar», también en los retos terminados. Manda el reto a la papelera con `trashChallenge` (es decir, `trashRows`) y enseña un toast con «Deshacer». No pide confirmación, porque se puede deshacer y recuperar de la papelera. Con su test. Editar sigue fuera de alcance.
2. **Título obligatorio:** nunca se guarda «Reto sin nombre». Si el título queda vacío tras interpretar el texto, «Crear reto» se desactiva y sale el error bajo el campo. El test se ajusta a esto.
3. **`useModalFocus`:** el humo por CDP abre y cierra con el teclado al menos 3 `Dialog` de otras páginas: crear hábito, un diálogo de Ajustes y el de restaurar copia. Comprueba que el foco queda atrapado y vuelve a su origen, igual que antes.
4. **Squash local antes del push.**
5. **El informe incluye:**
   - las medidas frente a c178691: JS inicial gzip, CSS, JS total y precache;
   - el humo;
   - las capturas antes y después;
   - los GIF;
   - los audits.
   PARADA al abrir el PR, antes de fusionar. R2b no empieza sin OK.

## Diseño

### Ruta, navegación, paleta y plugin
- **Ruta:** `{ path: '/retos/:id?', element: <PluginGate id="challenges"><ChallengesPage/></PluginGate> }`.
  - Un solo segmento opcional, para que la página no se desmonte al abrir o cerrar la ficha.
  - Así funcionan el enlace directo, el botón «atrás» y la devolución del foco.
  - Con el plugin apagado, `PluginGate` ya enseña «Activar Retos».
- **`NAV_ITEMS`:** `{ to: '/retos', label: 'Retos', icon: Flag, goKey: 'e', pluginId: 'challenges' }`. La `e` está libre (comprobar `EXTRA_GO_ITEMS`). La barra lateral, el breadcrumb, el grupo «Ir a» de la paleta y la ayuda de atajos lo recogen solos.
- **Móvil:** `/retos` entra en `MOBILE_EXCLUDED` (`MobileNav.tsx`) y en `AVATAR_NAV_ROUTES` (`Navbar.tsx:29`).
- **Paleta:** acción «Nuevo reto», con `on('challenges') && <Command.Item …>`, como la de hábitos (`CommandPalette.tsx:254`).
- **`registry.ts`:** `appView: { kind: 'route', path: '/retos' }`, `defaultEnabled: true` y fuera el comentario de R1. Se ajusta `registry.test.ts` y cualquier test que cuente los plugins activos por defecto (`resolve.test.ts:40` ya lo calcula solo).
- **Ayuda de atajos (`ShortcutsHelpModal.tsx`):** grupo «Retos» visible con el plugin encendido (`c` nuevo reto, `j`/`k` moverse, `x` marcar hoy, `Enter` abrir, `Esc` cerrar).

### Página (`src/features/challenges/`)
- **`ChallengesPage.tsx`** (export con nombre):
  - cabecera con `h1` «Retos» y el botón «Nuevo reto» (`c`), con `flex-wrap` para 375;
  - la sección «Misiones de hoy»;
  - la sección «Retos propios», con la lista o el vacío;
  - la sección «Terminados»;
  - la ficha cuando hay `:id`;
  - `usePageTitle` con el título del reto abierto.
- **`useChallengesData.ts`** hace un `useLiveQuery` que lee:
  - las misiones de hoy, por el índice `[kind+startDate]`;
  - los retos propios vivos con sus `challengeDays`;
  - el resumen de cada uno con `getChallengeKind(kind).summarize(...)`;
  - si alguna vez hubo misiones, para el texto del primer día.
  Las filas con `parseParams === null` o con un `kind` desconocido no se pintan.
- **Misiones de hoy (`MissionsToday.tsx`):** filas, sin clic, con:
  - la fuente («Tareas», «Foco», «Check-in» o «Hábitos», etiquetas en `src/lib/challenges/missionLabels.ts`);
  - el título (`missionTitle`);
  - la barra y el texto «3 de 5»;
  - «+15 XP», solo con la gamificación encendida;
  - el estado «Cumplida», con icono de check y texto.
  El pie dice «Se renuevan a las 00:00». Una misión cumplida en otra pantalla aparece como cumplida y no celebra.
  - **Ninguna misión hoy y nunca hubo ninguna:** nota del primer día de R0: «**Tus primeras misiones llegan mañana.** Salen de lo que ya haces en Nextuss: tareas, foco, check-in y hábitos. Hoy aún no hay datos con los que proponerlas.»
  - **Ninguna misión hoy, pero sí otros días:** «Hoy no hay misiones: salen de tus tareas, foco, check-in y hábitos.»
  - **Mientras carga:** `Skeleton`.
- **Lista (`ChallengeList.tsx` → `ChallengeListMix.tsx`):** el contenedor lee `challengesView` de `uiStore` y en R2a pinta siempre Mezcla. R2b solo añade las ramas y el selector. Con una sola opción no se enseña el selector: un `radiogroup` de un solo botón no sirve.
  - **Columnas de la vista D** (rejilla de R0: `16px 1fr 56px 118px 64px 92px 88px`): marca, reto (más «Último día»), racha, últimos 7 días, escudos, «Día N de M» y hoy.
  - **Estado de hoy, siempre con forma y texto:** «Hecho hoy» (check), «Hoy no» (escudo tachado), «Por marcar» (anillo), «En pausa» (pausa), «Empieza el 3 dic».
  - **Orden:** activos y en pausa por `sortKey`. En pausa lleva la insignia «En pausa» (o «Pausa desde mañana» si `pausedSince > hoy`).
  - **«Terminados»,** debajo: cumplido, «Perfecto» y abandonado. Se abren igual, en solo lectura.
  - **A 375:** sin cabecera de columnas. Cada fila en dos líneas:
    - línea 1: marca, título y estado de hoy;
    - línea 2: los 7 días, «Racha N», «Día N de M» y «N escudos».
    Zona de toque de 44 px. Sin scroll horizontal.
- **Marcas de día (`DayMark.tsx`):** las formas de R0 (`retos.css:94-123`) pasadas a tokens: hecho, escudo, «Hoy no» (borde discontinuo), fallo (x), hoy (anillo), por llegar y pausa. Cada marca lleva su texto en `sr-only` y un `title`.
- **Ficha (`ChallengeSheet.tsx`, sobre el nuevo primitivo `Sheet`):**
  - a la derecha en `md+` y como hoja inferior por debajo, con `PRESET.sheet` (con movimiento reducido, solo un fundido);
  - contenido de R0: racha (y la mejor), cumplimiento, `dl` con progreso, fechas, escudos y recompensa (la recompensa solo con gamificación), calendario por semanas (L a D, mes al empezar) con leyenda, y registro (los últimos 3 días más los de escudo y fallo, 6 como mucho);
  - acciones: «Marcar hoy» (`x`), «Hoy no · gasta 1 escudo» (desactivado con el texto «sin escudos») y el menú «Más acciones» (Pausar desde mañana / Reanudar / Abandonar…);
  - **«Abandonar»** pide confirmación con un `Dialog`: «Conservas el historial y el XP. No se puede retomar.»
  - **Cerrar** (`Esc`, la X o el fondo) navega a `/retos`, y el foco vuelve al botón del título de esa fila (`[data-challenge-row=id]`). Si se entró por enlace directo, vuelve al `h1`.
- **Acciones con aviso y deshacer (`challengeActions.ts`):** las llamadas al repositorio más un toast con «Deshacer», mediante `undoStore`, como `togglePluginWithUndo`:
  - marcar ↔ desmarcar;
  - «Hoy no» ↔ `undoSkipChallengeDay`;
  - pausar ↔ reanudar.
  `ChallengeActionError.message` se enseña tal cual en un toast de error. Abandonar no tiene deshacer: por eso pide confirmación.
- **Celebración (`useCelebratedChallengeMark.ts`):** hermano de `useCelebratedToggle`. Lee `todayState` antes de actuar y sube `play` solo si se pasa de no hecho a hecho por una acción del usuario (clic o `x`) y `useCelebrationEnabled()` está activo. Ni el deshacer ni las misiones celebran. `Celebration` va dentro de un contenedor `relative`, en la celda de marca de la fila y en el botón de la ficha.
- **Crear (`ChallengeForm.tsx` más `challengeFormStore.ts`):** al estilo de `habitFormStore` (`open`, `openCreate(prefill?)`, `close`, `nonce`). Se monta en `AppShell` solo con el plugin encendido y con import diferido (lazy) al abrir, para no engordar el JS inicial. Sobre `Dialog` (foco atrapado y devuelto, y confirmación si hay cambios).
  - **Campos:**
    - el texto que se interpreta, con `parseChallengeDraft`;
    - los chips de lo detectado, con `aria-live`;
    - «Duración», un `SegmentedControl` con 7, 21, 30 y 66;
    - «Días», de 1 a 365;
    - «Termina el», fecha sincronizada con los días;
    - «Escudos», de 0 a 3, por defecto `defaultShields(días)`.
  - **Vista previa:** fechas, cadena y XP (`XP_PER_CHALLENGE_DAY` × días más `challengePerfectBonus`, solo con gamificación).
  - **Empieza siempre hoy.** El repositorio admite hasta +30 días, pero el campo de inicio queda fuera de R2a.
  - **Validación:** con las reglas de `createCustomChallenge`; su error se enseña bajo el campo. El título es obligatorio: si queda vacío, «Crear reto» se desactiva y sale el error.
- **Vacío (`ChallengesEmpty.tsx`), cuando no hay retos propios:** «Tu primera cadena empieza hoy», el texto de R0, una cadena fantasma de 30 días y 3 plantillas (`src/lib/challenges/templates.ts`):
  - «Leer 20 minutos», 30 días y 2 escudos;
  - «Sin azúcar añadido», 21 días y 1 escudo;
  - «Escribir tres líneas de diario», 66 días y 3 escudos.
  «Usar» abre el diálogo ya relleno. Las misiones de hoy siguen encima.
- **Teclado:**
  - `useListNav({ onNext, onPrev, onActivate, onCreate })`: `j`/`k` mueven un cursor que **da foco real** al botón del título de la fila (el lector de pantalla la lee), `Enter` abre la ficha y `c` abre crear.
  - `x`, con un `keydown` propio de la página, al estilo de `TasksPage.tsx:250-266`: ignora los campos de texto, `defaultPrevented` y los `[role=dialog]`/`[role=menu]` abiertos. Alterna marcar y desmarcar hoy en la fila del cursor o en la ficha abierta (la ficha tiene su propio manejador de `x`).
  - `n` no se toca.
  - Pista bajo la lista: «j k moverse · x marcar hoy · Enter abrir · c nuevo reto».
- **Gamificación apagada:**
  - sin «+XP» en las misiones;
  - sin la fila «Recompensa» en la ficha;
  - sin XP en la vista previa de crear.
  Todo lo demás funciona igual. Los datos ya guardan 0 (R1b).

### Primitivo `Sheet` (`src/design/primitives/Sheet.tsx`)
- `open`, `onClose`, `title` (o `aria-labelledby`), `children` y `side` automático (derecha en `md+`, abajo por debajo).
- Es `role="dialog"` con `aria-modal`. Cierra con `Esc` y con el fondo, bloquea el scroll y respeta el movimiento reducido.
- **Foco:** se saca de `Dialog.tsx` la lógica de atrapar y devolver el foco a un hook `useModalFocus` (`src/design/primitives/`). Lo usan los dos, sin cambiar el comportamiento de `Dialog`; sus tests siguen en verde como guarda.
- Admite `returnFocusTo` para el caso del enlace directo.
- Se exporta en el barrel.

### Datos demo (`src/db/demoSeed.ts`)
- `challenges` y `challengeDays` entran en `SEEDABLE_TABLES`, así que `clearDemoData` los borra con los ids que registra `demoSeeds`.
- **Patrones fijos, sin sacar números del PRNG,** y al final, para no alterar el resto de la demo. Todas las fechas, relativas a hoy, terminan ayer:
  1. «Leer 20 minutos»: activo, 30 días (día 22). Hechos, 1 escudo y 1 «Hoy no». Hoy sin marcar.
  2. «Sin azúcar añadido»: activo, 21 días. Un fallo con la racha a 0 y 0 escudos restantes («Hoy no» desactivado).
  3. «Caminar 30 minutos»: en pausa desde hace 4 días, `pausedBy: 'user'`. Los días de pausa ya escritos, para que la reconciliación no cambie nada.
  4. «Escribir tres líneas de diario»: `done` y `perfect`, con 66 días, `completedAt` y su bonus.
  5. «Meditar 10 minutos»: `done` con fallos, 21 días y sin bonus.
  6. Misiones de los últimos 14 días: `done` y `expired`, con `params` válidos (`template`, `source`, `target` y `progress`).
- **XP de los días hechos y del bonus:** `XP_PER_CHALLENGE_DAY` y `challengePerfectBonus`, solo si `isPluginEnabled('gamification')`. Se suma al `xpDelta` que ya registra la demo.
- **Test** (`demoSeed.test.ts`, el que exista o uno nuevo):
  - generar;
  - estados presentes (`active`, `paused`, `done` perfect y no perfect; los días hecho, escudo, «Hoy no», fallo y pausa);
  - escudos de 0 a 3;
  - `reconcileChallenges(today)` no añade filas;
  - gamificación apagada da XP 0;
  - limpiar deja `challenges` y `challengeDays` vacías.

### Lógica pura nueva (`src/lib/challenges/`)
- **`parseDraft.ts`:** `parseChallengeDraft(text)` devuelve `{ title, days?, shields? }`.
  - Reconoce «N días», «N dias», «N día», «N escudos» y «1 escudo».
  - Limita a 1–365 y 0–3.
  - El título es el resto, recortado.
- **`templates.ts`** y **`missionLabels.ts`**.

## Fuera de alcance

- Las vistas Cadena y Horizonte, el selector visible y sus pruebas (R2b).
- El resumen en Hoy, los logros y la celebración de «reto cumplido» (R3).
- Editar un reto desde la UI y elegir la fecha de inicio: se anotan en #191. Eliminar sí entra (ajuste 1).
- El XP global y la gamificación (#193).

## Archivos críticos

- **Nuevos:**
  - `src/features/challenges/{ChallengesPage,MissionsToday,ChallengeList,ChallengeListMix,ChallengeSheet,ChallengeCalendar,DayMark,ChallengeForm,ChallengesEmpty}.tsx`
  - `src/features/challenges/{useChallengesData,useCelebratedChallengeMark,challengeActions,challengeFormStore}.ts`
  - `src/lib/challenges/{parseDraft,templates,missionLabels}.ts`
  - `src/design/primitives/{Sheet.tsx,useModalFocus.ts}`
- **Modificados:**
  - `src/app/router.tsx`, `navItems.ts`, `MobileNav.tsx`, `Navbar.tsx`, `CommandPalette.tsx`, `ShortcutsHelpModal.tsx` y `AppShell.tsx`
  - `src/features/plugins/registry.ts` (más su test)
  - `src/design/primitives/Dialog.tsx` e `index.ts`
  - `src/db/demoSeed.ts` (más su test)
- **Se reutilizan:**
  - repositorios: `challenges.ts` (`createCustomChallenge`, `markChallengeDay`, `unmarkChallengeDay`, `skipChallengeDay`, `undoSkipChallengeDay`, `pauseChallenge`, `resumeChallenge`, `abandonChallenge` y `ChallengeActionError`);
  - `getChallengeKind` y `summarize`, `missionTitle`, `defaultShields`, `endDateFor` y `eachDayKey`;
  - `XP_PER_CHALLENGE_DAY` y `challengePerfectBonus`;
  - `usePluginEnabled`, `useCelebrationEnabled` y `Celebration`;
  - `useListNav`, `usePageTitle`, `toastStore` y `undoStore`;
  - los primitivos `Dialog`, `SegmentedControl`, `Menu`, `Button`, `EmptyState`, `ProgressBar`, `Skeleton`, `Kbd` y `Badge`;
  - `PRESET` y `motionFor`.
- **Docs:**
  - `docs/design/rediseno-v2/retos-r2/PLAN.md` (este plan) y `retos-r2/capturar-retos.mjs`, con `antes/`, `despues/` y los GIF;
  - una fila en `docs/design/rediseno-v2/README.md`;
  - la nota de la barra móvil en `retos-r0/README.md`, en la sección «Impacto en R2».

## Pasos (rama `rediseno-v2/191-retos-r2a-pagina`)

0. Preparación:
   - `git fetch` (trae las ramas remotas sin tocar las tuyas);
   - comprobar si `main` avanzó respecto a la integración y, si avanzó, traerlo con un merge (regla del usuario);
   - crear la rama desde `rediseno-v2/integracion`;
   - `npm ci`, con `vite preview` parado;
   - sacar las capturas del «antes» antes de tocar nada.
1. Commit: `docs/design/rediseno-v2/retos-r2/PLAN.md`.
2. Commit: `useModalFocus` y `Sheet`, con sus tests.
3. Commit: `parseDraft`, `templates` y `missionLabels`, con sus tests.
4. Commit: datos demo de retos, con su test.
5. Commit: la página con las misiones, la lista D, el vacío y los terminados.
6. Commit: la ficha con el calendario, las acciones, deshacer, la celebración y la confirmación de abandonar.
7. Commit: crear (diálogo, store, montaje diferido y plantillas).
8. Commit: la ruta, `NAV_ITEMS`, la barra móvil y el avatar, la paleta, la ayuda de atajos, `x`, el registro `appView` y `defaultEnabled: true`.
9. Commit: las capturas, los GIF, el README y la nota de la barra móvil.
10. Squash local (si lo pides), push, PR hacia la integración con «Parte de #191», CI `verify` verde y **PARADA**.

## Tests (Vitest, happy-dom, Dexie real, como `TodayNumbers.test.tsx`)

- **`ChallengesPage.test.tsx`:**
  - misiones con su fuente, su progreso y «Cumplida» con texto;
  - sin «+XP» con la gamificación apagada;
  - la nota del primer día, y el texto de «hoy no hay misiones»;
  - el vacío con plantillas, y que «Usar» rellena el diálogo;
  - la fila D (racha, escudos y «Día N de M»);
  - marcar con el botón escribe `done` y aparece `[data-celebration]`;
  - con `celebrationEnabled: false` no aparece;
  - una misión cumplida desde fuera no celebra;
  - `j`/`k` mueven el foco, `x` marca la fila del cursor, `c` abre crear y `n` no abre crear (abre la captura de tarea);
  - «Hoy no» con «Deshacer» devuelve el escudo;
  - pausar y reanudar;
  - abandonar pide confirmación;
  - «Eliminar» (también en un terminado) manda el reto a la papelera sin pedir confirmación, y «Deshacer» lo devuelve;
  - al cerrar la ficha, el foco vuelve a la fila;
  - una fila con `params` no válidos no se pinta.
- **`ChallengeForm.test.tsx`:**
  - crear un reto válido;
  - los errores de validación;
  - los botones de duración sincronizan los días y la fecha de fin;
  - escudos por defecto con `floor(d/10)` y un máximo de 3;
  - el texto interpretado rellena los campos.
- **`Sheet.test.tsx`:** `Esc` cierra, el foco queda atrapado y vuelve al cerrar. Los tests de `Dialog` siguen igual.
- **`parseDraft.test.ts`**, el test de la demo, `registry.test.ts` (`appView`) y, si existe, el test de la paleta o de `navItems`.

## Verificación

1. `npm run build`, `npm test` y `npm run lint` en verde, en local y en CI.
2. Medidas frente a la integración (c178691): JS inicial gzip, CSS, JS total y precache. Se espera poco en el JS inicial: la página y el formulario se cargan aparte.
3. Humo por CDP sobre `vite preview` en el puerto 4173, con un script en el scratchpad:
   - generar la demo;
   - `/retos`: ver las misiones de hoy generadas;
   - marcar con clic y con `x`, y deshacer;
   - «Hoy no» y deshacer;
   - pausar y reanudar;
   - abandonar;
   - eliminar y deshacer;
   - crear desde una plantilla y desde la paleta;
   - con el teclado, abrir y cerrar 3 `Dialog` de otras páginas (crear hábito, uno de Ajustes y el de restaurar copia): el foco queda atrapado y vuelve a su origen;
   - `g e`;
   - apagar `gamification` (sin XP visible);
   - apagar `challenges` (`PluginGate`, y Retos desaparece del menú);
   - consola limpia;
   - Virtualización y Cabina intactas.
4. **Capturas** con `retos-r2/capturar-retos.mjs` (basado en `fase-2/capturar-hoy.mjs`), solo con datos demo, en claro y oscuro, a 1440 y 375:
   - **antes:** barra lateral y paleta sin Retos, y la ficha del plugin apagado en `/plugins/challenges`;
   - **después:** la lista, la ficha, crear, el vacío, el primer día, sin gamificación, la paleta con «Nuevo reto», el menú del avatar en móvil y Virtualización/Cabina;
   - el script comprueba que no hay errores de consola ni scroll horizontal a 375.
5. **GIF:** marcar un día con celebración, normal y con movimiento reducido. Más un flujo corto: crear desde una plantilla, abrir la ficha, «Hoy no» y deshacer.
6. **Accesibilidad a mano:**
   - todo con el teclado;
   - el foco vuelve al cerrar la ficha y el diálogo;
   - forma y texto en todas las marcas;
   - zonas de toque de 44 px en móvil.
7. **Audits:** impeccable audit, web-design-guidelines y modern-web-guidance sobre los archivos nuevos, con su sección «Audits» en el PR, como en #190.
8. Memoria al día y **PARADA**: enseñar las capturas, los GIF y las medidas, y esperar el OK antes del merge y antes de R2b.
