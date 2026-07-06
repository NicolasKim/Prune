import Database from 'better-sqlite3'
import { getDbPath } from '../shared/constants'
import type { ScanMeta, CacheItemRow } from '../shared/types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}

export function initDb(): void {
  db = new Database(getDbPath())
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_items INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running'
    );

    CREATE TABLE IF NOT EXISTS scan_items (
      id TEXT NOT NULL,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      scanner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      paths TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      restore_guide TEXT DEFAULT '',
      cleaned INTEGER DEFAULT 0,
      PRIMARY KEY (scan_id, id)
    );
  `)
}

export function insertScan(id: string, startedAt: string): void {
  getDb().prepare('INSERT INTO scans (id, started_at) VALUES (?, ?)').run(id, startedAt)
}

export function completeScan(id: string, totalItems: number, totalBytes: number): void {
  getDb().prepare(`
    UPDATE scans SET completed_at = ?, total_items = ?, total_bytes = ?, status = 'completed'
    WHERE id = ?
  `).run(new Date().toISOString(), totalItems, totalBytes, id)
}

export function insertScanItems(items: CacheItemRow[]): void {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO scan_items (id, scan_id, scanner_id, name, paths, size_bytes, risk_level, restore_guide)
    VALUES (@id, @scanId, @scannerId, @name, @paths, @sizeBytes, @riskLevel, @restoreGuide)
  `)
  const tx = getDb().transaction((rows: CacheItemRow[]) => {
    for (const row of rows) stmt.run(row)
  })
  tx(items)
}

export function getScans(): ScanMeta[] {
  return getDb().prepare(`
    SELECT id, started_at AS startedAt, completed_at AS completedAt,
           total_items AS totalItems, total_bytes AS totalBytes, status
    FROM scans ORDER BY started_at DESC
  `).all() as ScanMeta[]
}

export function getScan(scanId: string): ScanMeta | undefined {
  return getDb().prepare(`
    SELECT id, started_at AS startedAt, completed_at AS completedAt,
           total_items AS totalItems, total_bytes AS totalBytes, status
    FROM scans WHERE id = ?
  `).get(scanId) as ScanMeta | undefined
}

export function getScanItems(scanId: string): CacheItemRow[] {
  return getDb().prepare(`
    SELECT id,
           scan_id AS scanId,
           scanner_id AS scannerId,
           name,
           paths,
           size_bytes AS sizeBytes,
           risk_level AS riskLevel,
           restore_guide AS restoreGuide,
           cleaned
    FROM scan_items WHERE scan_id = ?
  `).all(scanId) as CacheItemRow[]
}

export function markItemsCleaned(itemIds: string[]): void {
  const stmt = getDb().prepare('UPDATE scan_items SET cleaned = 1 WHERE id = ?')
  const tx = getDb().transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id)
  })
  tx(itemIds)
}

export function failOrphanedRunningScans(): void {
  getDb().prepare(`
    UPDATE scans SET status = 'failed', completed_at = ?
    WHERE status = 'running'
  `).run(new Date().toISOString())
}

export function closeDb(): void {
  db?.close()
  db = null
}
