---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/features"]
---

## Scope

App completa de Nextuss (shell, Hoy, Tareas, Hábitos, formularios). Modo: Operate. Rediseño: la estética anterior (SaaS oscuro con brillo cian) queda como anti-referencia.

## Direction contract

THESIS: Herramienta precisa: una herramienta profesional sobria (listas agrupadas, bordes sutiles, un solo acento índigo) donde la tarea actual se lee como una ficha medida (línea de medida de duración y casillas de propiedades) en vez de como una fila más. Rechaza el tablero de tarjetas con brillos y la pared de campos planos.

OWN-WORLD: Blanco / gris 1% en claro, casi negro en oscuro; bordes de 1px suaves; radios 6-8px; Inter; un acento índigo (#5058c8) solo para acción, selección y progreso; naranja solo para atrasos (texto, nunca fondo); prioridad como barras; estados por forma (círculo vacío, medio, lleno con marca).

STORY: Abro Hoy y entiendo en un segundo qué toca ahora, cuánto dura y cuánto llevo; capturo con teclado; lo atrasado se resume (3 visibles + acción en bloque) sin culpa.

FIRST VIEWPORT: Barra lateral 224px (buscar, secciones con atajos, proyectos). Cabecera 48px con fecha y "Nueva tarea" índigo a la derecha. Bloque Ahora arriba: título 20px, línea de medida con inicio/fin y duración, 4 casillas (Proyecto, Prioridad, Energía, Objetivo), acciones Empezar foco / Hecha / Aplazar. Debajo, grupos Más tarde, Hábitos, Atrasadas. Columna derecha 300px: objetivo de la semana y progreso.

FORM: Canon del catálogo (estándar tipo Linear) elevado con el bloque Ahora de la dirección asignada "Plano técnico" (candidata 7). Semilla 5f1c2684. Referencia: docs/design/direcciones/f-herramienta-plano.html.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Decisiones abiertas

- Modo oscuro: igual de cuidado que el claro (la app ya tiene ambos temas).
- Formulario de tarea: fichas en una fila + "Más" desplegable (ver vista "Tarea completa"); detalle final en el paso de TaskForm (#6).
