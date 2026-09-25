# Plan del rediseño UX/UI

Checklist para no olvidar nada. Cubre la Fase 22 (#21, #6: TaskForm) y la Fase 23 (#22: sistema de diseño).
Marca `[x]` al terminar cada paso. **TÚ** = lo haces tú, **CLAUDE** = se lo pides a Claude.

## Herramientas instaladas

| Herramienta | Cómo se usa | Para qué |
|---|---|---|
| `frontend-design` (plugin oficial) | Automática al trabajar en UI | Evitar diseño genérico, decisiones estéticas deliberadas |
| `impeccable` | `/impeccable <comando> <objetivo>` | Crítica, auditoría, pulido y animación de UI existente |
| `web-design-guidelines` (Vercel) | `/web-design-guidelines src/features/tasks/TaskForm.tsx` | Auditoría de reglas UX/accesibilidad (salida `archivo:línea`) |
| `ui-ux-pro-max` | Automática, o pedir "busca paletas/tipografías" | Catálogo de paletas, tipografías y estilos |
| Claude in Chrome | Pedir "verifícalo en el navegador" | Ver el resultado real con capturas |

Comandos de Impeccable más útiles: `critique` (jerarquía/claridad), `audit` (a11y/responsive), `shape` (planificar antes de codificar),
`polish` (pulido final), `animate` (movimiento), `harden` (errores/casos límite), `distill` (quitar lo que sobra), `bolder`/`quieter`.

## Pasos

### 0. Preparación
- [x] CLAUDE: instalar skills, versionarlas y crear esta guía (#30).

### 1. Contexto de diseño
- [x] TÚ: reiniciar Claude Code (`/exit` y abrir de nuevo) para que carguen las skills.
- [x] TÚ + CLAUDE: `/impeccable init` → `PRODUCT.md` (#32). Te preguntará por el público, la personalidad de la marca, etc. Responde con lo que sientas;
      Claude te ayuda a redactarlo. Idea base: app personal de productividad para TDAH → calma, claridad, poca carga visual, rapidez.

### 2. Referencias visuales
- [x] CLAUDE: 9 capturas en `docs/design/refs/` con `refs/NOTAS.md` (solo locales: repo público).
- [ ] TÚ: escribir en `refs/NOTAS.md` qué te gusta / no de cada una. Opcional: capturas de Todoist/TickTick por dentro.

### 3. Diagnóstico (sin tocar código)
- [ ] CLAUDE: `/impeccable critique` sobre la app (formularios, Hoy, Tareas, Hábitos).
- [ ] CLAUDE: `/web-design-guidelines` sobre los 4 formularios.
- [ ] CLAUDE: juntar ambos en `docs/design/AUDITORIA.md` con prioridades. TÚ lo lees y dices qué te importa más.

### 4. Dirección visual → `DESIGN.md`
- [ ] CLAUDE: proponer **3 direcciones visuales** distintas (paleta, tipografía, densidad, radios, sombras) con mockup de una pantalla.
- [ ] TÚ: elegir una (o mezclar: "la A con los colores de la C").
- [ ] CLAUDE: escribirla en `docs/design/DESIGN.md`. Es la fuente de verdad: todas las pantallas se basan en ella.

### 5. Sistema de diseño base (#22, rama propia)
- [ ] Tokens: escala tipográfica (quitar `text-[10px]`/`[11px]`), elevación, usar `--dur-*`/`--ease-*`, radios en Card/Button.
- [ ] Primitivos: `Button` con `size`, `Card` con padding, fusionar Tabs+SegmentedControl, nuevos `FormSection`/`FieldGroup`/`Collapsible`.
- [ ] Color: `PRIORITY_COLORS` por tema, `COLOR_PRESETS` único (hoy duplicado en 3 formularios), sin `#5EC8FF` repetido.

### 6. TaskForm (#6/#21, rama propia) — el modelo para el resto
- [ ] CLAUDE: usar `PROMPT-OPUS.md` con objetivo TaskForm → auditoría → **3 variantes** en mockup ASCII.
- [ ] TÚ: elegir variante. Ser concreto: "el título pesa poco", "la sección Repetir sobra abierta".
- [ ] CLAUDE: implementar, verificar en navegador (móvil+escritorio, claro+oscuro, solo teclado).
- [ ] TÚ: probarlo tú mismo creando y editando 3 tareas reales.

### 7. Resto de formularios (misma receta, 1 rama/PR cada uno)
- [ ] ProjectForm  - [ ] HabitForm  - [ ] GoalForm

### 8. Páginas y estados
- [ ] TasksPage, HabitsPage, SettingsPage con el nuevo sistema.
- [ ] EmptyState/Skeleton donde falten; listas con animación de entrada/salida.

### 9. Pulido final
- [ ] `/impeccable polish` → `/web-design-guidelines` → `/impeccable animate` → `/impeccable harden`.
- [ ] Verificación completa: 360px, escritorio, claro/oscuro, teclado, `prefers-reduced-motion`.

## Reglas que no cambian
- Nada de emoji: solo iconos Lucide lineales.
- No tocar modelo de datos, esquema Dexie ni lógica de negocio en el rediseño.
- Desktop-first; móvil "mínimo viable" pero sin nada inaccesible.
- `@utility` de Tailwind v4 falla en este proyecto: verificar el CSS compilado o usar clases normales.
- No anidar `Dialog` dentro de `Dialog` (rompe el posicionamiento por el `transform` de framer-motion).
- Siempre **3 variantes** antes de implementar algo visual importante.

## Cómo dar feedback de diseño (para quien no es diseñador)
- Di **qué** y **dónde**: "los botones de prioridad se ven apretados" mejor que "no me gusta".
- Compara: "más como Linear", "menos cargado que ahora".
- Haz captura y marca con un círculo lo que falla; pégala en el chat.
- Vocabulario útil: *jerarquía* (qué se ve primero), *densidad* (cuánto cabe), *contraste*, *espaciado*,
  *divulgación progresiva* (mostrar lo avanzado solo al pedirlo), *microinteracción* (respuesta a un clic).
- Lectura corta recomendada: *Refactoring UI* (Wathan y Schoger).
