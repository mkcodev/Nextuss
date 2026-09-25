# Flujo de trabajo

Una unidad de trabajo = un issue = una rama = una PR.

1. **Issue.** Cada fase o bug tiene su issue (plantillas en `.github/ISSUE_TEMPLATE`).
2. **Rama.** Desde `main`, con el número del issue: `fase-18/huecos-funcionales`, `fix/23-parpadeo-vacio`.
3. **Commits pequeños** dentro de la rama, con mensaje que explique el porqué. Prefijos: `Fase N:`, `fix:`, `docs:`, `chore:`.
4. **PR** hacia `main` con la plantilla; el cuerpo lleva `Closes #N` para cerrar el issue al fusionar.
5. **CI** (`.github/workflows/ci.yml`) ejecuta build, tests y lint; la PR no se fusiona en rojo.
6. **Fusión** con "Squash and merge" para que `main` conserve un commit por PR.
7. Al fusionar se borra la rama y se actualiza `docs/CHANGELOG.md` / `docs/ROADMAP.md` dentro de la misma PR.

Se mantienen las reglas de `docs/ROADMAP.md`: una versión Dexie por porción entregable, cero emoji,
nunca `confirm()` nativo.
