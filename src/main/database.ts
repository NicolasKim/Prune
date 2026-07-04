import Database from 'better-sqlite3'
import { getDbPath } from '../shared/constants'
import type { ScanMeta, CacheItemRow, BackupMeta, RestoreResult } from '../shared/types'

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
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      scanner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      paths TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      restore_guide TEXT DEFAULT '',
      selected INTEGER DEFAULT 0,
      cleaned INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      item_id TEXT NOT NULL REFERENCES scan_items(id),
      original_paths TEXT NOT NULL,
      compressed_path TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      compressed_size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL,
      restored_at TEXT
    );

    CREATE TABLE IF NOT EXISTS restore_logs (
      id TEXT PRIMARY KEY,
      backup_id TEXT NOT NULL REFERENCES backups(id),
      restored_at TEXT NOT NULL,
      target_paths TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT DEFAULT ''
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

export function getScanItems(scanId: string): CacheItemRow[] {
  return getDb().prepare('SELECT * FROM scan_items WHERE scan_id = ?').all(scanId) as CacheItemRow[]
}

export function markItemsCleaned(itemIds: string[]): void {
  const stmt = getDb().prepare('UPDATE scan_items SET cleaned = 1 WHERE id = ?')
  const tx = getDb().transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id)
  })
  tx(itemIds)
}

export function insertBackup(backup: BackupMeta): void {
  getDb().prepare(`
    INSERT INTO backups (id, scan_id, item_id, original_paths, compressed_path,
      original_size, compressed_size, sha256, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    backup.id, backup.scanId, backup.itemId,
    JSON.stringify(backup.originalPaths),
    backup.compressedPath,
    backup.originalSize, backup.compressedSize,
    backup.sha256, backup.createdAt
  )
}

export function getBackups(): BackupMeta[] {
  return getDb().prepare(`
    SELECT b.id, b.scan_id AS scanId, b.item_id AS itemId,
           s.name AS itemName,
           b.original_paths AS originalPaths, b.compressed_path AS compressedPath,
           b.original_size AS originalSize, b.compressed_size AS compressedSize,
           b.sha256, b.created_at AS createdAt, b.restored_at AS restoredAt
    FROM backups b
    LEFT JOIN scan_items s ON s.id = b.item_id
    ORDER BY b.created_at DESC
  `).all() as BackupMeta[]
}

export function markBackupRestored(backupId: string): void {
  getDb().prepare('UPDATE backups SET restored_at = ? WHERE id = ?')
    .run(new Date().toISOString(), backupId)
}

export function deleteBackupRecord(backupId: string): void {
  getDb().prepare('DELETE FROM restore_logs WHERE backup_id = ?').run(backupId)
  getDb().prepare('DELETE FROM backups WHERE id = ?').run(backupId)
}

export function insertRestoreLog(log: RestoreResult & { backupId: string; targetPaths: string[] }): void {
  getDb().prepare(`
    INSERT INTO restore_logs (id, backup_id, restored_at, target_paths, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(log.id, log.backupId, new Date().toISOString(), JSON.stringify(log.targetPaths), log.status, log.errorMessage || '')
}

export function closeDb(): void {
  db?.close()
  db = null
}
