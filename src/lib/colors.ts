// Paleta para proyectos, hábitos, tareas, atributos y etiquetas (DESIGN.md). Tonos sobrios que se
// distinguen entre sí en claro y en oscuro; el primero es el acento índigo y es el color por defecto.
// Los colores que el usuario ya tiene guardados (p. ej. el cian antiguo) se respetan: esto solo
// cambia lo que se ofrece al crear.
export const ENTITY_COLORS = ['#5058C8', '#2E9E6B', '#C9822B', '#D0506A', '#8B5CF6', '#1F9BB0'] as const

export const DEFAULT_ENTITY_COLOR: string = ENTITY_COLORS[0]
