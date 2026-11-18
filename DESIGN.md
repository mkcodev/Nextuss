---
name: Nextuss
description: Centro de mando personal (hábitos, tareas, objetivos y foco). Dirección v2 «Línea»; oscura primero, precisa y tranquila.
colors:
  glacier-accent: "#13857a"
  glacier-accent-strong: "#0a7a70"
  glacier-text: "#0a7a70"
  glacier-soft: "color-mix(in srgb, #13857a 12%, transparent)"
  on-accent: "#ffffff"
  paper: "#fbfbfc"
  paper-side: "#f4f5f7"
  paper-surface: "#ffffff"
  paper-hover: "#eef0f3"
  hairline: "#e4e6ea"
  hairline-strong: "#c9ccd3"
  ink: "#17181b"
  ink-dim: "#5b5f69"
  ink-faint: "#6b707a"
  amber: "#b86a0a"
  ember: "#e5592e"
  danger: "#d0453a"
  scrim: "rgb(15 17 20 / 0.18)"
  night: "#0d0e10"
  night-side: "#0a0b0d"
  night-surface: "#131418"
  night-hover: "#1b1d22"
  night-hairline: "#22252b"
  night-hairline-strong: "#3a3e46"
  night-ink: "#eceef1"
  night-ink-dim: "#9a9ea8"
  night-ink-faint: "#797e88"
  glacier-accent-night: "#35c9b9"
  glacier-accent-strong-night: "#5cd8ca"
  glacier-text-night: "#5cd8ca"
  glacier-soft-night: "color-mix(in srgb, #35c9b9 14%, transparent)"
  on-accent-night: "#04201d"
  amber-night: "#e3a447"
  ember-night: "#f07a45"
  danger-night: "#f0715f"
  scrim-night: "rgb(0 0 0 / 0.45)"
typography:
  headline:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  dialog-title:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  title:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.43
  body:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.54
  button:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.54
  control:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  measure:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    fontFeature: "\"tnum\" 1"
  meta:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.33
  label:
    fontFamily: "'Instrument Sans Variable', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
  mono:
    fontFamily: "'Geist Mono Variable', ui-monospace, 'SFMono-Regular', Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.33
  mono-kbd:
    fontFamily: "'Geist Mono Variable', ui-monospace, 'SFMono-Regular', Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "-0.01em"
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
    backgroundColor: "{colors.glacier-accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "30px"
  button-primary-hover:
    backgroundColor: "{colors.glacier-accent-strong}"
  button-secondary:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "30px"
  button-secondary-hover:
    backgroundColor: "{colors.paper-hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "30px"
  button-ghost-hover:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "rgba(200, 50, 46, 0.1)"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "30px"
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
    backgroundColor: "{colors.glacier-soft}"
    textColor: "{colors.glacier-accent}"
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
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "5px 10px"
    height: "32px"
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
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.mono-kbd}"
    rounded: "{rounded.xs}"
    padding: "0 6px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.ink-dim}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "30px"
  nav-item-active:
    backgroundColor: "{colors.paper-hover}"
    textColor: "{colors.ink}"
  mobile-nav-item:
    backgroundColor: "{colors.paper-side}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.label}"
    padding: "8px 4px"
  mobile-nav-item-active:
    textColor: "{colors.glacier-accent}"
  list-row:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 12px"
    height: "40px"
  list-row-active:
    backgroundColor: "{colors.paper-hover}"
  card:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  now-block:
    backgroundColor: "{colors.paper-surface}"
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
    backgroundColor: "{colors.glacier-accent}"
    textColor: "{colors.on-accent}"
  empty-state:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "32px 24px"
  menu:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink-dim}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 0"
    width: "208px"
  popover:
    backgroundColor: "{colors.paper-surface}"
    rounded: "{rounded.md}"
    padding: "12px"
    width: "256px"
  dialog:
    backgroundColor: "{colors.paper-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
    width: "672px"
---

# Design System: Nextuss

## Overview

**Creative North Star: «Línea», precisión tranquila**

Nextuss es una herramienta de trabajo diario para alguien con TDAH: todo se hace a mano desde el teclado y no hay nada que sobre. La identidad v2 nace de la fase A del rediseño (issue #174; mockups en `docs/design/rediseno-v2/ronda-2/direcciones/linea/`). Se basa en tres ideas:
- **Oscura primero:** el tema oscuro es el principal, con grises fríos. El claro tiene sus propios valores y se cuida igual.
- **Filetes de 1 px:** separan tarjetas y filas. No hay sombras en la página.
- **Un único acento:** turquesa glaciar, reservado para acción, selección y progreso.

La personalidad está en el movimiento, firme y preciso, con un solo destello al completar.

Este documento sustituye a la v1 («La herramienta precisa», Inter e índigo), que se conserva en `docs/design-history/DESIGN-v1.md`. **Estado: fase 1b** (issue #183). Están cerrados los tokens (fase 0), los primitivos de `src/design/primitives/` (fase 1a) y la navegación (fase 1b). Las pantallas llegan en las fases 2 a 6.

**Key Characteristics:**
- **Temas:** el oscuro es casi negro azulado (`#0d0e10`) con un lateral aún más hundido. El claro es papel frío (`#fbfbfc`) con lateral gris al 4 %.
- **Color:** un solo acento turquesa. El ámbar dice «esto va tarde» y la brasa, «urgente».
- **Superficies:** se separan por filete de 1 px. Solo flota lo que flota (diálogos, menús y avisos).
- **Tipografía:** Instrument Sans para todo el texto y Geist Mono para cifras, horas, atajos y códigos.
- **Formas antes que color:** los estados y la prioridad se dicen por forma o por texto, nunca solo por color.
- **Movimiento:** cada animación responde a una acción o a un cambio real, y nada va en bucle. Con movimiento reducido, solo hay fundidos.

## Colors

La paleta es casi monocroma y fría, con una sola voz de color. AA ya no es requisito de la v2, pero el texto principal tiene que leerse a simple vista en los dos temas. Aun así, el texto blanco del primario sobre el acento y `text-faint` sobre el fondo, `bg-soft` y `surface` cumplen 4,5:1 en los dos temas (ajuste de la fase 1a: solo baja o sube la luminosidad, mismo matiz). Los tokens viven en `src/index.css` en dos capas:
1. **Escala de referencia `--nx-ref-*`:** los hex de Línea. Ningún componente la usa directamente.
2. **Alias semánticos `--nx-*`:** se mapean a `--color-*` en `@theme`. Los nombres son los mismos que en la v1, así que ningún componente cambia en la fase 0.

### Primary
- **Turquesa glaciar** (glacier-accent; en oscuro glacier-accent-night) se usa en:
  - botón primario;
  - progreso (barras, anillo de nivel, mapa de intensidad, series de las gráficas);
  - estado en curso o hecho;
  - opción marcada;
  - contorno de foco.

  Texto sobre él: blanco en claro y tinta glaciar muy oscura (`#04201d`) en oscuro.
- **Glaciar firme** (glacier-accent-strong): hover del primario.
- **Texto glaciar** (glacier-text, token nuevo `--color-accent-text`): texto en color de acento, como enlaces y «A hoy». En claro es un punto más oscuro que el relleno y en oscuro, un punto más claro. Los componentes lo adoptan en la fase 1.
- **Velo glaciar** (glacier-soft): `color-mix()` del acento al 12 % en claro y al 14 % en oscuro. Lo usan la opción marcada, la selección de texto y el hover de acciones.

### Tertiary
- **Ámbar de atraso** (amber / amber-night): texto de lo que va tarde y prioridad P2.
- **Brasa** (ember / ember-night): prioridad P1 (urgente). Siempre va acompañada de su forma y de su nombre.

### Neutral
- **Fondo** (paper / night).
- **Lateral** (paper-side / night-side): más hundido que el fondo en los dos temas.
- **Superficie** (paper-surface / night-surface): tarjetas, filas y diálogos.
- **Gris de selección** (paper-hover / night-hover).
- **Filete** (hairline) y **filete marcado** (hairline-strong).
- **Tinta**, **tinta atenuada** e **tinta tenue** (ink, ink-dim, ink-faint y sus variantes night). La tenue solo sirve para lo secundario: topes de escala, atajos de la barra lateral y placeholders.
- **Peligro** (danger / danger-night): acciones destructivas.
- **Éxito:** comparte valor con el acento. Lo hecho es progreso.
- **Velo de capas** (scrim): tinta fría al 18 % en claro y negro al 45 % en oscuro.

Los colores de proyecto, hábito y etiqueta (`src/lib/colors.ts`) son datos del usuario, no tokens: aparecen como punto o muestra, nunca como superficie.

### Named Rules
**La Regla de la Voz Única.** El turquesa marca acción, selección y progreso, y nada más. Hay un solo botón primario por pantalla.

**La Regla sin Halo.** No hay sombras de color ni brillos alrededor del acento. Las barras de progreso son lisas.

**La Regla de la Forma.** Prioridad, estado y atraso se distinguen en escala de grises: por forma, por texto o por posición.

## Typography

**Body Font:** Instrument Sans Variable (`@fontsource-variable/instrument-sans`, OFL-1.1). Ejes wdth de 75 a 100 % y wght de 400 a 700. Solo latin y latin-ext.
**Mono Font:** Geist Mono Variable (`@fontsource-variable/geist-mono`, OFL-1.1). Eje wght. Solo latin y latin-ext, declaradas a mano en `src/fonts.css`.

**Character:** grotesca técnica algo condensada, con tracking global de -0,003em. La jerarquía sale del peso y de la tinta. La mono convierte en dato todo lo que se mide: horas, duraciones, XP, atajos y códigos.

### Hierarchy
La escala de tamaños de la v1 se mantiene en la fase 0 (20 / 16 / 14 / 13 / 12 px). La fase 1 la reajusta hacia la densidad de Línea, con la UI a 13 px. Lo que cambia ya es la familia: Instrument Sans en todo y Geist Mono en `font-mono`.

### Named Rules
**La Regla de las Cifras en Mono.** Horas, duraciones, contadores, atajos en `kbd` y códigos de prioridad usan `font-mono`. Las frases que contienen un número no la usan.

**La Regla del Suelo de 12 px.** Se mantiene de la v1.

## Layout

Sin cambios en la fase 0: ver la v1.

## Elevation & Depth

La página es plana. `--nx-shadow-card` vale `none`: las tarjetas se separan por su filete de 1 px. Solo proyectan sombra las capas flotantes (`--nx-shadow-dialog`), con un anillo de 1 px y una caída larga y suave. En oscuro, el anillo es blanco al 6 % para que el borde se lea sobre el negro.

### Named Rules
**La Regla de lo que Flota.** Hay sombra si algo está por encima de la página (diálogo, menú, aviso, paleta) y en ningún otro caso.

## Shapes

Radios de 4 / 6 / 8 / 12 px: xs para chips, sm para controles, md para tarjetas y filas, lg para diálogos. `rounded-xl` y `rounded-2xl` siguen limitados a 12 px. Las píldoras (`full`) solo se usan en indicadores pequeños.

## Motion

Los tokens están en CSS (`--ease-*` y `--dur-*` en `@theme`) y en TS (`src/design/motion.ts`), con los mismos nombres y valores.

- **Duraciones:**
  - fast 120 ms, para hover y cambios pequeños;
  - base 180 ms, para entradas;
  - slow 280 ms, para paneles;
  - celebrate 700 ms, para el destello al completar, que es la única microcelebración y siempre se puede desactivar.
- **Easings:**
  - standard `cubic-bezier(.2,.8,.2,1)`;
  - exit `cubic-bezier(.4,0,1,1)`;
  - outQuart, heredada de la v1;
  - spring: aproximación en CSS (`linear()`) del muelle «ui».
- **Muelles (`motion/react`, cargado con `LazyMotion`):**
  - ui (640/46), para resaltados que se deslizan, indicadores y reordenar;
  - pop (900/34), para avisos, chips y menús;
  - soft (380/40), para paneles grandes como la ficha lateral o el foco;
  - highlight (700/42), para el resaltado magnético de la barra lateral.

  Todos son firmes y sin rebote visible.
- **Movimiento reducido:** `motionFor(reduceMotion, t)` cambia cualquier muelle por un fundido de 120 ms. El bloque de `prefers-reduced-motion` de `index.css` corta las transiciones CSS. La celebración se queda en un destello de opacidad de 140 ms, sin barrido.
- **Presets (`PRESET` en `motion.ts`, sacados de los mockups de Línea):**

| Preset | Qué anima | Valores |
|---|---|---|
| `toast` | aviso que entra desde abajo | pop; opacidad 0→1, y 16→0, scale .96→1; sale en 200 ms con exit |
| `palette` | paleta `Ctrl K` | ui; scale .94→1, y −12→0, blur 6→0 px; sale en 160 ms |
| `paletteItems` | ítems de la paleta | cascada de 18 ms tras 40 ms |
| `menu` | menús y popovers (en CSS: `.nx-pop-in`) | pop; opacidad, scale .97→1, y −4→0 |
| `scrim` | fondo del diálogo | entra en 220 ms (standard), sale en 180 ms (exit) |
| `dialog` | panel del diálogo | ui; scale .98→1, y 6→0; sale en 160 ms |
| `sheet` | hoja inferior del dock en móvil | ui; y 100 %→0 |
| `celebrateFlash` | destello de la fila al completar | opacidad 0→1→0, 700 ms, easeOut |
| `celebrateSweep` | línea que barre el borde inferior | x −100 %→230 %, 750 ms, `cubic-bezier(.3,0,.2,1)` |


### Named Rules
**La Regla sin Bucle.** Nada se mueve solo, salvo el progreso real (el temporizador del foco o el tramo transcurrido del bloque Ahora).

## Components

Los primitivos (`src/design/primitives/`) siguen Línea desde la fase 1a:
- **Tamaños:** la UI va a 13 px (`text-ui`). Los botones miden 30 px (`h-7.5`; `sm`, 28 px), los campos 32 px (`h-8`, o `py-[5px]` en Input y Textarea) y las filas 36 px (`h-row`). Las alturas usan la escala numérica para que un `h-9` o `h-10` que pase un componente siga ganando.
- **Acento como texto:** `text-accent-text` siempre que el acento colorea texto o iconos (IconButton activo, check del Menu, Alert info, Badge, Avatar, ToggleGroup, IconPicker). Los rellenos y bordes siguen en `accent`.
- **Bordes y sombras:** campos con `border-strong`. El primario lleva `shadow-btn` (brillo superior); el secundario, `shadow-card`. El segmento elegido del SegmentedControl usa `shadow-edge` (borde inset más el brillo superior en oscuro).
- **Entradas:** Menu y Popover con `.nx-pop-in` desde su esquina; Tooltip con `.nx-fade-in` y `shadow-dialog`; Dialog con los presets `scrim` y `dialog`.
- **Kbd:** Geist Mono a 11 px sobre `paper-hover`, sin borde.
- **Switch:** apagado en `border-strong`, pomo en `--color-knob`.
- **EmptyState:** alineado a la izquierda, sin centrar.
- **Celebration:** `<Celebration play={clave} onDone?>` dentro de un padre `relative`. Solo visual, oculto a lectores de pantalla y sin capturar clics. Se lanza cuando cambia `play` (no al montar).

**Navegación (fase 1b)**
- **Barra superior:** 48 px con filete inferior. Marca de 16 px (cuadrado partido en diagonal, acento y texto) y «Nextuss» en 14 px/650. El buscador mide 30 px con `shadow-edge` y `min(384px, 32vw)` de ancho en escritorio. El chip de nivel va en `accent-text`.
- **Sidebar:** 224 px (60 plegado). Ítems de 30 px a 13 px con iconos de 15 px. El ítem activo lleva `surface-hover` y `shadow-edge`. Un único resaltado magnético (`layoutId` con el muelle `highlight`) sigue al puntero o al foco de teclado. El atajo `g x` en Geist Mono se ve solo en hover, foco o activo.
- **Barra móvil:** el destino activo va en `accent-text` y una píldora de 48×2 px se desliza entre destinos (`layoutId` con el muelle `ui`).
- **Paleta `Ctrl K`:** `top: 16vh`, `min(640px, 100vw − 32px)`, radio 12, fondo `--nx-pop-bg` con `backdrop-filter`. Campo de 50 px e ítems de 36 px. Entra con el preset `palette` (motion) y sus grupos en cascada; sale con la misma curva en CSS (Radix espera al final de la animación). Al abrirse, un barrido cónico de 900 ms recorre el borde, una sola vez y solo con movimiento completo.
- **Avisos:** abajo y centrados, colores invertidos (`--nx-toast-bg` y `--nx-toast-text`), radio 8, preset `toast`. La variante se nota por el icono y el rol; `celebrate` conserva su tamaño y añade un anillo de acento.
- **Dock:** cabecera de 48 px. Pestañas de 28 px con un indicador (`surface` y `shadow-edge`) que se desliza entre ellas, un `LayoutGroup` por instancia. En el móvil, la hoja usa los presets `scrim` y `sheet`. El campo de captura enfoca con un filete interior de acento.

**View Transitions** (`src/lib/viewTransition.ts`; sin soporte o con movimiento reducido, el cambio es directo):
- **Tema:** un círculo crece desde el botón en 560 ms (`cubic-bezier(.22,1,.36,1)`). Va por `setThemePreference`, que usan Ajustes y la paleta.
- **Página:** solo `<main>` (`view-transition-name: page`) se funde, 120 ms al salir y 180 ms al entrar. El shell no se mueve. Va con `viewTransition` en los `NavLink`, en el menú del avatar y en la paleta.
- **Dock y sidebar:** abrir o cerrar el dock y plegar el sidebar se animan con grupos propios (`dock` y `sidebar`), mientras `<main>` pasa a la raíz. Los dos pasan por `toggleRight` y `toggleLeft` de `uiStore`.

La referencia de comportamiento para la fase 2 en adelante es el mockup de Línea:
- **Cursor:** un único resaltado que se desliza entre filas.
- **Estado:** el icono «en curso» se llena hasta quedar hecho.
- **Celebración:** un destello recorre el borde de la fila al completarla.
- **Paleta:** `Ctrl K` con barrido del borde.
- **Captura rápida:** con chips detectados.
- **Foco:** abre una ficha lateral.
- **Dock:** indicador de pestaña que se desliza.
- **Atrasadas:** acciones en bloque con «Deshacer».
- **Móvil:** deslizar filas y píldora en la barra inferior.

## Do's and Don'ts

**Do:**
- Usar siempre los alias `--color-*` / `--nx-*`, nunca hex en componentes. La deuda actual está en el inventario del PR de la fase 0.
- Poner forma o texto junto a cualquier color con significado.
- Usar `font-mono` para cifras y atajos.
- Usar los tokens de motion y `motionFor`.

**Don't:**
- Usar sombras de color o halos.
- Usar más de un botón primario por pantalla.
- Usar la escala `--nx-ref-*` directamente en componentes.
- Poner animaciones en bucle.
- Usar `light-dark()` en los tokens: `chartTheme.ts` los lee con `getPropertyValue` y necesita colores ya resueltos.
