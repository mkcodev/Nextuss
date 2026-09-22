// Polyfills IndexedDB for tests that touch the real Dexie `db` (e.g. backup.test.ts's round trip).
import 'fake-indexeddb/auto'
