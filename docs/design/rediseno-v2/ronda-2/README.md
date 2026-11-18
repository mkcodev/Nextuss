# Rediseño visual v2 · Fase A, ronda 2

**Elegida: Línea** (2026-11-18). Cinco direcciones previstas para Nextuss sobre la pantalla Hoy, con el shell completo (barra lateral,
navbar, dock y barra móvil). Son mockups, no código de producción. Issue #174.

Referencias de sensación: Superlist y Amie (sin copiar componentes ni logos). La ronda 1 está
descartada y archivada en `../ronda-1/`. De ella solo se conserva la riqueza funcional de Hoy.

## Estado

| Dirección | Nivel | Estado |
|---|---|---|
| [Línea](direcciones/linea/) | profesional, estilo Linear | **elegida**, con pasadas 1 y 2 |
| [Plano](direcciones/plano/) | profesional, estilo Vercel | descartada (se queda en pasada 1) |
| Lino | contenida | no construida: el usuario eligió Línea antes |
| Marea | intermedia | no construida |
| Pulso | atrevida | no construida |

Las referencias de Superlist y Amie ya se usaron en esta ronda, así que la fase A2 prevista queda
cubierta y cerrada.

### Línea

Precisión tranquila: todo a mano desde el teclado y nada que sobre.

- **Tema y color:** oscura primero, con grises fríos, bordes de 1 px y un único acento turquesa glaciar.
- **Tipografía:** Instrument Sans + Geist Mono.
- **Firma:**
  - resaltado magnético en la barra lateral;
  - el icono «en curso» se llena hasta quedar hecho;
  - un destello recorre el borde de la fila al completarla;
  - el foco abre una ficha lateral.

### Plano

Blanco, negro y una rejilla: lo importante se ve porque no hay nada más.

- **Color:** monocromo puro y rejilla visible con cruces en las esquinas.
- **Tipografía:** Geist + Geist Mono.
- **Firma:**
  - la rejilla se traza al cargar;
  - las cifras ruedan como un contador mecánico;
  - un barrido invierte la fila al completarla;
  - el foco pasa la pantalla a negro con el temporizador gigante.

## Reglas de la ronda 2

- **Contraste:** AA no es requisito, pero el texto principal tiene que leerse bien a simple vista.
- **Animación:** es clave y muy visual. Toda animación responde a una acción o a un cambio real, y no hay bucles ambientales. Lo único que se mueve solo es el temporizador del foco, que es tiempo real.
- **Reduced motion:** con `prefers-reduced-motion` o con «Sin animación», solo quedan los fundidos.
- **Forma, no solo color:** prioridad, estado y atraso nunca dependen solo del color. Se distinguen por forma o por texto.
- **Fuentes:** `@fontsource-variable/*` 5.3.0, con licencia OFL-1.1.

## Interacciones (pasada 1, en todas)

| Qué | Cómo |
|---|---|
| Completar | `x` sobre la fila marcada o clic en el estado. La fila baja a «Hechas», sale un chip de +10 XP y suben los contadores. |
| Paleta | `Ctrl K` o el buscador. Filtra en vivo, se recorre con las flechas y `Enter` ejecuta (prueba con «tema» o «foco»). |
| Captura rápida | `i` o «Nueva». Entiende «mañana 10:00 p2 #trabajo 30 min» y muestra los chips detectados. `Enter` la crea. |
| Modo foco | `f` o «Empezar foco». El temporizador corre en tiempo real y `Esc` sale. |
| Tema | `t` o el botón de la luna o el sol. |

## Interacciones (pasada 2, solo Línea: `pasada2.js`)

| Qué | Cómo |
|---|---|
| Cursor | `j`/`k` o las flechas. Un único resaltado se desliza entre filas. |
| Reordenar | Arrastrar una fila del plan, o `Alt` + `↑`/`↓` sobre la fila marcada. |
| Panel derecho | Pestañas Progreso, Captura y Enfoque. El indicador se desliza y el contenido entra desde el lado del cambio. |
| Atrasadas | «Mover todas a mañana» o «Aparcar todas». Las filas salen en cascada y un aviso ofrece «Deshacer». |
| Check-in y hábitos | El indicador de la escala se desliza. Marcar un hábito rellena también el día de la semana y suma XP. |
| Móvil | Deslizar una fila a la derecha la completa y a la izquierda la pasa a mañana (con «Deshacer»). La píldora de la barra inferior se desliza. |
| Demo guiada | Botón «Demo guiada» en la barra del mockup, o `?demo=1`. Recorre todo lo anterior con rótulos. |

## Archivos

- **`datos.js`:** los mismos datos sintéticos para todas.
- **`nucleo.js` / `nucleo.css`:** shell, Hoy y capas (paleta, captura, foco y avisos). No definen identidad.
- **`interacciones.js`:** motor común, sobre `motion@14.14.0`, el mismo motor que el `framer-motion` de la app.
- **`direcciones/<nombre>/`:** `index.html`, `direccion.css` (tokens y estilo) y `direccion.js` (ficha con la paleta en hex, presets de movimiento y piezas firma).
- **`comparar.html`:** las direcciones lado a lado, con selector de tema y de ancho.
- **`pasada2.js`:** la segunda pasada de interacciones. Solo la carga Línea.
- **`capturas/`:** `<nombre>-<claro|oscuro>-<1440|375>.png` a página completa, más `<nombre>-demo.gif` y `.mp4` (pasada 1). Línea tiene además `linea-guiada.gif` y `.mp4` (demo guiada con la pasada 2).

Parámetros de URL de cada página:
- `?theme=dark|light`
- `?static=1`: sin animación, para las capturas.
- `?bare=1`: sin la barra del mockup.
- `?motion=full|soft|off`
- `?open=paleta|nueva|foco`
- `?demo=1`: arranca la demo guiada (solo Línea).

## Scripts (Node, sin dependencias; Chrome y ffmpeg instalados)

```sh
npx serve -l 5174 docs/design/rediseno-v2/ronda-2   # servidor local (las rutas necesitan la barra final)
node capturar.mjs [direccion...]                     # capturas fijas
node grabar.mjs <direccion> [light|dark] [guiada]    # demo en GIF y MP4 (guiada: la de ?demo=1)
node revisar.mjs <direccion> [light|dark] [ancho]    # capturas de cada estado para revisar
```
