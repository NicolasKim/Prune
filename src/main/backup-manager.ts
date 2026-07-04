import path from 'path'
import { getBackupDir } from '../shared/constants'
import type { BackupMeta, CleanResult } from '../shared/types'
import { createBackupArchive, restoreBackupArchive, deleteArchive } from './compressor'
import {
  insertBackup, insertRestoreLog, insertScan, completeScan, insertScanItems,
  markItemsCleaned, markBackupRestored, deleteBackupRecord, getScanItems, getBackups, getDb
} from './database'
import { runAllScanners } from '../scanner/index'
import { randomUUID } from 'crypto'
import { rm, mkdir, cp, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'

export async function runScan(): Promise<ScanResultWithItems> {
  const scanId = randomUUID()
  const startedAt = new Date().toISOString()
  insertScan(scanId, startedAt)

  try {
    const items = await runAllScanners()

    const rows = items.map(item => ({
      id: item.id,
      scanId,
      scannerId: item.scannerId,
      name: item.name,
      paths: JSON.stringify(item.paths),
      sizeBytes: item.sizeBytes,
      riskLevel: item.riskLevel,
      restoreGuide: item.restoreGuide,
      selected: 0,
      cleaned: 0
    }))
    insertScanItems(rows)

    const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0)
    completeScan(scanId, items.length, totalBytes)

    return { id: scanId, startedAt, completedAt: new Date().toISOString(), totalItems: items.length, totalBytes, status: 'completed', items }
  } catch (err) {
    // Mark scan as failed so it doesn't remain 'running' forever
    getDb().prepare("UPDATE scans SET status = 'failed', completed_at = ? WHERE id = ?").run(new Date().toISOString(), scanId)
    throw err
  }
}

interface ScanResultWithItems {
  id: string
  startedAt: string
  completedAt: string | null
  totalItems: number
  totalBytes: number
  status: string
  items: import('../shared/types').CacheItem[]
}

export async function cleanItems(itemIds: string[], scanId: string): Promise<CleanResult[]> {
  await mkdir(getBackupDir(), { recursive: true })
  const results: CleanResult[] = []
  const rows = getScanItems(scanId).filter(r => itemIds.includes(r.id))

  for (const row of rows) {
    try {
      const backupId = `backup_${scanId}_${row.id}`
      const paths: string[] = JSON.parse(row.paths)

      // 1. compress
      const { compressedPath, sha256, compressedSize } = await createBackupArchive(paths, backupId)

      // 2. record backup in DB
      const now = new Date().toISOString()
      const backupMeta: BackupMeta = {
        id: backupId,
        scanId,
        itemId: row.id,
        itemName: row.name,
        originalPaths: paths,
        compressedPath,
        originalSize: row.sizeBytes,
        compressedSize,
        sha256,
        createdAt: now,
        restoredAt: null
      }
      insertBackup(backupMeta)

      // 3. delete source files — track partial deletion
      const deletedPaths: string[] = []
      for (const p of paths) {
        await rm(p, { recursive: true, force: true })
        deletedPaths.push(p)
      }

      // 4. mark as cleaned
      markItemsCleaned([row.id])

      results.push({ itemId: row.id, success: true, backupId })
    } catch (err) {
      const partial = deletedPaths?.length > 0
        ? `部分路径已删除 (${deletedPaths.length}/${paths.length})，可前往「备份恢复」恢复。${err}`
        : String(err)
      results.push({ itemId: row.id, success: false, error: partial })
    }
  }

  return results
}

export async function restoreBackups(backupIds: string[]): Promise<import('../shared/types').RestoreResult[]> {
  const results: import('../shared/types').RestoreResult[] = []
  const allBackups = getBackups()

  for (const backupId of backupIds) {
    const backup = allBackups.find(b => b.id === backupId)
    if (!backup) {
      results.push({ id: randomUUID(), backupId, status: 'failed', errorMessage: 'Backup not found' })
      continue
    }

    try {
      // Extract archive once to a temp directory, then copy each path to its original location
      const tmpDir = await mkdtemp(path.join(tmpdir(), 'dc-restore-'))
      try {
        await restoreBackupArchive(backup.compressedPath, tmpDir)

        for (const origPath of backup.originalPaths) {
          const basename = path.basename(origPath)
          const tmpPath = path.join(tmpDir, basename)
          const parentDir = path.dirname(origPath)
          await mkdir(parentDir, { recursive: true })
          await cp(tmpPath, origPath, { recursive: true, force: true })
        }
      } finally {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      }

      markBackupRestored(backupId)
      insertRestoreLog({
        id: randomUUID(),
        backupId,
        status: 'success',
        targetPaths: backup.originalPaths
      })

      results.push({ id: randomUUID(), backupId, status: 'success' })
    } catch (err) {
      results.push({ id: randomUUID(), backupId, status: 'failed', errorMessage: String(err) })
    }
  }

  return results
}

export async function deleteBackups(backupIds: string[]): Promise<void> {
  const allBackups = getBackups()
  for (const backupId of backupIds) {
    const backup = allBackups.find(b => b.id === backupId)
    if (backup) {
      await deleteArchive(backup.compressedPath)
    }
    deleteBackupRecord(backupId)
  }
}
