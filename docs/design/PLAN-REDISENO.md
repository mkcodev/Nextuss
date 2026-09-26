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
- [-] TÚ (omitido por decisión): escribir en `refs/NOTAS.md` qué te gusta / no de cada una. Opcional: capturas de Todoist/TickTick por dentro.

### 3. Diagnóstico (sin tocar código)
- [x] CLAUDE: `/impeccable critique` sobre la app (formularios, Hoy, Tareas, Hábitos).
- [x] CLAUDE: `/web-design-guidelines` sobre los 4 formularios.
- [x] CLAUDE: juntar ambos en `docs/design/AUDITORIA.md` con prioridades. TÚ lo lees y dices qué te importa más. → Hecho (#34): formularios primero, estética sobria tipo Linear.

### 4. Dirección visual → `DESIGN.md`
- [x] CLAUDE: proponer direcciones visuales con páginas de ejemplo (`docs/design/direcciones/`, 7 direcciones + mezclas, #36).
- [x] TÚ: elegir. → **F · Herramienta precisa + bloque "Ahora" del plano técnico**.
- [x] CLAUDE: escribirla en `DESIGN.md` (raíz del repo, lo leen las skills) + contrato en `.impeccable/surfaces/src-app.md`.

### 5. Sistema de diseño base (#22, rama propia)
- [x] Tokens y color (#38, PR #39): paleta de DESIGN.md, radios, sin cian/brillos/cuarzo, texto mínimo 12px, prioridades por tema, paleta única.
- [x] Primitivos (#40, PR #41): Dialog (aviso de cambios, Esc, clic fuera, foco), Button tamaños + guardando, Tabs = SegmentedControl, ToggleGroup, campos, nav.
- [x] Páginas (#42, PR #43): Hoy con bloque Ahora y atrasadas resumidas, Tareas, Hábitos, cabeceras sin etiquetas en mayúsculas.

### 6. TaskForm (#6/#21, rama propia) — el modelo para el resto
- [x] Diseño: vista "Tarea completa" de la dirección F (ya elegida en el paso 4, sin nueva ronda de variantes).
- [x] Implementado: título grande + notas, fichas (prioridad, fecha, proyecto, estimación), "Más" plegado con resumen, subtareas también al crear, "Crear otra", Ctrl+Enter.
- [ ] TÚ: probarlo creando y editando 3 tareas reales.

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
