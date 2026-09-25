# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Hoy:** una sola persona, el autor, con TDAH. Usa Nextuss como centro de mando diario: sobre todo en
  escritorio durante la jornada, y en el móvil (PWA) para capturar y consultar al vuelo.
- **Después:** otras personas con TDAH. Todavía no hay usuarios externos, pero las decisiones de hoy no
  deben impedirlo: primer uso, textos y estados vacíos tienen que entenderse sin ayuda del autor.
- Trabajo principal: vaciar la cabeza (capturar), decidir qué toca hoy, hacerlo con foco y ver que se
  avanza, sin que la herramienta añada carga mental.

## Product Purpose

Centro de mando personal que junta en un solo sitio lo que normalmente vive repartido entre varias
apps: hábitos, tareas y proyectos, planificación de día/semana/mes, objetivos, sesiones de foco,
check-ins y estadísticas. Existe porque saltar entre herramientas cuesta demasiado a un cerebro con
TDAH. Éxito = el usuario vuelve cada día, captura sin fricción y ve progreso real.

## Positioning

Tres cosas a la vez que Todoist, TickTick o Things no juntan:

1. **Todo en uno:** hábitos + tareas + objetivos + foco + estadísticas conectados (una tarea suma a un
   objetivo, un hábito suma XP a un atributo), no módulos sueltos.
2. **Gamificación de verdad:** XP, niveles, atributos y logros; el progreso se siente, no solo se lista.
3. **Rapidez de teclado:** atajos globales (`g h/p/b/a`, `j/k`+`Enter`, `c`, `i`), paleta `Ctrl/⌘+K` y
   captura instantánea. Se maneja como una herramienta profesional, no como una lista de la compra.

## Operating Context

- Rutinas reales: ritual de inicio/cierre de día, check-in, revisión semanal de objetivos, arrastre de
  objetivos al siguiente periodo, sesiones de foco (Pomodoro).
- Shell tipo SaaS: navbar con migas y búsqueda, barra lateral izquierda colapsable, dock derecho con
  paneles reordenables (Progreso, Contextual, Actividad, Captura, Enfoque, Check-in).
- Captura también desde Telegram (bot propio; relay opcional en `worker/`).
- IA opcional (desglose de tareas, sugerencia de plan del día) con la clave de API del propio usuario.

## Capabilities and Constraints

- **Local-first, sin backend ni cuenta:** datos en IndexedDB (Dexie, base `nexus`), funciona sin
  conexión, PWA instalable. Es una restricción técnica de hoy, no el argumento principal del producto.
- Interfaz en español. Temas claro y oscuro.
- Desktop-first; el móvil es "mínimo viable" pero nada puede quedar inaccesible.
- Cero emoji en la interfaz: solo iconos lineales Lucide vía `src/design/icons.ts`.
- Nunca `confirm()` nativo; diálogos hermanos en `AppShell`, nunca anidados.
- El rediseño no toca modelo de datos, esquema Dexie ni lógica de negocio.
- Repo público en GitHub (`mkcodev/Nextuss`), despliegue en Vercel.
- **Sin decidir:** cuándo y cómo se abre a otros usuarios (onboarding para terceros, sincronización,
  cuentas).

## Brand Commitments

- Nombre: **Nextuss** (antes "Nexus"). Lema actual: "Centro de mando".
- **Voz sobria y directa:** tono de herramienta profesional, mínimo texto, neutra, sin adornos ni
  celebraciones exageradas. Tuteo (la app ya lo usa). La gamificación informa del progreso; no grita.
- Iconos lineales Lucide, nunca emoji.

## Evidence on Hand

- Referencias visuales capturadas en `docs/design/refs/` (solo locales, no versionadas) con notas en
  `refs/NOTAS.md`; referencia principal para formularios: Linear.
- Iconos de la app en `public/` (`icon.svg`, `favicon.svg`, PNG de PWA).
- No hay testimonios, usuarios externos, métricas de uso ni prensa. No inventarlos.

## Product Principles

1. **Menos carga mental gana.** Si algo añade decisiones, ruido o pasos sin necesidad, sobra; lo
   avanzado aparece solo cuando se pide.
2. **Captura primero, orden después.** Meter algo en el sistema debe costar segundos desde cualquier
   sitio (teclado, dock, Telegram).
3. **Todo conectado.** Cada acción cuenta en otra parte (tarea → objetivo, hábito → XP/atributo); la
   interfaz debe hacer visible esa conexión.
4. **Teclado como ciudadano de primera.** Cualquier flujo frecuente se completa sin ratón.
5. **Progreso honesto y tranquilo.** Mostrar avance real sin culpa ni presión cuando algo falla.

## Accessibility & Inclusion

- Diseñado para TDAH: baja carga cognitiva, jerarquía clara, foco en lo de hoy, divulgación progresiva.
- Uso completo por teclado.
- Respetar `prefers-reduced-motion`.
- Estándar formal (WCAG AA u otro): sin decidir.
