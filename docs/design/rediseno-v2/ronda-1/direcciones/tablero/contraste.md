# Contraste: Tablero

Generado con `node contraste.mjs` a partir de `tokens.json`. Umbrales WCAG 2.2 AA: texto normal 4,5:1;
texto grande y componentes de interfaz 3:1. Los pares «decorativo» acompañan siempre a texto o forma
(nunca llevan información solos) y se listan solo como referencia.

| Tema | Primer plano | Fondo | Uso | Contraste | Resultado |
|---|---|---|---|---|---|
| Claro | `text` #1b2420 | `bg` #eef2ec | texto | 14.05:1 | pasa |
| Claro | `text` #1b2420 | `surface` #ffffff | texto | 15.91:1 | pasa |
| Claro | `text` #1b2420 | `hover` #e5ece3 | texto | 13.21:1 | pasa |
| Claro | `text` #1b2420 | `accent-soft` #fcecc3 | texto | 13.61:1 | pasa |
| Claro | `muted` #4a5751 | `surface` #ffffff | texto | 7.57:1 | pasa |
| Claro | `muted` #4a5751 | `bg` #eef2ec | texto | 6.69:1 | pasa |
| Claro | `muted` #4a5751 | `hover` #e5ece3 | texto | 6.29:1 | pasa |
| Claro | `faint` #586560 | `surface` #ffffff | texto | 6.10:1 | pasa |
| Claro | `faint` #586560 | `bg` #eef2ec | texto | 5.38:1 | pasa |
| Claro | `side-text` #f1f6f0 | `rail` #1e5b47 | texto | 7.26:1 | pasa |
| Claro | `side-muted` #d3e6da | `rail` #1e5b47 | texto | 6.09:1 | pasa |
| Claro | `side-faint` #bcd8c8 | `rail` #1e5b47 | texto | 5.22:1 | pasa |
| Claro | `on-accent` #1b2420 | `accent` #f5c542 | texto | 9.81:1 | pasa |
| Claro | `link` #1e5b47 | `surface` #ffffff | texto | 7.95:1 | pasa |
| Claro | `link` #1e5b47 | `bg` #eef2ec | texto | 7.02:1 | pasa |
| Claro | `warning` #9a4a0b | `surface` #ffffff | texto | 6.25:1 | pasa |
| Claro | `danger` #c23a26 | `surface` #ffffff | texto | 5.35:1 | pasa |
| Claro | `on-tomato` #ffffff | `tomato` #c23a26 | ui | 5.35:1 | pasa |
| Claro | `on-sky` #ffffff | `sky` #1f6fae | ui | 5.33:1 | pasa |
| Claro | `text` #1b2420 | `surface` #ffffff | ui | 15.91:1 | pasa |
| Claro | `border-strong` #7f8f80 | `surface` #ffffff | ui | 3.42:1 | pasa |
| Claro | `success` #1e7a4f | `surface` #ffffff | ui | 5.31:1 | pasa |
| Claro | `focus` #1e5b47 | `surface` #ffffff | ui | 7.95:1 | pasa |
| Claro | `focus` #1e5b47 | `bg` #eef2ec | ui | 7.02:1 | pasa |
| Claro | `accent` #f5c542 | `rail` #1e5b47 | ui | 4.90:1 | pasa |
| Oscuro | `text` #eaf2ec | `bg` #0f1d18 | texto | 15.22:1 | pasa |
| Oscuro | `text` #eaf2ec | `surface` #15271f | texto | 13.72:1 | pasa |
| Oscuro | `text` #eaf2ec | `hover` #1d3329 | texto | 11.82:1 | pasa |
| Oscuro | `text` #eaf2ec | `accent-soft` #3d4325 | texto | 9.02:1 | pasa |
| Oscuro | `muted` #a9bdb2 | `surface` #15271f | texto | 7.91:1 | pasa |
| Oscuro | `muted` #a9bdb2 | `bg` #0f1d18 | texto | 8.77:1 | pasa |
| Oscuro | `muted` #a9bdb2 | `hover` #1d3329 | texto | 6.81:1 | pasa |
| Oscuro | `faint` #93a79c | `surface` #15271f | texto | 6.15:1 | pasa |
| Oscuro | `faint` #93a79c | `bg` #0f1d18 | texto | 6.82:1 | pasa |
| Oscuro | `side-text` #eaf2ec | `rail` #13372b | texto | 11.44:1 | pasa |
| Oscuro | `side-muted` #a9bdb2 | `rail` #13372b | texto | 6.59:1 | pasa |
| Oscuro | `side-faint` #93a79c | `rail` #13372b | texto | 5.13:1 | pasa |
| Oscuro | `on-accent` #1b2420 | `accent` #f5c542 | texto | 9.81:1 | pasa |
| Oscuro | `link` #f5c542 | `surface` #15271f | texto | 9.65:1 | pasa |
| Oscuro | `link` #f5c542 | `bg` #0f1d18 | texto | 10.71:1 | pasa |
| Oscuro | `warning` #f0a25e | `surface` #15271f | texto | 7.48:1 | pasa |
| Oscuro | `danger` #f27a62 | `surface` #15271f | texto | 5.76:1 | pasa |
| Oscuro | `on-tomato` #0f1d18 | `tomato` #f27a62 | ui | 6.40:1 | pasa |
| Oscuro | `on-sky` #0f1d18 | `sky` #6db3ea | ui | 7.68:1 | pasa |
| Oscuro | `text` #eaf2ec | `surface` #15271f | ui | 13.72:1 | pasa |
| Oscuro | `border-strong` #6f8c80 | `surface` #15271f | ui | 4.28:1 | pasa |
| Oscuro | `success` #5fd39a | `surface` #15271f | ui | 8.40:1 | pasa |
| Oscuro | `focus` #f5c542 | `surface` #15271f | ui | 9.65:1 | pasa |
| Oscuro | `focus` #f5c542 | `bg` #0f1d18 | ui | 10.71:1 | pasa |
| Oscuro | `accent` #f5c542 | `rail` #13372b | ui | 8.05:1 | pasa |
