---
name: Nextuss
description: Centro de mando personal (hábitos, tareas, objetivos y foco) con aspecto de herramienta profesional sobria.
colors:
  indigo-accent: "#5058c8"
  indigo-accent-night: "#5e66d6"
  on-accent: "#ffffff"
  paper: "#ffffff"
  paper-side: "#f7f7f8"
  paper-hover: "#ededf0"
  hairline: "#e7e7eb"
  ink: "#1b1b20"
  ink-dim: "#6a6a75"
  ink-faint: "#9a9aa4"
  overdue-orange: "#b4540a"
  night: "#131316"
  night-side: "#0f0f11"
  night-hover: "#1f1f24"
  night-hairline: "#26262c"
  night-ink: "#e7e7eb"
  night-ink-dim: "#9d9da8"
  night-ink-faint: "#6f6f7a"
  overdue-orange-night: "#f0a25e"
  scrim: "rgba(0, 0, 0, 0.35)"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "-0.005em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    letterSpacing: "-0.005em"
  control:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "-0.005em"
  meta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
    letterSpacing: "-0.005em"
  measure:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    fontFeature: "\"tnum\" 1"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "-0.005em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "99px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "20px"
  gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.indigo-accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  property-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  tag-pill:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "1px 8px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "30px"
  nav-item-active:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
  search-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-faint}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 8px"
    height: "30px"
  list-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 24px"
    height: "40px"
  list-row-selected:
    backgroundColor: "{colors.paper-hover}"
  group-header:
    backgroundColor: "{colors.paper-side}"
    textColor: "{colors.ink}"
    padding: "0 24px"
    height: "36px"
  kbd:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "1px 5px"
  property-cells:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  modal:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    width: "680px"
---

# Design System: Nextuss

## Overview

**Creative North Star: "La herramienta precisa"**

Nextuss se ve como una herramienta profesional sobria, del tipo Linear: listas agrupadas en filas de altura fija, bordes de 1px casi invisibles, una sola familia tipográfica (Inter) y un único acento índigo reservado para acción, selección y progreso. Nada brilla, nada flota sin motivo. La densidad es alta pero ordenada: el ojo recorre columnas que no se mueven y lee la información por posición, no por color.

Lo que distingue a Nextuss de cualquier lista es la **ficha medida**: la tarea actual no es una fila más, sino un bloque "Ahora" con una línea de medida (inicio, fin, duración y avance) y cuatro casillas de propiedades. Es la firma del sistema y el único sitio donde la pantalla sube de tamaño tipográfico. Los estados se leen por forma (círculo vacío, medio lleno, lleno con marca; prioridad como barras de altura creciente), no por manchas de color.

Anti-referencia confirmada: la estética anterior de la app (tablero SaaS oscuro con brillo cian `#5EC8FF` y sombras de resplandor). Este DESIGN.md se deriva del mock aprobado `docs/design/direcciones/f-herramienta-plano.html` (dirección F, estilos `.dC` de `estilos.css`), no de la app construida: **hay que volver a comprobarlo contra el código real cuando se cierren los issues #22 (base del sistema de diseño) y #6 (TaskForm)**, y corregir aquí lo que la implementación haya resuelto de otro modo.

**Key Characteristics:**
- Claro: blanco con laterales gris 1%; oscuro: casi negro, igual de cuidado que el claro.
- Un solo acento índigo; naranja solo como texto de atraso.
- Bordes de 1px suaves y radios de 6-8px; sin sombras salvo el diálogo.
- Inter en todo; jerarquía por peso (400/500/600) más que por tamaño.
- Estados por forma, no por color; cifras con dígitos tabulares.
- Teclado visible: cada acción principal muestra su atajo en `kbd`.

## Colors

Paleta neutra casi monocroma, con un índigo como única voz y un naranja que solo aparece para decir "esto va tarde".

### Primary
- **Índigo de acción** (indigo-accent; en oscuro indigo-accent-night): fondo del botón primario de cada pantalla, relleno de la línea de medida y de las barras de progreso, círculo de estado en curso o hecho, días marcados de un hábito, anillo de foco de las fichas y cursor del título en el formulario. Texto blanco (on-accent) encima: 5,88:1 en claro y 4,83:1 en oscuro, ambos pasan WCAG AA.

### Tertiary
- **Naranja de atraso** (overdue-orange; en oscuro overdue-orange-night): solo el texto de metadatos de una tarea atrasada ("hace 12 días", la fecha). 4,98:1 sobre blanco, 8,86:1 sobre el fondo oscuro. Nunca fondo, nunca icono de alerta.

### Neutral
- **Papel** (paper / night): fondo principal, filas, diálogos, fichas y botones secundarios.
- **Lateral** (paper-side / night-side): barra lateral, cabeceras de grupo y barra de atajos inferior.
- **Gris de selección** (paper-hover / night-hover): fila seleccionada, elemento de navegación activo, fondo de `kbd`, pista de las barras de progreso, fondo del icono de hábito, segmento activo.
- **Filete** (hairline / night-hairline): todos los bordes de 1px: separadores de fila, cabecera, laterales, fichas, diálogo; también las barras de prioridad apagadas.
- **Tinta** (ink / night-ink): texto principal, títulos, valores de las casillas; subrayado de la pestaña activa.
- **Tinta atenuada** (ink-dim / night-ink-dim): metadatos, etiquetas de casilla, navegación inactiva, botones discretos, barras de prioridad encendidas. 5,34:1 en claro, 6,91:1 en oscuro.
- **Tinta tenue** (ink-faint / night-ink-faint): solo texto que no hace falta leer para operar: placeholders ("Buscar", "Añade una descripción…"), tareas hechas y subtareas tachadas, marcas de los extremos de la línea de medida. En claro da 2,79:1: no sirve para información.
- **Velo** (scrim): capa detrás de los diálogos.

Los puntos de color de proyecto (en el mock, índigo, verde `#2e9e6b` y ámbar `#c9822b`) son datos del usuario, no tokens del sistema: aparecen solo como punto de 7-8px junto al nombre del proyecto.

### Named Rules
**La Regla de la Voz Única.** El índigo marca acción, selección y progreso, y nada más. Cada pantalla tiene un solo botón primario índigo en la cabecera; el bloque Ahora puede tener el suyo porque es la acción del momento.

**La Regla del Atraso sin Culpa.** Lo atrasado se dice con texto naranja y se resume (3 visibles + "Ver las N restantes" + acción en bloque). Ni fondos rojos, ni insignias, ni iconos de alarma.

## Typography

**Display Font:** Inter (con system-ui, sans-serif)
**Body Font:** Inter (con system-ui, sans-serif)

**Character:** Una sola familia neutra y técnica; la jerarquía sale del peso y del color de tinta, no de saltos de tamaño. Tracking ligeramente cerrado (-0,005em) en todo, más cerrado (-0,015em) en el título grande.

### Hierarchy
- **Headline** (600, 20px, -0,015em): título de la tarea en el bloque Ahora y título del formulario de tarea. Es el único tamaño grande de la app.
- **Title** (600, 14px): título de página en la cabecera ("Hoy", "Tareas"); con 13px/600, nombre de las cabeceras de grupo.
- **Body** (400, 14px): títulos de fila de tarea y hábito, texto general; las notas del formulario suben a 14,5px.
- **Control** (500, 13px): botones, fichas de propiedad, pestañas, segmentos; la navegación lateral y los valores de casilla usan 13,5px/500.
- **Meta** (400, 12,5px): metadatos de fila (hora, estimación, racha), subtítulos de hábito, pie de objetivo.
- **Measure** (500, 12,5px, dígitos tabulares): etiqueta de duración de la línea de medida; las horas de inicio/fin y "quedan 13 min" también van en tabulares.
- **Label** (500, 12px): etiquetas de casilla ("Proyecto", "Prioridad"), grupo "Proyectos" de la barra lateral, píldoras de etiqueta y `kbd`. 12px es el suelo: nada por debajo.

### Named Rules
**La Regla del Suelo de 12px.** Ningún texto baja de 12px (ni `text-[10px]` ni `text-[11px]`), tampoco atajos, iniciales de día ni el logotipo.

**La Regla de las Cifras Quietas.** Horas, duraciones y contadores que cambian usan dígitos tabulares para que no bailen.

## Layout

Escritorio primero, en tres columnas fijas: barra lateral de 224px, contenido flexible y columna derecha de 300px (objetivo de la semana y progreso) en Hoy. Cabecera de 48px con icono, título, contexto atenuado (fecha, "32 abiertas") y acciones a la derecha, la primaria la última.

El contenido es una lista de filas a sangre completa con 24px de margen horizontal (gutter), separadas por filetes de 1px: filas de tarea de 40px, cabeceras de grupo de 36px sobre fondo lateral y filete arriba y abajo, filas de hábito de 60px en rejilla (estado 16px, icono 28px, nombre, semana, racha 90px), fila "Ver las N restantes" de 34px sangrada a 72px. En Tareas, las columnas de cuándo (92px) y estimación (56px) se alinean a la derecha con ancho fijo. Pestañas bajo la cabecera y barra de atajos fija al pie en listas navegables por teclado.

Ritmo de separación: 6, 8, 10 y 12px dentro de componentes; 18px de relleno en diálogos, 20px en la columna derecha, 22px entre bloques de esa columna. El diálogo de tarea se centra arriba (110px desde el borde; 36px en la versión completa). La versión móvil no está en el mock y queda por definir en la implementación.

## Elevation & Depth

Sistema plano: la profundidad se construye con cambios de tono (papel, lateral, gris de selección) y filetes de 1px. Nada tiene sombra en reposo salvo el diálogo, que es la única superficie que flota sobre el velo.

### Shadow Vocabulary
- **Diálogo** (`box-shadow: 0 24px 60px -12px rgba(0,0,0,.35)`): solo el formulario de tarea y otros diálogos sobre el velo.
- **Anillo de foco** (`box-shadow: 0 0 0 2px <índigo>` con borde transparente): ficha o control con foco de teclado.
- **Anillo de hoy** (`box-shadow: 0 0 0 2px <papel>, 0 0 0 3.5px <tinta>`): el día actual en la semana de un hábito.

### Named Rules
**La Regla del Plano por Defecto.** Superficies planas en reposo; la única sombra ambiental es la del diálogo. Sin resplandores.

## Shapes

Esquinas suavemente redondeadas y pequeñas: 6px en controles (botones, fichas, buscador, navegación), 8px en contenedores (casillas del bloque Ahora, tarjeta de objetivo), 12px solo en diálogos, 4px en `kbd`. El segmentado anida 7px por fuera y 5px por dentro; el icono de hábito usa 7px. Formas completamente redondas solo para lo que es un estado o una etiqueta: círculo de estado de 14px con borde de 1,5px, días de hábito de 24px, píldoras de etiqueta y conmutador.

Formas propias del sistema: la **prioridad** son tres barras de 3px de ancho y 5/8/11px de alto (encendidas en tinta atenuada, apagadas en filete); el **estado** es un círculo vacío (pendiente), relleno a medias con un cono índigo (en curso) o lleno índigo con marca blanca (hecha); los días no programados de un hábito llevan borde discontinuo. Todos los bordes son de 1px.

## Components

### Buttons
Compactos y callados; el color solo se lo gana la acción principal.
- **Shape:** esquinas suaves (6px), 28px de alto, 10px de relleno lateral, icono Lucide de 16px con 6px de separación.
- **Primary:** fondo índigo, texto blanco, con su atajo en `kbd` a la derecha. El texto nombra su objeto: "Nueva tarea", "Crear tarea", "Guardar tarea", "Empezar foco", "Nuevo hábito".
- **Secondary:** fondo papel, borde de filete, texto tinta ("Foco", "Hecha", "Cancelar", "Filtros").
- **Quiet:** sin borde ni fondo, texto atenuado ("Aplazar", "Eliminar").
- **Hover / Focus:** el mock no los dibuja; en la implementación, hover al gris de selección en secundarios y discretos, y foco con el anillo índigo de 2px.

### Chips
- **Fichas de propiedad** (formulario): 28px, esquinas de 6px, borde de filete, 13px/500, icono delante (prioridad en barras, calendario, carpeta, temporizador). Van todas en una fila; la que tiene foco lleva el anillo índigo de 2px. La ficha "más" es solo el icono en tinta atenuada.
- **Píldoras de etiqueta:** redondas, borde de filete, 12-12,5px, con punto de color de proyecto en las filas; la de "Añadir" con borde discontinuo y texto atenuado.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** papel, sin relleno de color.
- **Shadow Strategy:** ninguna (ver Elevation & Depth).
- **Border:** 1px de filete.
- **Internal Padding:** 12px (tarjeta de objetivo); 8px 12px (casillas).

### Inputs / Fields
- **Style:** el buscador de la barra lateral es de 30px, borde de filete, esquinas de 6px, fondo papel, icono de lupa y `kbd` "Ctrl K" alineado a la derecha. En el formulario, título y notas no tienen caja: el título escribe en 20px con cursor índigo y las notas en 14,5px.
- **Select:** caja de 28px con borde de filete y chevron atenuado.
- **Segmentado:** borde de filete de 7px con 2px de relleno; el segmento activo en gris de selección y tinta.
- **Conmutador:** 26x16px redondo en filete con perilla de papel.
- **Focus:** anillo índigo de 2px. Estados de error y deshabilitado sin definir en el mock.

### Navigation
- **Barra lateral** (224px, fondo lateral, borde derecho): marca con logotipo cuadrado de 20px (esquinas de 5px, tinta sobre papel invertido), buscador, secciones con icono Lucide, nombre y atajo en `kbd` sin fondo ("G H", "G T"), y grupo "Proyectos" con punto de color. Elementos de 30px, 13,5px/500, tinta atenuada; el activo pasa a gris de selección y tinta.
- **Pestañas:** 13px/500 atenuadas; la activa en tinta con subrayado de 2px en tinta (no índigo).
- **Barra de atajos:** pie de las listas en fondo lateral con `kbd` y verbo ("J K moverse", "X hecha").

### Kbd
Atajos siempre visibles: Inter, fondo gris de selección, texto atenuado, esquinas de 4px, relleno 1px 5px. Dentro del botón primario el fondo pasa a blanco translúcido y hereda el blanco del texto.

### Listas agrupadas
Cabecera de grupo con nombre en 600, contador en tinta atenuada y acciones en bloque a la derecha ("Mover todas a mañana", "Ver todas"). Fila: círculo de estado, barras de prioridad, título que se recorta con puntos suspensivos, píldora de proyecto y metadatos alineados a la derecha con icono de 16px. La fila seleccionada toma el gris de selección; la atrasada mantiene el título en tinta y pasa solo los metadatos de fecha a naranja.

### Bloque Ahora (componente firma)
La tarea actual como ficha medida, arriba de Hoy, con 18px 24px 20px de relleno y filete inferior.
- **Cabecera:** círculo en curso + "Ahora" en 13px/600 atenuado; a la derecha "quedan 13 min" en tabulares.
- **Título:** Headline (20px/600).
- **Línea de medida:** trazo de 2px en filete con topes verticales de 12px en tinta tenue en cada extremo; relleno índigo hasta el avance; duración centrada sobre la línea, recortada con fondo papel (Measure); inicio y fin debajo, en los extremos, 12px atenuado y tabulares.
- **Casillas:** cuatro celdas iguales (Proyecto, Prioridad, Energía, Objetivo) en una caja de 8px con filete, separadas por filetes verticales; etiqueta en Label atenuada encima, valor en 13,5px/500 recortado.
- **Acciones:** "Empezar foco" primario con `kbd` F, "Hecha" secundario con `kbd` X, "Aplazar" discreto.

### Formulario de tarea
Diálogo de 680px (700px en edición completa), esquinas de 12px, sombra de diálogo. Migas arriba (píldora de proyecto › "Nueva tarea") con cierre; título; notas; fila única de fichas de propiedad (prioridad, fecha, proyecto, estimación); sección "Más" bajo un filete con filas de 40px y etiqueta de 130px con icono: Energía (segmentado Baja/Media/Alta), Etiquetas (píldoras + "Añadir"), Objetivo (select), Repetir (conmutador + pista), Subtareas (contador y lista con círculos). Pie con filete: al crear, conmutador "Crear más" y "Crear tarea"; al editar, "Eliminar" discreto a la izquierda, "Guardado automático", "Cancelar" y "Guardar tarea".

### Fila de hábito
Semana de siete días en círculos de 24px: marcado en índigo con texto blanco, pendiente con filete, no programado con borde discontinuo, hoy con anillo de tinta. Racha con icono de llama y "N días" atenuado a la derecha.

## Do's and Don'ts

### Do:
- **Do** usar solo iconos lineales Lucide a través de `src/design/icons.ts`, a 16px con trazo de 1,75 (14px en pestañas y selects).
- **Do** reservar el índigo para acción, selección y progreso; un solo botón primario por cabecera.
- **Do** comprobar que el texto blanco sobre el acento pasa WCAG AA (4,5:1) en ambos temas.
- **Do** nombrar el objeto en las acciones primarias: "Crear tarea", "Guardar tarea", "Nuevo hábito".
- **Do** mostrar el atajo de teclado en `kbd` junto a cada acción y sección que lo tenga.
- **Do** marcar el atraso solo con texto naranja en los metadatos y resumirlo (3 visibles + acción en bloque).
- **Do** expresar estado y prioridad por forma: círculo vacío / medio / lleno con marca; tres barras de prioridad.
- **Do** usar el bloque Ahora (línea de medida + 4 casillas) para la tarea en curso; es el componente firma.
- **Do** construir el formulario de tarea como título + notas + fichas de propiedad en una fila + sección "Más" (energía, etiquetas, objetivo, repetir, subtareas).
- **Do** cuidar el tema oscuro igual que el claro, con sus propios valores de acento y naranja.

### Don't:
- **Don't** usar emoji en la interfaz.
- **Don't** usar sombras de resplandor (`shadow-glow`) ni el cian antiguo `#5EC8FF`.
- **Don't** bajar de 12px (`text-[10px]`, `text-[11px]`) en ningún texto.
- **Don't** poner fondos de alarma (rojos, naranjas o rellenos) en tareas atrasadas.
- **Don't** usar la tinta tenue para información que haga falta leer: en claro no llega a 3:1.
- **Don't** añadir sombras a tarjetas, filas o fichas; la profundidad es tonal y de filete.
- **Don't** usar botones genéricos sin objeto ("Guardar", "Aceptar", "Enviar") como acción primaria.
