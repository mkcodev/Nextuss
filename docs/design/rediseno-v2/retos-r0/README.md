# Rediseño v2 · Retos R0: mockups de la sección de retos

Tres vistas de la sección de retos en estilo Línea (más una cuarta descartada), que comparten una misma base. Es el paso R0 del issue #191.
Son mockups: no tocan `src/`, Dexie ni plugins. Solo datos demo.

Cubren solo los dos tipos de la primera versión:

- **Misiones diarias automáticas:** de 1 a 3 al día.
- **Retos propios:** con duración, racha y escudos.

## Decisiones tomadas

Primera ronda: se enseñaron tres variantes (A Registro, B Cadena, C Horizonte) y se pidió una mezcla (D). Tras revisarlas:

- **D · Mezcla** (A + calendario de B + resumen en Hoy de C) es la vista **por defecto**.
- **B Cadena y C Horizonte** son vistas **alternativas** de la misma lista.
- **A Registro se descarta como vista separada** (ver «Variante descartada: A · Registro»). Sus atajos de teclado pasan a D.
- `/retos` tendrá un **selector de vista en la propia página** (como lista, tablero y cronograma en Linear), no en Ajustes, con **3 opciones**: Mezcla, Cadena y Horizonte.
- La vista elegida se recuerda. **Decisión: en `uiStore` con `persist`, por dispositivo** (ver «Impacto en R1»).
- Las tres vistas comparten datos, detalle, crear, vacío, celebración y resumen en Hoy (los de D). **Solo cambia cómo se pinta la lista de retos propios.**

## Qué comparten y qué cambia

| Pieza | Común a las 4 vistas | Cambia por vista |
|---|---|---|
| Misiones de hoy | Sí (filas con fuente, progreso y XP) | No |
| Lista de retos propios | No | Sí: es lo único que se pinta distinto |
| Detalle de un reto | Sí: ficha lateral (hoja inferior en móvil) con racha, cumplimiento, propiedades, calendario por semanas y registro | No |
| Crear reto | Sí: un solo diálogo | No |
| Vacío | Sí: cadena fantasma y 3 plantillas | No |
| Completar y celebración | Sí: la `Celebration` de la app | No |
| Resumen en Hoy | Sí: celda ancha «Retos» dentro de «Tu día en números» | No |
| Teclado | Sí: `j`/`k`, `x`, `Enter`, `c` o `n`, `Esc` | No |

Las tres listas:

| Vista | Cómo pinta la lista | Para quién |
|---|---|---|
| **D · Mezcla** (por defecto) | Tabla densa estilo incidencias: reto, racha, últimos 7 días como cadena, escudos, «Día N de M» y estado de hoy. Lleva los atajos de teclado de A | Ver racha y escudos sin abrir el detalle, y moverse sin ratón |
| **B · Cadena** | Tarjetas con la cadena completa de la duración del reto | Quien quiere ver la racha como protagonista |
| **C · Horizonte** | Barras sobre un eje de fechas con el marcador de «hoy» | Quien piensa en plazos: dónde empezó, dónde está, cuánto falta |

## Variante descartada: A · Registro

A era la tabla de filas densas «desde el teclado», con un medidor fino de progreso (día N de M) en lugar de cadena. Se descarta como vista separada por dos razones:

- **Era D sin la cadena de 7 días.** Mismas filas, mismas columnas salvo una. Ofrecerla en el selector no daba una forma distinta de ver los retos, solo una columna distinta.
- **Su aportación real eran los atajos**, y esos no dependen de la vista: `j`/`k` para moverse, `x` para marcar hoy, `Enter` para abrir, `c` o `n` para un reto nuevo. Pasan a D (y, como la base es común, funcionan también en B y C).

Se conserva como referencia, sin borrarla:

- `descartadas/variante-a.js` (28 líneas) con instrucciones de cómo recuperarla (moverla a la raíz, cargarla en `index.html` y añadirla a `VISTAS` en `base.js`).
- `descartadas/a-lista-claro-1440.png` y `descartadas/a-lista-oscuro-1440.png`.
- Las reglas `.rr-a` de `retos.css`.

Si en R2 se quiere una vista más compacta, recuperarla cuesta casi nada.

## Qué no encajaba con la base común y cómo se resolvió

Se pidió avisar de lo que no encajara: no hay tres detalles ni tres formularios.

| Pieza original | Problema | Resolución |
|---|---|---|
| C: crear arrastrando una barra en el eje | Es un formulario distinto, y arrastrar no puede ser la única vía (WCAG 2.5.7) | **Descartado.** El diálogo común ya cumple 2.5.7: campo de días, fecha de fin y atajos 7/21/30/66. Arrastrar en el eje podría volver como mejora de C en R2b, siempre con esos campos como alternativa. |
| B: asistente de 3 pasos | Es un segundo formulario | **Absorbido.** La vista previa de cadena del asistente pasó al diálogo común, y los chips de lo detectado sustituyen a los pasos. |
| B: misiones como 3 tickets con progreso | Es otra presentación de lo común | **Sustituido** por las filas de misiones comunes (con barra de progreso y fuente). |
| C: columna «Hoy» con checklist | Idem | **Sustituida** por las filas de misiones comunes. |
| B: detalle en página completa | Segundo detalle | **Sustituido** por la ficha común, que ya lleva el calendario por semanas de B. |
| C: maestro-detalle a dos columnas | Tercer detalle | **Sustituido** por la ficha común. |
| B: «Hoy» con mini cuadrícula por reto; A: lista de misiones; C: barras compactas | Tres resúmenes en Hoy | **Unificado** en el de D (celda ancha «Retos»), que casa con `TodayNumbers`. |

Lo único propio de cada vista es la lista.

## El selector de vista

- Es un grupo de opciones (`radiogroup`) de tres botones con icono y nombre, a la derecha de la cabecera «Retos propios».
- Se maneja con ratón, con las flechas (el foco se queda en la opción) y con Tab. En móvil ocupa todo el ancho y quita los iconos.
- Cambiar de vista **no reinicia nada**: los mismos datos se repintan. Si marcas un día en D, ese día sigue marcado en B y C. Se ve en `capturas/selector.gif`.
- En el estado vacío no hay selector: no hay lista que cambiar.
- En el mockup, la vista se guarda en `localStorage` (`nx-retos-vista`) solo al hacer clic en el selector; `?v=` en la URL manda sobre lo guardado, y una vista guardada que ya no existe (por ejemplo, `a`) cae en D. La barra del mockup solo muestra qué vista está activa.

## Reglas que fija R0

Las implementa R1. Si una vista las incumpliera, no sirve.

- **Las misiones solo salen de datos que la app ya registra:** tareas, sesiones de foco, check-in y hábitos. Nada que necesite un seguimiento nuevo. Por eso cada misión del mockup lleva su fuente («Tareas», «Foco», «Check-in»).
- **Una misión se cumple sola** cuando se da el dato. No se marca a mano, y si se cumple en otra pantalla (por ejemplo, al completar una tarea en Hoy) aparece como «Cumplida» sin celebración.
- **Retos propios:** el usuario marca cada día. Un día sin marcar gasta un escudo si queda alguno y la racha sigue. Sin escudos es un fallo y la racha vuelve a 0.
- **«Hoy no»:** gasta un escudo a propósito, sin esperar al día siguiente. Solo está disponible si queda alguno. Se ve en la ficha del reto y en el registro.
- **Cifras:** Instrument Sans con `tabular-nums`, igual que «Tu día en números». Geist Mono solo donde `DESIGN.md` ya lo usa (atajos y horas), nunca en rachas, días ni KPI.
- **Forma, no solo color:** hecho, escudo, «Hoy no», fallo, hoy y por llegar se distinguen por forma o por texto (leyenda bajo el calendario y en C).
- **XP** solo con el plugin `gamification` activo. La barra del mockup tiene el interruptor «Sin gamificación».
- **Celebración:** la `Celebration` de la app (700 ms; con movimiento reducido, solo un destello de opacidad de 140 ms). Se lanza solo en la transición de no hecho a hecho causada por el usuario.
- **Sin arrastre obligatorio:** ninguna duración se fija solo arrastrando (WCAG 2.5.7).

## Los seis estados

| Estado | Qué enseña |
|---|---|
| Lista | Misiones de hoy, retos propios activos (con el selector) y cumplidos |
| Detalle | Ficha común: racha, mejor racha, cumplimiento, escudos, calendario y registro |
| Crear | Un diálogo: texto que se interpreta («Leer 20 min 30 días 2 escudos»), chips, duración, días, fecha de fin, escudos y vista previa con XP |
| Vacío | Cadena fantasma y 3 plantillas. Conmutador del mockup para el primer día sin datos (sin misiones aún) |
| Completar | Marcar un día, misión cumplida en otra pantalla (sin celebración) y reto entero cumplido (celebración y aviso con Deshacer) |
| Hoy | Celda ancha «Retos» en «Tu día en números», en 1440 y en 375 |

Las capturas de «Vacío» y «Hoy» existen solo con D porque son comunes. Con `node capturar.mjs --todo` se generan también con B y C.

## Ideas propias

- **«Hoy no» explícito** (ver reglas): se enseña en la ficha de «Leer 20 minutos» (día 22) y en la leyenda.
- **Plantillas** de retos frecuentes en el estado vacío: se enseñan en el vacío y rellenan el diálogo de crear.
- **Primer día sin datos:** una nota en lugar de misiones («tus primeras misiones llegan mañana»), para no enseñar una lista vacía sin explicación.
- **Escudos por reto,** fijados al crear y separados de los escudos mensuales de hábitos. Pregunta abierta para R1 (abajo).

## Impacto en R1 (datos y plugin)

La única novedad es **una preferencia de vista**: `'d' | 'b' | 'c'`, por defecto `'d'`.

**Decisión: se guarda en `uiStore` con `persist`, por dispositivo.** Es el sitio donde ya viven las preferencias de interfaz por dispositivo (`leftCollapsed`, `dock`). La vista de una lista es del mismo tipo: depende de la pantalla y del gusto en ese dispositivo (una vista densa en escritorio, otra en móvil). No toca Dexie, ni `Settings`, ni la exportación.

Consecuencias para R1:

- Un campo nuevo en `uiStore` (por ejemplo `retosVista`) con valor por defecto `'d'`.
- Al leerlo, un valor que ya no exista cae en `'d'` (como hace el mockup con `a`).
- Sin cambio de versión de Dexie, sin cambios en `SETTINGS_DEFAULTS` ni en `settingsTransfer`.
- No se sincroniza entre dispositivos ni entra en exportar/importar. Es lo buscado.

El resto de R1 no cambia: los datos son los mismos para las tres vistas, y todas leen lo mismo (reto, días y estado de hoy).

## Impacto en R2 (página `/retos`): propuesta de partirlo

- **R2a · Página con D.** Ruta, entrada en la barra lateral y en la paleta, misiones de hoy, lista D, ficha de detalle, diálogo de crear, vacío, celebración y atajos (`j`/`k`, `x`, `Enter`, `c`/`n`, `Esc`). Incluye ya el contenedor del selector con una sola vista, para que R2b solo añada vistas.
- **R2b · Vistas B y C.** Las dos listas, el selector con las tres opciones, la persistencia de la preferencia en `uiStore` y sus pruebas.

Cada parte se puede revisar y fusionar por separado. Si el tiempo aprieta, R2b se puede aplazar sin romper nada.

### Estimación de crecimiento (orientativa)

Se calcula a partir de las líneas del mockup (la parte propia de cada vista es pequeña porque la base es común) y de un factor de 1,3 a 1,8 al pasar a React y TypeScript con tipos, hooks y pruebas.

| Pieza | Mockup (líneas) | Estimación en `src/` (sin pruebas) |
|---|---|---|
| Base común (misiones, ficha, crear, vacío, selector, atajos) | 369 de JS | de 600 a 800 líneas |
| Lista D | 29 | de 50 a 80 |
| Listas B y C juntas | 106 (B 40, C 66) | de 200 a 300 (C pesa más por el eje de fechas) |
| Estilos | ya incluidos en la hoja de unas 1.200 líneas | de 300 a 450 de CSS o clases de Tailwind |

- **R2a (D + base):** de 950 a 1.300 líneas, más de 350 a 500 de pruebas.
- **R2b (B y C + selector + preferencia):** de 250 a 380 líneas, más de 120 a 200 de pruebas.
- **Las dos vistas extra suponen en torno a un 25 % más que R2a solo** (con A descartada, el cálculo baja del 25–35 % anterior). El motivo de que sea tan poco es que no duplican detalle ni formulario.

## Preguntas para R1

- ¿Los escudos son por reto (fijados al crear) o globales?
- ¿Qué dato exacto genera cada misión? Solo tareas, foco, check-in y hábitos ya registrados.
- ¿A qué hora se renuevan las misiones? El mockup usa las 00:00 (lo enseña como «se renuevan a las 00:00»).
- ¿Se puede abandonar o pausar un reto propio?
- ¿Qué pasa al fallar sin escudos? El mockup lo trata como fallo y racha a 0.

## Cómo ejecutarlo

Requiere el servidor local (con la barra final en la URL):

```
npx serve -l 5174 docs/design/rediseno-v2
```

Abrir `http://localhost:5174/retos-r0/`. La barra del mockup (arriba) elige estado, tema, movimiento y gamificación; el selector de vista está en la propia página.

Parámetros de URL: `?v=d|b|c&vista=lista|detalle|crear|vacio|completar|hoy&theme=light|dark&static=1&bare=1&motion=off&gam=0&id=<reto>&primer=1`.

Scripts (necesitan Chrome y, para los GIF, ffmpeg):

- `node capturar.mjs [d|b|c] [--vista=lista,hoy] [--todo]`: PNG en `capturas/`, sin errores de consola, sin scroll horizontal y con todos los iconos resueltos.
- `node grabar.mjs [d|b|c] [--solo=completar|selector]`: GIF de «completar» de cada vista (normal y con movimiento reducido) y el del selector.

## Peso de `capturas/`

Resultado de la última generación: 56 PNG (5,2 MB) y 7 GIF (1,3 MB), unos 6,5 MB. Con `descartadas/` y el código, la carpeta `retos-r0/` entera pesa 6,8 MB. Está muy por debajo del límite de unos 15 MB, así que se suben todas.

Los GIF se optimizaron con gifsicle (`-O3 --lossy=40`). **Los PNG van sin optimizar:** oxipng no se ha usado porque una directiva de Control de aplicaciones de Windows bloquea `oxipng.exe`, y no se toca esa directiva. Salen tal como los genera Chrome.

## Archivos

- `index.html`, `shell.js`, `shell.css`, `tokens-app.css`: shell de la app de la integración (navbar, barra lateral, panel derecho y barra móvil) y los tokens reales de `src/index.css`.
- `datos-retos.js`: datos demo.
- `base.js`: lo común a las tres vistas.
- `variante-d.js`, `variante-b.js`, `variante-c.js`: solo la lista de cada una.
- `descartadas/`: la variante A Registro (código y dos capturas).
- `celebracion.js`: port de la `Celebration` de la app con `motion@14.14.0`.
- `retos.css`: estilos de la sección.
- `capturar.mjs`, `grabar.mjs`, `capturas/`.
