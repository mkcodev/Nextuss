// Base de datos propia de este dispositivo: valores que no deben viajar dentro de las copias (el
// permiso de la carpeta de copia, la fecha de la última copia, la última apertura de la app…).
import Dexie, { type Table } from 'dexie'

interface DeviceKv {
  key: string
  value: unknown
}

class DeviceDB extends Dexie {
  kv!: Table<DeviceKv, string>
  constructor() {
    super('nextuss-device')
    this.version(1).stores({ kv: 'key' })
  }
}

export const deviceDb = new DeviceDB()

export async function getDeviceValue<T>(key: string): Promise<T | undefined> {
  return (await deviceDb.kv.get(key))?.value as T | undefined
}

export async function setDeviceValue(key: string, value: unknown): Promise<void> {
  await deviceDb.kv.put({ key, value })
}
