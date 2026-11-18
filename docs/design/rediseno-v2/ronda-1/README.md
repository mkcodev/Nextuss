# Rediseño visual v2 · Fase A, ronda 1 (descartada)

> **Descartada el 2026-11-18.** El usuario la ve infantil y poco profesional. Se salva la riqueza funcional (Hoy más completo y más visual), que pasa a la ronda 2 (`../ronda-2/`). Se guarda como historial.

Tres identidades candidatas para Nextuss, sobre la pantalla Hoy con el shell completo (barra lateral,
navbar, dock y barra móvil). Son mockups estáticos, no código de producción. Issue #174.

Salen solo de `PRODUCT.md` (necesidades y tono) y de las reglas del rediseño: sin referencias externas.
Están escalonadas por audacia. La estructura es la de la app real; cada mundo aporta tipografía,
paleta, densidad y un gesto propio.

| Dirección | Nivel | Mundo | Gesto propio |
|---|---|---|---|
| [Andén](direcciones/anden/index.html) | contenida | señalética de estación | línea del día con estaciones y panel de salidas Ahora / Siguiente |
| [Subrayado](direcciones/subrayado/index.html) | intermedia | apuntes con fluorescente | título de «Ahora» marcado; trazo verde al completar |
| [Tablero](direcciones/tablero/index.html) | atrevida | juego de mesa | recorrido de XP en casillas junto a «Ahora»; prioridad con puntos de dado |

## Archivos

- `datos.js`: los mismos datos de ejemplo para las tres (sintéticos).
- `base.js` / `base.css`: shell, Hoy y hoja de especímenes comunes; no definen identidad.
- `direcciones/<nombre>/`: `index.html`, `direccion.css` (tokens y estilo), `direccion.js` (piezas firma),
  `tokens.json` (paleta clara y oscura, tipografía, radios, sombras, motion, pares de contraste) y
  `contraste.md` (generado).
- `comparar.html`: las tres lado a lado, con selector de tema y de ancho.
- `capturas/`: `<nombre>-<claro|oscuro>-<1440|375>.png`, página completa.

Cada página acepta `?theme=dark` y `?static=1` (sin transiciones, para capturas).

## Scripts (Node, sin dependencias)

```sh
node contraste.mjs   # regenera direcciones/*/contraste.md; sale con 1 si algún par no llega a AA
node capturar.mjs    # 12 capturas con Chrome headless (CHROME=<ruta> si no lo encuentra)
```

## Reglas comunes

- Prioridad, atraso y hecho nunca dependen solo del color: barras y código P1-P4 (Andén), texto
  (Subrayado) o puntos de dado (Tablero); atraso con icono y texto; hecho con marca y tachado.
- Transiciones de 150 a 250 ms. Una microcelebración de menos de 600 ms, sin sonido; con
  `prefers-reduced-motion`, solo opacidad.
- Iconos Lucide, sin emoji, sin etiquetas en mayúsculas, ningún texto por debajo de 12 px.

## Peso de las fuentes (solo latin y latin-ext)

Paquetes `@fontsource-variable` 5.3.x, licencia OFL-1.1. «Precache» es lo que guardaría la PWA si se
incluyen los dos subconjuntos. «Primera carga» es lo que baja el navegador para texto en español, que
solo usa el subconjunto latin gracias a `unicode-range`.

| Dirección | Archivos | Precache | Primera carga |
|---|---|---|---|
| Andén | Archivo `wdth` (88,0 + 84,2 KB) + Atkinson Hyperlegible Next `wght` (33,2 + 18,6 KB) | 224 KB | 121 KB |
| Subrayado | Recursive `casl` (106,2 + 96,5 KB) | 203 KB | 106 KB |
| Tablero | Bricolage Grotesque `opsz` (75,1 + 30,0 KB) + Onest `wght` (33,0 + 27,8 KB) | 166 KB | 108 KB |

Referencia: Inter, la de hoy, pesa 130 KB de precache (47,1 + 83,1 KB) y 47 KB de primera carga.
Las tres direcciones cuestan entre 60 y 75 KB más en primera carga. En la fase 0 hay que importar solo esos subconjuntos, porque el CSS por defecto
de cada paquete trae también cirílico y vietnamita, y `globPatterns` los precachearía todos.
