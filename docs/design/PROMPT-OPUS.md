# Prompt para rediseñar una pantalla o formulario

Uso: copia el bloque, cambia `<target>` (p. ej. `src/features/tasks/TaskForm.tsx`) y pégalo en Claude Code con Opus.
Antes: estar en la rama del issue correspondiente y tener `docs/design/DESIGN.md` escrito (paso 4 del plan).

```xml
<role>
You are a senior product designer and senior frontend engineer specialized in productivity apps
(Linear, Things 3, Todoist level of polish). You care about information hierarchy, interaction
feedback, accessibility and craft. You make deliberate aesthetic choices, never templated defaults.
</role>

<context>
<project>Nextuss — personal productivity PWA for a user with ADHD (tasks, projects, habits, goals).
Calm, clear, low visual noise, fast to use.</project>
<stack>React 19, TypeScript, Vite, Tailwind CSS v4 (tokens in src/index.css @theme, --nx-* vars),
framer-motion, lucide-react, zustand, Dexie. UI copy in Spanish.</stack>
<target>src/features/tasks/TaskForm.tsx</target>
<read_first>
  docs/design/DESIGN.md            (visual direction: source of truth)
  docs/design/AUDITORIA.md         (known problems, priorities)
  docs/design/refs/                (reference screenshots + notes)
  src/design/primitives/           (existing primitives: reuse before creating)
</read_first>
<known_issues>
  The form grew phase by phase: sections are in historical order, not logical groups;
  every field has the same visual weight; too long vertically; max-w-md feels cramped.
</known_issues>
</context>

<goals>
1. Clear sections with visual hierarchy (e.g. Essentials / Planning / Organization / Repeat / Subtasks):
   primary field prominent, related fields grouped, rare options collapsible.
2. Progressive disclosure: the fast path (title + Enter) stays fast.
3. Strong interaction feedback on every clickable element: hover, focus-visible, active, disabled,
   loading and success states; subtle framer-motion transitions honoring prefers-reduced-motion.
4. Consistency: build/reuse shared primitives (FormSection, FieldGroup, Collapsible, chips, pickers)
   so every form shares one design language.
5. Accessibility and keyboard: logical tab order, labels/aria, Esc closes, Ctrl/Cmd+Enter submits,
   44px touch targets on mobile, WCAG AA contrast in light and dark.
</goals>

<constraints>
- Presentation/interaction refactor only. Do NOT change the data model, Dexie schema,
  store APIs or business logic. Every existing feature must keep working.
- Follow DESIGN.md and the existing tokens; light and dark mode.
- Desktop-first, but usable at 360px width with no horizontal scroll.
- Lucide line icons only. Never emoji.
- Do not nest a Dialog inside another Dialog (framer-motion transform breaks fixed positioning).
- Tailwind v4 @utility is unreliable in this project: prefer plain classes, verify compiled CSS.
- No new dependencies without asking.
- Git: work on the issue's branch, small commits, PR with "Closes #N", never commit to main.
  Explain every git/gh command you run and why.
</constraints>

<process>
<step n="1" name="audit">Read the target and its dependencies. Report in a table: fields, current
  grouping, pain points, inconsistencies with DESIGN.md. No code yet.</step>
<step n="2" name="three_variants">Propose exactly 3 genuinely different variants
  (e.g. A: wide two-column dialog, B: side panel with collapsible sections,
  C: compact title-first with expandable "more options").
  For each: ASCII mockup (desktop and 360px), section grouping, what is collapsed by default,
  pros/cons, and your recommendation. Then STOP and wait for me to pick one or combine them.</step>
<step n="3" name="implement">After my choice: shared primitives first, then the target.
  Small commits. Split into subcomponents if the file is too large.</step>
<step n="4" name="verify">Verify in the browser with screenshots: desktop + 360px, light + dark,
  create, edit, validation errors, keyboard-only flow. Run typecheck, lint and tests.
  Then run /impeccable critique on the result and fix what matters.</step>
</process>

<quality_bar>
Before finishing, check: Is the primary action obvious in under 1 second? Are sections distinct
without noise? Does every clickable element have hover/focus/active/disabled states?
Does the fast path still take one field + Enter? Does it match DESIGN.md?
</quality_bar>

<output_format>
Respond in Spanish, concise. Per step: summary, files touched, open questions.
Ask before any decision outside this scope.
</output_format>
```

## Variantes de uso
- **Otro formulario**: cambia `<target>` y `<known_issues>`. Añade: "Follow the pattern already applied in TaskForm".
- **Dirección visual (paso 4)**: pide "3 visual directions for DESIGN.md" en lugar de 3 variantes de layout.
