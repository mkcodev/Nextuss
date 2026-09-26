---
name: Nextuss
description: Centro de mando personal (hábitos, tareas, objetivos y foco) con aspecto de herramienta profesional sobria.
colors:
  indigo-accent: "#5058c8"
  indigo-accent-strong: "#4249b3"
  indigo-accent-soft: "rgba(80, 88, 200, 0.1)"
  on-accent: "#ffffff"
  paper: "#ffffff"
  paper-side: "#f7f7f8"
  paper-hover: "#ededf0"
  hairline: "#e7e7eb"
  hairline-strong: "#d4d4db"
  ink: "#1b1b20"
  ink-dim: "#5c5c66"
  ink-faint: "#6a6a75"
  overdue-orange: "#a64d08"
  success-green: "#1b7f53"
  danger-red: "#c8322e"
  night: "#131316"
  night-side: "#0f0f11"
  night-hover: "#1f1f24"
  night-hairline: "#26262c"
  night-hairline-strong: "#34343c"
  night-ink: "#e7e7eb"
  night-ink-dim: "#9d9da8"
  night-ink-faint: "#8b8b96"
  indigo-accent-night: "#7c84e8"
  indigo-accent-strong-night: "#9097ee"
  indigo-accent-soft-night: "rgba(124, 132, 232, 0.16)"
  on-accent-night: "#0f1020"
  overdue-orange-night: "#f0a25e"
  success-green-night: "#4cc38a"
  danger-red-night: "#f07470"
  scrim: "rgba(0, 0, 0, 0.35)"
typography:
  headline:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  dialog-title:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  title:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.43
  body:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.43
  button:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.43
  control:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  measure:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    fontFeature: "\"tnum\" 1"
  meta:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.indigo-accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-accent-strong}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "rgba(200, 50, 46, 0.1)"
    textColor: "{colors.danger-red}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-sm:
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  property-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  property-chip-empty:
    textColor: "{colors.ink-dim}"
  toggle-option:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "28px"
  toggle-option-on:
    backgroundColor: "{colors.indigo-accent-soft}"
    textColor: "{colors.indigo-accent}"
  segmented-control:
    backgroundColor: "transparent"
    rounded: "{rounded.md}"
    padding: "2px"
  segment-active:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "28px"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "6px 10px"
  title-field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    padding: "0 0 4px"
  form-rows:
    backgroundColor: "{colors.paper-side}"
    rounded: "{rounded.md}"
    padding: "4px 16px"
  kbd:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "2px 6px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  nav-item-active:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
  mobile-nav-item:
    backgroundColor: "{colors.paper-side}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    padding: "8px 4px"
  mobile-nav-item-active:
    textColor: "{colors.indigo-accent}"
  list-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "40px"
  list-row-active:
    backgroundColor: "{colors.paper-hover}"
  card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  now-block:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "20px"
  week-day:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    size: "24px"
  week-day-done:
    backgroundColor: "{colors.indigo-accent}"
    textColor: "{colors.on-accent}"
  empty-state:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "32px 24px"
  menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 0"
    width: "208px"
  popover:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px"
    width: "256px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
    width: "672px"
---

# Design System: Nextuss

## Overview

**Creative North Star: "La herramienta precisa"**

Nextuss se ve como una herramienta profesional sobria, del tipo Linear: listas en filas de 40px separadas por filetes de 1px, una sola familia tipográfica (Inter), radios pequeños y un único acento índigo reservado para acción, selección y progreso. Nada brilla ni flota sin motivo: solo los diálogos, menús y paneles emergentes proyectan sombra. La densidad es alta pero ordenada; la información se lee por posición y por forma, no por manchas de color.

La firma del sistema es la **ficha medida**: en Hoy, la tarea que toca no es una fila más sino el bloque "Ahora", con su título a 20px, una línea de medida (inicio, fin, duración y tramo transcurrido) y cuatro casillas de propiedades. Los estados se dicen por forma: círculo vacío, medio lleno o lleno con marca; prioridad como tres barras en tinta atenuada; la semana de un hábito como siete círculos. El teclado es ciudadano de primera: atajos visibles en `kbd`, flechas dentro de cada grupo de opciones, Esc que cierra solo la capa de arriba y un foco que nunca se escapa de un diálogo.

Anti-referencia confirmada: la estética anterior de la app (tablero SaaS oscuro con brillo cian `#5EC8FF` y sombras de resplandor). Este documento se deriva del código construido (`src/index.css`, `src/design/primitives/*` y las vistas de Hoy, Tareas y Hábitos) y sustituye a la versión anterior sacada del mock.

**Key Characteristics:**
- Claro: blanco con laterales gris 1%; oscuro: casi negro, cuidado igual que el claro y con sus propios valores de acento y naranja.
- Un solo acento índigo y un solo botón primario por pantalla; naranja solo como texto de atraso.
- Filetes de 1px y radios de 6 / 8 / 12px; sombra solo en lo que flota.
- Inter en todo; jerarquía por peso (400/500/600) y tinta, con un único tamaño grande (20px).
- Estados y prioridad por forma; cifras con dígitos tabulares.
- Teclado visible y completo; movimiento breve que se reduce a opacidad si el usuario lo pide.

## Colors

Paleta neutra casi monocroma, con un índigo como única voz y un naranja que solo aparece para decir "esto va tarde". Todos los pares de texto pasan WCAG AA (4,5:1) en los dos temas, también sobre el lateral y sobre el gris de selección.

### Primary
- **Índigo de acción** (indigo-accent; en oscuro indigo-accent-night): fondo del botón primario, relleno de la línea de medida y de las barras de progreso, círculo de estado en curso o hecho, días hechos de un hábito, interruptor encendido, opción marcada de un grupo, icono de la sección activa, indicador de la pestaña activa en móvil, contorno de foco y línea inferior del campo de título. Texto sobre él: blanco en claro (5,88:1), tinta casi negra on-accent-night en oscuro (5,67:1).
- **Índigo firme** (indigo-accent-strong / indigo-accent-strong-night): solo el hover del botón primario y del interruptor.
- **Velo índigo** (indigo-accent-soft / indigo-accent-soft-night): fondo de la opción marcada en grupos de botones y selectores de icono, hover de la acción "A hoy", selección de texto. El índigo sobre este velo da 5,11:1 en claro y 4,53:1 en oscuro.

### Tertiary
- **Naranja de atraso** (overdue-orange / overdue-orange-night): solo el texto de la fecha de una tarea atrasada ("hace 12 días", la fecha en la columna de Tareas) y el aviso "Sin conexión". 5,70:1 sobre papel y 4,88:1 sobre el gris de selección; 8,86:1 en oscuro. Nunca fondo de fila, nunca insignia ni icono de alarma.

### Neutral
- **Papel** (paper / night): fondo principal, tarjetas, filas, diálogos, menús y botones secundarios.
- **Lateral** (paper-side / night-side): barra lateral, barra móvil, cabeceras de tabla, pie de atajos, panel hundido de "Más opciones" y aviso de cerrar el día.
- **Gris de selección** (paper-hover / night-hover): hover y fila activa, elemento de navegación activo, segmento activo, esqueletos de carga, fondo del icono del estado vacío.
- **Filete** (hairline / night-hairline): todos los bordes de 1px: tarjetas, filas, controles, cabecera, laterales, diálogos.
- **Filete marcado** (hairline-strong / night-hairline-strong): barras de prioridad apagadas, borde de días de hábito pendientes o de descanso, borde del estado vacío, casilla sin marcar, interruptor apagado, barra de desplazamiento.
- **Tinta** (ink / night-ink): texto principal, títulos, valores, anillo del día de hoy en la semana de un hábito.
- **Tinta atenuada** (ink-dim / night-ink-dim): metadatos, etiquetas de FormRow y de casilla, navegación inactiva, botones fantasma, placeholders del formulario, barras de prioridad encendidas. 6,61:1 en claro, 6,91:1 en oscuro.
- **Tinta tenue** (ink-faint / night-ink-faint): lo secundario que se puede leer pero no hace falta para operar: atajos "g h" de la barra lateral, placeholders de Input/Textarea, topes de la línea de medida, iniciales de días de descanso, botones de panel del navbar. Pasa AA: 5,34:1 sobre papel, 4,99:1 sobre lateral y 4,57:1 sobre gris de selección en claro; 5,50 / 5,68 / 4,87:1 en oscuro.
- **Verde de éxito** y **Rojo de peligro** (success-green / danger-red y sus variantes night): confirmaciones y acciones destructivas; el rojo es además la prioridad Urgente (`--nx-prio-1` comparte valor). Botón de peligro: texto rojo sobre rojo al 10% (4,59:1 en claro).
- **Velo** (scrim): capa negra al 35% detrás de los diálogos.

Los colores de proyecto, hábito y etiqueta (`src/lib/colors.ts`: índigo, verde, ámbar, rosa, violeta, turquesa) son datos del usuario, no tokens del sistema: aparecen como punto de 6-8px junto al nombre o como muestra en el selector de color, nunca como texto ni fondo de superficie.

### Named Rules
**La Regla de la Voz Única.** El índigo marca acción, selección y progreso, y nada más. Cada pantalla tiene un solo botón primario índigo: "Nueva tarea" en Tareas, "Nuevo hábito" en Hábitos, "Empezar foco" en el bloque Ahora de Hoy. "Nuevo" del navbar es secundario (papel con filete), porque está en todas las pantallas.

**La Regla del Atraso sin Culpa.** Lo atrasado se dice con texto naranja y se resume: 3 visibles, "Ver las N restantes" y acciones en bloque ("Mover todas a mañana", "Aparcar todas") como botones fantasma. Ni fondos rojos, ni insignias, ni iconos de alarma.

**La Regla de la Prioridad Callada.** La prioridad son tres barras en tinta atenuada; solo Urgente (P1) se pinta en rojo. El nombre de la prioridad siempre acompaña en texto o en la etiqueta accesible.

## Typography

**Display Font:** InterVariable (con ui-sans-serif, system-ui, -apple-system, sans-serif)
**Body Font:** InterVariable (misma pila)

**Character:** Una sola familia neutra y técnica; la jerarquía sale del peso y del tono de tinta, no de saltos de tamaño. Solo los títulos de 20px cierran el tracking (-0,025em); el resto va sin ajuste.

### Hierarchy
- **Headline** (600, 20px, 1,4, -0,025em): título de página ("Tareas", "Hábitos", la fecha en Hoy), título de la tarea en el bloque Ahora y campo de título de los formularios. Es el único tamaño grande de la app.
- **Dialog title** (600, 16px, 1,5): título de diálogo.
- **Title** (600, 14px): cabeceras de sección ("Atrasadas", "Archivados") y título del estado vacío.
- **Body** (400, 14px, 1,43): títulos de fila, notas, etiquetas de FormRow, elementos de menú, texto general.
- **Button** (500, 14px): botones de 32px y navegación lateral.
- **Control** (500, 13px): botones de 28px, fichas de propiedad, grupos de opciones, pestañas, acciones en bloque, columnas de la tabla de tareas.
- **Measure** (500, 13px, dígitos tabulares): duración centrada sobre la línea de medida.
- **Meta** (400, 12px): metadatos de fila, fecha de atraso, horas de inicio y fin, pistas bajo un campo, pie de atajos.
- **Label** (500, 12px): `kbd`, segmentos pequeños, etiquetas de la barra móvil, iniciales de día de la semana, píldoras.

### Named Rules
**La Regla del Suelo de 12px.** Ningún texto baja de 12px (ni `text-[10px]` ni `text-[11px]`), tampoco atajos, iniciales de día ni etiquetas de la barra móvil. Hoy no hay ninguna excepción en `src/`.

**La Regla de las Cifras Quietas.** Horas, duraciones, contadores y fechas que cambian usan dígitos tabulares (`tabular-nums`) para que no bailen.

## Layout

Escritorio primero, en tres zonas: barra lateral de 224px (plegable a 60px, solo iconos), contenido flexible y panel derecho opcional. Cabecera global de 56px con botón de plegar, punto índigo + "Nextuss", miga con la sección actual, buscador/paleta (hasta 384px, `Ctrl K`), "Nuevo" secundario con `kbd` i, nivel, avatar y botón del panel derecho.

Cada página centra su contenido con un ancho propio (Hábitos 768px, Tareas 1024px, Hoy 1152px) y 24px de relleno, 32px desde `lg`. La cabecera de página lleva el título Headline a la izquierda y las acciones a la derecha, la primaria la última. Hoy pasa a dos columnas desde `lg` (contenido + columna de 300px, 24px de separación); las secciones se apilan con 24px entre ellas. Listas y tablas viven en un contenedor de 8px con filete: filas de 40px separadas por filetes, cabecera de tabla de 36px sobre lateral, pie de atajos en lateral.

Ritmo de separación: 6 y 8px dentro de componentes, 12px de relleno lateral en filas y casillas, 16px en paneles hundidos, 20px en el bloque Ahora, 24px en diálogos y entre secciones.

Móvil (por debajo de 768px): desaparece la barra lateral y aparece una barra inferior fija sobre lateral con filete superior y margen de zona segura: 4 destinos (Hoy, Planificación, Hábitos, Tareas) + "Crear" + "Panel"; Estadísticas, Proyectos y Ajustes quedan en la paleta y el menú del avatar. Por debajo de 640px las FormRow apilan etiqueta sobre control, las casillas del bloque Ahora pasan a 2x2 y el navbar esconde marca, miga y textos de botón.

## Elevation & Depth

Sistema plano: la profundidad se construye con cambios de tono (papel, lateral, gris de selección) y filetes de 1px. Las tarjetas llevan una sombra casi invisible que solo asienta el borde; lo único que flota de verdad (diálogo, menú, popover) lleva la sombra de diálogo.

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 1px 2px rgba(20, 20, 30, 0.04)`; oscuro `0 1px 2px rgba(0, 0, 0, 0.3)`): Card y tooltip. Imperceptible a propósito.
- **Diálogo** (`box-shadow: 0 24px 60px -12px rgba(20, 20, 30, 0.28)`; oscuro `rgba(0, 0, 0, 0.6)`): diálogos sobre el velo, menús desplegables y popovers.
- **Fila activa** (`box-shadow: inset 2px 0 0 <índigo>`): la fila con el cursor de teclado en la tabla de Tareas, además del gris de selección.
- **Anillo de hoy** (anillo de 2px en tinta con 2px de separación en papel): el día actual en la semana de un hábito.

### Named Rules
**La Regla del Plano por Defecto.** Superficies planas en reposo; solo lo que flota sobre otra capa lleva la sombra de diálogo. Sin resplandores, sin escalar elementos para destacarlos.

## Shapes

Esquinas pequeñas y consistentes: 6px en controles (botones, fichas, inputs, selects, elementos de menú y navegación, segmentos), 8px en contenedores (tarjetas, bloque Ahora y sus casillas, listas, panel de "Más opciones", menús, popovers, esqueletos, marco del segmentado), 12px solo en diálogos y estados vacíos, 4px en `kbd` y casillas de verificación. Formas redondas solo para lo que es un estado, un dato o un interruptor: círculo de estado (14-16px, borde de 1,5px), días de la semana (24px), muestras de color (24px), puntos de proyecto, píldoras de etiqueta, interruptor.

Formas propias: la **prioridad** son tres barras de 3px de ancho y 5 / 8 / 11px de alto, con 1px de separación y esquinas de 1px (P1 y P2 tres llenas, P3 dos, P4 una; las vacías en filete marcado); el **estado** es un círculo vacío (pendiente), medio lleno con un cono índigo (en curso) o lleno índigo con marca (hecha); la **línea de medida** es un trazo de 2px con topes verticales de 12px. Lo opcional o lo que falta se dibuja con borde discontinuo: días de descanso, estado vacío, campo "nueva etiqueta". Todos los bordes son de 1px.

## Components

### Buttons
Compactos y callados; el color solo se lo gana la acción principal.
- **Shape:** esquinas de 6px; 32px de alto y 12px de relleno (md, por defecto) o 28px y 10px (sm, barras de herramientas); icono Lucide de 14px con 6-8px de separación.
- **Primary:** fondo índigo, texto on-accent; el texto nombra su objeto ("Nueva tarea", "Crear tarea", "Guardar tarea", "Empezar foco", "Nuevo hábito"). En formularios lleva su atajo dentro (`Ctrl ↵` en un `kbd` con velo negro al 15%).
- **Secondary:** papel, filete, tinta ("Hecha", "Nueva vista", "Volver a hoy", "Nuevo" del navbar).
- **Ghost:** sin fondo ni borde, tinta atenuada ("Cancelar", "Pasar a mañana", "Cerrar el día", "Eliminar").
- **Danger:** texto rojo sobre rojo al 10% ("Descartar").
- **Hover / Focus:** hover a índigo firme (primario) o gris de selección (resto); foco con contorno índigo de 2px separado 2px. Mientras guarda, `aria-busy` con indicador giratorio; nunca `disabled`, para no perder el foco.

### Chips
- **Fichas de propiedad** (formulario de tarea): 28px, esquinas de 6px, filete, 13px/500, icono delante (barras de prioridad, calendario, carpeta, temporizador). Vacía muestra el nombre de la propiedad en tinta atenuada; con valor, en tinta. Abren un Menu o un Popover; abiertas quedan en gris de selección.
- **Grupo de opciones** (ToggleGroup): botones de 28px con filete; la marcada en velo índigo con borde y texto índigo, y `aria-pressed`.
- **Píldoras de etiqueta:** redondas, filete, 12px; la de añadir con borde discontinuo.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** papel; el panel de "Más opciones" y los avisos van en lateral.
- **Shadow Strategy:** sombra de tarjeta casi invisible (ver Elevation & Depth).
- **Border:** 1px de filete.
- **Internal Padding:** 12px (avisos, barras de acciones en bloque), 16px de lado en FormRows, 20px en el bloque Ahora.
- **Estado vacío:** borde discontinuo en filete marcado, esquinas de 12px, icono de 18px en un cuadrado de 36px sobre gris de selección, título en 14px/600, descripción atenuada y, si procede, una acción.
- **Carga:** esqueletos en gris de selección con pulso, del mismo alto que la fila que sustituyen (40px).

### Inputs / Fields
- **Style:** Input, Select y Textarea en papel con filete, esquinas de 6px, 6px 10px de relleno, 14px; placeholder en tinta tenue. NumberInput de 32px con dígitos tabulares; deja vaciar el campo y aplica el mínimo al salir.
- **Campos sin caja** (TitleField, NotesField): el título escribe a 20px/600 y las notas a 14px, sin borde; al enfocar aparece una línea inferior índigo en lugar del contorno. El título con error pasa la línea a rojo y anuncia el mensaje.
- **FormRow:** etiqueta en tinta atenuada a la izquierda (columna de 120px) y control a la derecha desde 640px; debajo, apiladas. Las filas viven en un panel hundido (lateral, filete, 8px) separadas por filetes; las pistas van debajo en 12px atenuado.
- **Segmentado / Pestañas:** marco de 8px con filete y 2px de relleno; el segmento activo en gris de selección y tinta. Mismo componente para ambos, con semántica de `tablist`.
- **Interruptor:** pista redonda de 36x20px (índigo encendido, filete marcado apagado) con perilla blanca de 16px.
- **Selectores de color e icono:** `radiogroup` con nombre accesible por opción; color seleccionado con anillo de tinta, icono seleccionado en velo índigo.
- **Focus:** contorno índigo de 2px separado 2px (global); borde índigo en campos con caja.

### Navigation
- **Barra lateral** (224px, lateral, filete derecho): elementos de 32px, 14px/500, icono de 16px con trazo de 1,75 y atajo "g h" en tinta tenue a la derecha. Inactivo en tinta atenuada; activo en gris de selección, tinta e icono índigo. Plegada a 60px muestra solo iconos con el atajo en el `title`.
- **Barra móvil:** 4 destinos + "Crear" + "Panel", icono de 18px sobre etiqueta de 12px/500; la activa en índigo con una barra de 2px arriba.
- **Menús:** 208px, esquinas de 8px, sombra de diálogo; elementos de 14px en tinta atenuada con gris de selección al pasar o enfocar; los de selección llevan marca índigo y `menuitemradio`; los destructivos en rojo.
- **Kbd:** 12px/500 en tinta atenuada, filete, esquinas de 4px, 2px 6px de relleno, sin fondo. Los atajos se muestran junto a su acción y en el pie de las listas navegables ("j k moverse", "Enter abrir", "c nueva tarea").

### Teclado
- **Grupos de radio** (color, icono): una sola parada de Tab; flechas, Inicio y Fin mueven y eligen.
- **Pestañas y segmentado:** solo la pestaña activa es tabulable; flechas izquierda/derecha, Inicio y Fin cambian de pestaña.
- **Menús:** flechas arriba/abajo, Inicio y Fin; Tab cierra; Esc cierra y devuelve el foco al disparador.
- **Esc por capas:** menús y popovers detienen el Esc para que no cierre el diálogo de debajo; el diálogo solo responde si es el de arriba. Si hay cambios sin guardar, Esc o clic fuera muestran "¿Descartarlos?" en el pie en lugar de cerrar.
- **Diálogos:** el foco nunca se escapa: Tab y Mayús+Tab dan la vuelta dentro del panel, y si el foco se pierde vuelve al panel. Al cerrar, vuelve a donde estaba. `Ctrl+Enter` guarda los formularios.

### Motion
- **Curva y tiempos:** ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)`; 120 / 180 / 280ms.
- **Listas:** cada elemento entra con opacidad y 4px de desplazamiento (180ms) y al salir se pliega para que el resto suba sin salto (`listItemMotion`).
- **Diálogos:** opacidad + escala 0,98 + 6px, 150ms. El bloque Ahora entra con 4px en 220ms.
- **Movimiento reducido:** solo opacidad, sin desplazar, escalar ni plegar; el CSS global anula el resto de transiciones.

### Bloque Ahora (componente firma)
La tarea que toca, como ficha medida arriba de Hoy: contenedor de 8px con filete y 20px de relleno.
- **Cabecera:** círculo de estado (en curso con cono índigo, o vacío si es "A continuación") + "Ahora" en 14px/600 atenuado; a la derecha "quedan 13 min" o "empieza en…" en tabulares.
- **Título:** Headline; se pulsa para editar la tarea.
- **Línea de medida:** trazo de 2px en filete con topes de 12px en tinta tenue; tramo transcurrido en índigo; duración centrada sobre la línea con fondo papel (Measure); inicio y fin debajo en 12px atenuado. Es un `meter` con texto accesible completo.
- **Casillas:** Proyecto, Prioridad, Energía, Objetivo en una caja de 8px con filetes internos; etiqueta en 12px atenuado y valor en 14px/500 recortado, con punto de color de proyecto.
- **Acciones:** "Empezar foco" primario, "Hecha" secundario, "Pasar a mañana" fantasma.

### Listas de tareas
Tabla en contenedor de 8px: cabecera de 36px en lateral con columnas ordenables, filas de 40px con casilla de selección, círculo de estado de 16px, título que se recorta y columnas en 13px atenuado (prioridad en barras, proyecto con punto, etiquetas en píldora, fecha, estimación en tabulares). La fila con el cursor de teclado va en gris de selección con una barra índigo de 2px a la izquierda. Hecha: círculo índigo con marca y título tachado en tinta atenuada. Atrasada: solo la fecha pasa a naranja.

### Atrasadas
Cabecera "Atrasadas" con contador y acciones en bloque fantasma; lista de filas de 40px con título, fecha relativa en naranja, acción "A hoy" en texto índigo y menú de la tarea. Tres visibles y "Ver las N restantes".

### Semana del hábito
Siete círculos de 24px bajo cada hábito, lunes a domingo, de solo lectura: hecho en índigo con marca, tocaba y no está hecho con borde en filete marcado e inicial en tinta atenuada, descanso con borde discontinuo e inicial en tinta tenue, hoy con anillo de tinta. Cada día anuncia su estado ("Lunes: hecho"). A la derecha, la pauta y la mejor racha en 12px atenuado.

### Cerrar el día
No abre ningún diálogo por su cuenta. En Hoy hay un botón fantasma "Cerrar el día" en la cabecera y, cuando toca, una sugerencia en línea arriba del contenido (lateral, filete, 8px, icono de luna): "Buen momento para cerrar el día." con "Cerrar el día" secundario y "Ahora no" fantasma. El diálogo solo se abre si el usuario lo pide.

### Formulario de tarea
Diálogo de hasta 672px, esquinas de 12px, sombra de diálogo. Receta común a los formularios: campo de título sin caja, notas sin caja, fila de fichas de propiedad (prioridad, fecha, proyecto, estimación), desplegable "Más opciones" bajo un filete con resumen de lo rellenado y FormRows dentro (energía, etiquetas, objetivo, repetir, subtareas), y pie fijo con filete: a la izquierda "Crear otra" con interruptor (al crear) o "Eliminar" fantasma (al editar); a la derecha "Cancelar" fantasma y el primario con `Ctrl ↵`. Al tabular, el campo enfocado nunca queda bajo el pie.

## Do's and Don'ts

### Do:
- **Do** usar solo iconos lineales Lucide: 16px con trazo de 1,75 en navegación, 14px en botones y fichas, 18px en la barra móvil.
- **Do** reservar el índigo para acción, selección y progreso, con un solo botón primario por pantalla; "Nuevo" del navbar es secundario.
- **Do** comprobar AA (4,5:1) en los dos temas para todo texto, también sobre lateral y gris de selección; en oscuro el texto sobre índigo es on-accent-night (#0f1020), no blanco.
- **Do** nombrar el objeto en las acciones primarias: "Crear tarea", "Guardar tarea", "Nuevo hábito".
- **Do** mostrar el atajo en `kbd` junto a la acción y en el pie de las listas navegables.
- **Do** marcar el atraso solo con texto naranja en la fecha y resumirlo (3 visibles + acciones en bloque).
- **Do** expresar prioridad con tres barras en tinta atenuada (solo P1 en rojo) y estado con círculo vacío / medio / lleno con marca.
- **Do** construir formularios con TitleField + NotesField + fichas de propiedad + "Más opciones" en FormRows + pie fijo con `Ctrl+Enter`.
- **Do** usar `listItemMotion` para listas que ganan o pierden elementos, y reducir a solo opacidad con movimiento reducido.
- **Do** dar a cada grupo de opciones su patrón de teclado: radiogroup y tablist con flechas, menús con flechas y Esc, diálogos que retienen el foco.
- **Do** sugerir cerrar el día en línea, con "Ahora no", en vez de abrir un diálogo.

### Don't:
- **Don't** usar emoji en la interfaz.
- **Don't** usar sombras de resplandor (`shadow-glow`) ni el cian antiguo `#5EC8FF`.
- **Don't** bajar de 12px (`text-[10px]`, `text-[11px]`) en ningún texto.
- **Don't** poner fondos de alarma (rojos, naranjas o rellenos) en tareas atrasadas.
- **Don't** pintar la prioridad en cuatro colores ni como insignia de color; solo Urgente lleva rojo.
- **Don't** añadir sombras a filas, fichas o elementos en reposo, ni escalar un elemento para destacarlo.
- **Don't** usar botones genéricos sin objeto ("Guardar", "Aceptar", "Enviar") como acción primaria.
- **Don't** abrir diálogos que el usuario no ha pedido.
- **Don't** usar radios de 12px en controles; 12px es solo para diálogos y estados vacíos.
