# Convenciones

## Carga y error con `useLiveQuery`

`useLiveQuery` devuelve `undefined` mientras la primera consulta no ha resuelto. Para que ese
`undefined` signifique una sola cosa:

1. **`undefined` = cargando; `null` = resuelto y sin fila.** Los getters de una sola fila devuelven
   `null` si no existe (`getProject`, `getReview`, `getCheckInForDate`, `getRecurrenceRule`,
   `getPriorityGoal`, `getGoalForTask`). Un getter nuevo nunca devuelve `undefined` para "no existe".
2. **`?? []` / `?? 0` solo para datos auxiliares** (pickers, lookups, contadores en los que un vacío
   momentáneo no se ve). Una lista que decide un estado vacío ("Nada aquí", "Sin objetivos…") se lee
   sin `?? []` y pinta `Skeleton` mientras es `undefined`.
3. **Las puertas esperan a todas sus entradas.** Un efecto que abre un ritual o un aviso comprueba
   `!== undefined` en cada consulta de la que depende (incluida la que puede resolver a `null`).
4. **Los errores suben a un límite.** `RouteErrorBoundary` cubre la página; las regiones
   independientes (paneles del dock) se envuelven en `SectionErrorBoundary` para que un fallo no tire
   la pantalla entera.

```tsx
const goals = useLiveQuery(() => listGoalsForPeriod('week', key), [key]) // Goal[] | undefined
{goals === undefined ? <Skeleton className="h-20" /> : goals.length === 0 ? <Vacio /> : <Lista goals={goals} />}

const review = useLiveQuery(() => getReview(key), [key]) // WeeklyReview | null | undefined
const needsReview = review === null // no mientras carga
```
