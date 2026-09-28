import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Cada `.upgrade()` de `schema.ts` cambia la forma de las filas; si no tiene su gemelo en
// `applyMigrationsToBackupTables`, restaurar una copia anterior a esa versión deja filas a medias.
const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf-8')

function versionsWithUpgrade(schema: string): number[] {
  const versions: number[] = []
  const code = schema.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const re = /this\.version\((\d+)\)([\s\S]*?)(?=this\.version\(|$)/g
  for (const m of code.matchAll(re)) {
    if (m[2].includes('.upgrade(')) versions.push(Number(m[1]))
  }
  return versions
}

describe('migraciones de copias de seguridad', () => {
  it('cada .upgrade() de schema.ts tiene su rama en applyMigrationsToBackupTables', () => {
    const upgraded = versionsWithUpgrade(read('./schema.ts'))
    const migrations = read('./migrations.ts')
    expect(upgraded.length).toBeGreaterThan(0)
    const missing = upgraded.filter((v) => !migrations.includes(`fromVersion < ${v}`))
    expect(missing).toEqual([])
  })
})
