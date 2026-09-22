// Exportación de datos: CSV por entidad y JSON completo. `toCsv` es puro y testeado; el resto
// toca el DOM (descarga vía Blob) y no tiene sentido testear fuera del navegador.

/** Escapa un campo para CSV: si contiene comillas, comas o saltos de línea, lo envuelve en
 * comillas dobles y duplica las comillas internas — la regla estándar de RFC 4180. */
function escapeCsvField(value: unknown): string {
  if (value == null) return ''
  const str = typeof value === 'string' ? value : JSON.stringify(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Convierte una lista de objetos planos a CSV. Las columnas son la unión de todas las claves
 * presentes en cualquier fila (no solo las de la primera), para no perder datos por filas dispares. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''

  const columns: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key)
        columns.push(key)
      }
    }
  }

  const lines = [columns.map(escapeCsvField).join(',')]
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsvField(row[col])).join(','))
  }
  return lines.join('\r\n')
}

function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  downloadBlob(filename, toCsv(rows), 'text/csv;charset=utf-8')
}

export function downloadJson(filename: string, data: unknown): void {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
}
