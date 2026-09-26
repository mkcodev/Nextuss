# Auditoría de diseño UX/UI

Paso 3 de [`PLAN-REDISENO.md`](PLAN-REDISENO.md) (issue #34). Fecha: 2026-09-25. Sin cambios de código.

**Método:** `/impeccable critique` con dos agentes aislados (A: revisión de diseño en el navegador con
datos demo, tema claro y oscuro; B: detector automático en código y en el navegador) + `/web-design-guidelines`
(reglas de Vercel) sobre los 4 formularios. Alcance: Hoy, Tareas, Hábitos, Planificación → Objetivos,
TaskForm, ProjectForm, HabitForm, GoalForm.

**No verificado:** móvil (el cambio de tamaño de ventana no funcionó en la herramienta del navegador).

## Nota global: 25/40 (Aceptable)

| # | Heurística (Nielsen) | Nota | Problema principal |
|---|---|---|---|
| 1 | Estado del sistema visible | 3 | Buen feedback de XP, rachas y contadores. El anillo de `j/k` sobre el primer hábito parece foco o "hecho". |
| 2 | Lenguaje del usuario | 2 | "P1–P4", "Atributo", "Objetivo suelto", "Contextual", "Insights", "Semana 2026-W39". |
| 3 | Control y libertad | 2 | Esc o clic fuera cierran el formulario y borran lo escrito sin avisar. |
| 4 | Consistencia | 2 | `c` abre "Nuevo hábito" en Hoy y Hábitos, no una tarea. `Field` existe pero ningún formulario lo usa. Colores copiados 3 veces. |
| 5 | Prevención de errores | 2 | ProjectForm, HabitForm y GoalForm ignoran el nombre vacío sin decir nada. Submit sin estado "guardando" (doble Enter = doble creación). |
| 6 | Reconocer mejor que recordar | 3 | Atajos visibles y ⌘K. Pestañas del dock solo con icono. |
| 7 | Flexibilidad y eficiencia | 3 | La sintaxis de la tarea rápida es excelente. Falla: `c` inconsistente, foco de GoalForm en "Semana" en vez del título. |
| 8 | Estética y minimalismo | 2 | Hoy: 3 columnas + dock, 93 atrasadas encima del calendario. TaskForm: 11 bloques planos. |
| 9 | Recuperación de errores | 2 | Solo TaskForm muestra error, y no lo anuncia al lector de pantalla. |
| 10 | Ayuda | 2 | Modal de atajos y pista "Tab". La sintaxis de la tarea rápida solo se explica en un placeholder cortado. |

**Carga cognitiva: alta** (falla 5 de 8 comprobaciones: un solo foco, bloques pequeños, jerarquía, pocas
opciones, divulgación progresiva). Crear una tarea supone unas 25 decisiones visibles a la vez.

## ¿Parece hecho para Nextuss?

**El comportamiento sí, la apariencia no.**
- **Propio:** tarea rápida con sintaxis (`mañana 10:00 !2 45m #trabajo`), atajos `g x` visibles, ritual de
  inicio de día, Objetivo principal, "las tareas de este proyecto suman XP a este atributo".
- **Genérico:** piel de "SaaS oscuro con brillo azul" (cian `#5EC8FF`, `shadow-glow`, tarjetas redondeadas,
  Inter). Valdría igual para un panel cripto. El detector marca ~650 elementos con la paleta "cian neón sobre
  oscuro" y 10 brillos. El brillo contradice la voz "sobria, sin adornos" de `PRODUCT.md`.
- **Formularios:** lo más genérico. Una columna, etiquetas de 12px, todo con el mismo peso. No se parecen a
  Linear, que es la referencia elegida.

## Lo que funciona

1. **Captura por teclado de verdad:** tarea rápida con sintaxis, Tab para ampliar, `g x`, `j/k`, ⌘K. Es el
   diferenciador y ya funciona.
2. **Conexiones visibles:** proyecto → atributo, tarea → objetivo, Objetivo principal en Hoy.
3. **Buena base técnica:** Dialog con trampa de foco y `prefers-reduced-motion`, tokens `--nx-*` por tema,
   iconos Lucide coherentes, borrar va a la papelera con deshacer. El detector no encuentra nada en
   `src/app` ni `src/design`.

## Problemas prioritarios

### [P1] 1. Hoy abre con culpa y ruido, no con "qué toca ahora"
- **Qué:** la tarjeta ámbar "93 tareas atrasadas" (sin límite de filas, `OverdueTasks.tsx`) va antes que el
  calendario, que queda fuera de pantalla. Además 3 columnas, dock y 8 "Logro desbloqueado" en Actividad.
- **Por qué:** rompe los principios 1 (menos carga mental) y 5 (progreso sin culpa). Es la primera pantalla.
- **Arreglo:** máximo 3 atrasadas + "Ver las 93", acciones en bloque ("Mover todas a mañana", "Aparcar"),
  tono neutro, "lo siguiente" o el calendario como protagonista, dock plegado en Hoy.
- **Comando:** `/impeccable distill` + `/impeccable quieter` (TodayView, OverdueTasks).

### [P1] 2. TaskForm: pared plana de 11 campos
- **Qué:** el título pesa lo mismo que "Color". Prioridad, energía, estimación, color, proyecto, etiquetas,
  objetivo y repetir, todo abierto. Modal de 448px: con "Repetir" hay que desplazarse y los botones de
  guardar desaparecen (no hay pie fijo en `Dialog.tsx:93`).
- **Por qué:** es el formulario más usado y el modelo para los otros tres.
- **Arreglo (patrón Linear):** título grande sin caja, notas debajo, propiedades en fila de chips con menús,
  lo raro detrás de "Más", pie fijo con ⌘Enter. Plantearse quitar el color de las tareas (heredarlo del proyecto).
- **Comando:** `/impeccable shape` → 3 variantes → `/impeccable distill`.

### [P1] 3. Cerrar sin querer pierde lo escrito; errores mudos
- **Qué:**
  - Esc o clic en el fondo cierran y hacen `reset()` sin avisar (`Dialog.tsx:46,85`). Seleccionar texto
    arrastrando y soltar fuera del panel también lo cierra.
  - El listener de Esc en captura (`Dialog.tsx:65`) se come todos los Esc: en TaskForm, Esc en "nuevo
    proyecto" cierra la tarea entera (`TaskForm.tsx:401` es código muerto).
  - Nombre vacío = no pasa nada, sin mensaje (ProjectForm:49, HabitForm:152, GoalForm:60).
  - Submit sin estado "guardando" (`Button.tsx` no tiene `loading`).
  - HabitForm guarda días exentos y pausas al momento aunque pulses Cancelar (118, 183), y guarda `[1]` en
    silencio si no eliges días del mes (143).
- **Por qué:** con TDAH distraerse a mitad es lo normal; perder lo escrito es lo que hace abandonar.
- **Arreglo:** borrador conservado o confirmación (diálogo hermano) si hay cambios; `onMouseDown` en el fondo;
  Esc que respeta al hijo; mensaje de error en línea en los 4; `loading` en Button.
- **Comando:** `/impeccable harden`.

### [P1] 4. Accesibilidad de los formularios
- **Qué:**
  - Ningún `<label>` tiene `htmlFor`; varios inputs sin etiqueta (hora, "Cada N", fechas de pausa, crear
    atributo). `Field.tsx` ya lo resuelve y no se usa.
  - Botones de selección (prioridad, energía, estimación, tipo, días, periodo) sin `aria-pressed`: el estado
    solo se ve por el color. Colores e iconos sin nombre. Botones de solo icono (+, papelera, X) sin `aria-label`.
  - **Contraste:** texto blanco sobre el acento `#5EC8FF` = **1,9:1** en oscuro (~2,8:1 en claro). AA pide
    4,5:1. Afecta a todos los botones principales y al enlace "saltar al contenido".
  - Texto de 10–11px en controles clicables (botón "Hoy" de atrasadas, días del mes).
  - Encabezados: h1 → h3 sin h2 en Hoy.
- **Arreglo:** usar `Field` en todos; primitivo `ToggleGroup` con `role="radiogroup"`/`aria-pressed`;
  `ColorPicker`/`IconPicker` con nombres; texto oscuro sobre el acento o acento más oscuro; escala tipográfica
  sin `text-[10px]`/`[11px]`.
- **Comando:** `/impeccable audit` → `/impeccable harden`.

### [P2] 5. Atajos y botones principales incoherentes
- **Qué:** `c` abre "Nuevo hábito" en Hoy (`TodayView.tsx:168`). En Tareas el botón azul grande es
  "Nueva vista" (`TasksPage.tsx:226`), no "Nueva tarea". El panel de filtros empieza abierto
  (`TasksPage.tsx:87`, ~20 controles).
- **Arreglo:** `c` = tarea siempre, `h` = hábito; "Nueva tarea" como acción principal; filtros plegados.
- **Comando:** `/impeccable clarify`.

## Deuda repetida (se arregla una vez, en el sistema de diseño)

Encaja con el paso 5 del plan (#22):
- Estilos de campo copiados ~40 veces (`outline-none … focus:border-accent`) en vez de `Input`/`Select`/`Textarea`/`Field`.
- ~12 grupos de botones de selección copiados → primitivo `ToggleGroup`. `SegmentedControl` sin `type="button"` ni `aria-pressed`.
- `COLOR_PRESETS` y selector de color x3 (TaskForm:25, ProjectForm:10, HabitForm:22); selector de iconos x2; `#5EC8FF` 24 veces en `src`.
- "Atributo + crear nuevo" x2, sin etiqueta y sin Enter (Enter envía el formulario entero).
- Rejilla de días 1–31 (31 paradas de Tab) y días "L M X" de una letra sin nombre completo, x2.
- `Number(v) || 1` en todos los numéricos: borrar el campo pone 1 y escribir "5" da "15".
- Pie de acciones: sin `loading`, "Guardar"/"Crear"/"Añadir" genéricos (mejor "Guardar tarea", "Añadir atributo").
- Falta `name`/`autoComplete="off"`; placeholders sin "…".
- Formato: "1.5 h" → "1,5 h"; fechas ISO crudas en HabitForm; "Viernes 25 De Septiembre" por `capitalize`.
- `type="week"`/`"month"` en GoalForm no funcionan en Firefox ni Safari de escritorio.

## Personas

- **Lucía (TDAH, de `PRODUCT.md`):** las 93 atrasadas y los "En riesgo" le dicen "vas mal" antes que "qué
  toca". 25 decisiones para crear una tarea. Un clic fuera borra lo escrito. Actividad con 8 logros compite
  con la tarea.
- **Alex (usuario avanzado):** `c` cambia según la página; en GoalForm tiene que salir de "Semana" para
  escribir; no hay ⌘Enter visible ni atajos dentro del formulario; el dock solo con ratón.
- **Sam (accesibilidad):** controles sin etiqueta, estado solo por color, contraste 1,9:1 en el botón
  principal, flechas de fecha sin nombre (`TodayView.tsx:176,189`).
- **Jordan (primer uso, para cuando se abra a otros):** "P1–P4", "Energía necesaria", "Atributo", los 5
  modos de "Cuándo" sin explicar, "Semana 2026-W39", no sabe qué hacer primero en Hoy.

## Detector automático

- **Código:** 1 hallazgo (`side-tab`, `MonthView.tsx:132`); `src/app` y `src/design` limpios.
  `UnscheduledTray.tsx:62` tiene el mismo patrón pero el escáner no lo lee.
- **Navegador:** Hoy 789, Tareas 123, Hábitos 129 marcas. Casi todo es la paleta cian (cada icono cuenta),
  una misma fila repetida 93 veces, o elecciones de estilo (brillo, borde de color). Reales: contraste 1,9:1,
  h1 → h3, botón de 10px.
- **Falso positivo descartado:** tras Esc quedaban 2 `[role=dialog]` en el DOM sin verse. Es el fallo
  conocido de animaciones en pestañas automatizadas, no un error de la app.

## Observaciones menores

- Planificación: "Semana" y "Objetivos" resaltados a la vez; el título sigue siendo "Semana y mes" en Objetivos.
- Tareas: el icono de calendario se monta sobre el chip "Programada"; columna Prioridad vacía en todas las filas.
- Hábitos: "Todos los días · racha más larga: 18" fuera de la tarjeta (`HabitsPage.tsx:163`).
- Check-in de la mañana pregunta "¿Cómo ha ido el día?" (`CheckInFields.tsx:88`).
- Dialog sin botón de cerrar visible.
- "Cerrar el día" es un botón fantasma de 12px: el cierre del ritual pesa poco.
- Radios "Fecha fija / Tras completar" nativos, sin el estilo de la app, y sin `name` (las flechas no funcionan).

## Preguntas para decidir

1. Si Hoy solo pudiera mostrar una cosa al abrir, ¿sería "lo siguiente", el calendario o el Objetivo principal?
2. ¿Una tarea necesita color, energía, estimación y prioridad? ¿Cuántas usas de verdad?
3. ¿Las atrasadas son información o castigo? ¿Y si las de más de 7 días se aparcaran solas?
4. ¿El dock se gana su tercio de pantalla en Hoy?

## Prioridades del usuario

Decidido el 2026-09-25:

- **Prioridad:** los formularios, empezando por TaskForm. Se sigue el orden del plan: dirección visual
  (paso 4) → sistema de diseño (#22) → TaskForm (#6) → resto de formularios. Los problemas de pérdida de
  datos (P1 #3) y de accesibilidad (P1 #4) se resuelven dentro de ese trabajo, en `Dialog` y los primitivos.
- **Estética:** sobria tipo Linear. Sin brillos, acento más oscuro y menos presente, bordes sutiles. Las 3
  direcciones del paso 4 parten de aquí.
- **Atrasadas en Hoy:** máximo 3 visibles, "Ver todas", acciones en bloque ("Mover todas a mañana",
  "Aparcar"), tono neutro. Sin autoaparcado.

## Orden de trabajo recomendado

1. `/impeccable shape` + paso 4: 3 direcciones visuales sobrias → `DESIGN.md`.
2. `/impeccable harden` + `/impeccable audit` en el sistema de diseño (#22): `Dialog` (Esc, clic fuera,
   borrador, pie fijo), `Button` con `loading`, `Field` en todo, `ToggleGroup`, `ColorPicker`, contraste del acento.
3. `/impeccable distill` en TaskForm (#6): patrón Linear, 3 variantes antes de implementar.
4. Misma receta en ProjectForm, HabitForm y GoalForm.
5. `/impeccable distill` + `/impeccable quieter` en Hoy (atrasadas resumidas, dock) y `/impeccable clarify`
   (atajo `c`, "Nueva tarea" como acción principal, lenguaje "P1–P4", "Insights").
6. `/impeccable polish` al final.
