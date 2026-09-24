# Changelog

## Fase 15 — Interacción
- Arrastre con destino visible (#4): hook `useDragReorder` + `DropIndicator` compartidos por la bandeja
  de tareas, proyectos, hábitos y vistas de `/tareas`. Preview propio del arrastre, fila atenuada y línea
  de inserción antes/después según la mitad de la fila. `reorderNeighbors` corrige un bug: soltar justo
  sobre el vecino inmediato mandaba la fila al principio de la lista.
- "Mañana" / "Próxima semana" (#5) son incrementales: +1 / +7 sobre la fecha actual si es futura; sin
  fecha, hoy o pasada parten de hoy (`nextRelativeDate`, en `TaskQuickMenu` y `TaskForm`).
- Atajos `[` / `]` / `t` en la vista Día (#8), registrados vía `dayNavStore`; `g t` sigue yendo a Tareas.

## Fase 14 — Bugs y pérdida de datos
- `/tareas`: filtros, columnas y orden van a un borrador local (Guardar / Guardar como nueva /
  Restablecer); explorar ya no reescribe las vistas de fábrica.
- Borrar una vista y "Eliminar ya" de la papelera piden confirmación inline.
- `getProject` devuelve `null` para proyectos borrados o inexistentes; el detalle muestra
  "Proyecto no encontrado".
- `Menu` ya no roba el foco al montar.
- `activateHabitEntry` avisa con un toast si falla la escritura.
- La papelera etiqueta proyectos; "Backup" y "Papelera" de la paleta anclan a Ajustes.
- `c` y "Crear" móvil abren una tarea; eliminados los emojis restantes.

## Fase 13 — Premium
- 13.1 Dashboard de proyectos · 13.2 Vista de tareas y vistas guardadas · 13.3 Selección múltiple y
  edición en lote · 13.4 Registro manual de tiempo · 13.5 Plantillas de tarea y de proyecto.
