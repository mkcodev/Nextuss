# Contraste: Subrayado

Generado con `node contraste.mjs` a partir de `tokens.json`. Umbrales WCAG 2.2 AA: texto normal 4,5:1;
texto grande y componentes de interfaz 3:1. Los pares «decorativo» acompañan siempre a texto o forma
(nunca llevan información solos) y se listan solo como referencia.

| Tema | Primer plano | Fondo | Uso | Contraste | Resultado |
|---|---|---|---|---|---|
| Claro | `text` #23262b | `bg` #fafaf7 | texto | 14.51:1 | pasa |
| Claro | `text` #23262b | `surface` #ffffff | texto | 15.18:1 | pasa |
| Claro | `text` #23262b | `hover` #efefe7 | texto | 13.13:1 | pasa |
| Claro | `text` #23262b | `cursor-row` #fff7ce | texto | 14.05:1 | pasa |
| Claro | `muted` #555a61 | `surface` #ffffff | texto | 6.95:1 | pasa |
| Claro | `muted` #555a61 | `bg` #fafaf7 | texto | 6.65:1 | pasa |
| Claro | `muted` #555a61 | `hover` #efefe7 | texto | 6.01:1 | pasa |
| Claro | `faint` #62676e | `surface` #ffffff | texto | 5.70:1 | pasa |
| Claro | `faint` #62676e | `bg` #fafaf7 | texto | 5.45:1 | pasa |
| Claro | `on-accent` #ffffff | `accent` #23262b | texto | 15.18:1 | pasa |
| Claro | `on-hl` #23262b | `hl-yellow` #ffe45c | texto | 11.93:1 | pasa |
| Claro | `on-hl` #23262b | `hl-green` #a6e8b0 | texto | 10.69:1 | pasa |
| Claro | `on-hl` #23262b | `hl-pink` #ffb3d1 | texto | 9.12:1 | pasa |
| Claro | `on-hl` #23262b | `level-bg` #ccf0d0 | texto | 12.25:1 | pasa |
| Claro | `warning` #9a4a0b | `surface` #ffffff | texto | 6.25:1 | pasa |
| Claro | `warning` #9a4a0b | `bg` #fafaf7 | texto | 5.98:1 | pasa |
| Claro | `danger` #b42a3c | `surface` #ffffff | texto | 6.29:1 | pasa |
| Claro | `success` #2f7d45 | `surface` #ffffff | ui | 5.07:1 | pasa |
| Claro | `border-strong` #8c8c80 | `surface` #ffffff | ui | 3.40:1 | pasa |
| Claro | `text` #23262b | `surface` #ffffff | ui | 15.18:1 | pasa |
| Claro | `focus` #23262b | `surface` #ffffff | ui | 15.18:1 | pasa |
| Claro | `focus` #23262b | `bg` #fafaf7 | ui | 14.51:1 | pasa |
| Claro | `hl-green` #a6e8b0 | `surface` #ffffff | decorativo | 1.42:1 | informativo |
| Claro | `hl-yellow` #ffe45c | `surface` #ffffff | decorativo | 1.27:1 | informativo |
| Oscuro | `text` #eceae4 | `bg` #17181b | texto | 14.76:1 | pasa |
| Oscuro | `text` #eceae4 | `surface` #1d1f23 | texto | 13.72:1 | pasa |
| Oscuro | `text` #eceae4 | `hover` #272a2f | texto | 11.97:1 | pasa |
| Oscuro | `text` #eceae4 | `cursor-row` #595430 | texto | 6.39:1 | pasa |
| Oscuro | `muted` #aaa9a2 | `surface` #1d1f23 | texto | 7.00:1 | pasa |
| Oscuro | `muted` #aaa9a2 | `bg` #17181b | texto | 7.53:1 | pasa |
| Oscuro | `muted` #aaa9a2 | `hover` #272a2f | texto | 6.11:1 | pasa |
| Oscuro | `faint` #93928b | `surface` #1d1f23 | texto | 5.28:1 | pasa |
| Oscuro | `faint` #93928b | `bg` #17181b | texto | 5.69:1 | pasa |
| Oscuro | `on-accent` #17181b | `accent` #eceae4 | texto | 14.76:1 | pasa |
| Oscuro | `on-hl` #17181b | `hl-yellow` #e6cf4e | texto | 11.33:1 | pasa |
| Oscuro | `on-hl` #17181b | `hl-green` #7fd192 | texto | 9.67:1 | pasa |
| Oscuro | `on-hl` #17181b | `hl-pink` #f29bbf | texto | 8.64:1 | pasa |
| Oscuro | `on-hl` #17181b | `level-bg` #7fd192 | texto | 9.67:1 | pasa |
| Oscuro | `warning` #f0a866 | `surface` #1d1f23 | texto | 8.25:1 | pasa |
| Oscuro | `warning` #f0a866 | `bg` #17181b | texto | 8.87:1 | pasa |
| Oscuro | `danger` #f2787f | `surface` #1d1f23 | texto | 6.10:1 | pasa |
| Oscuro | `success` #7fd192 | `surface` #1d1f23 | ui | 8.99:1 | pasa |
| Oscuro | `border-strong` #6e727a | `surface` #1d1f23 | ui | 3.42:1 | pasa |
| Oscuro | `text` #eceae4 | `surface` #1d1f23 | ui | 13.72:1 | pasa |
| Oscuro | `focus` #eceae4 | `surface` #1d1f23 | ui | 13.72:1 | pasa |
| Oscuro | `focus` #eceae4 | `bg` #17181b | ui | 14.76:1 | pasa |
| Oscuro | `hl-green` #7fd192 | `surface` #1d1f23 | decorativo | 8.99:1 | informativo |
| Oscuro | `hl-yellow` #e6cf4e | `surface` #1d1f23 | decorativo | 10.53:1 | informativo |
