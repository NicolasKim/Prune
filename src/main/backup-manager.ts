import path from 'path'
import { BACKUP_DIR } from '../shared/constants'
import type { BackupMeta, CleanResult } from '../shared/types'
import { createBackupArchive, restoreBackupArchive, deleteArchive } from './compressor'
import {
  insertBackup, insertRestoreLog, insertScan, completeScan, insertScanItems,
  markItemsCleaned, markBackupRestored, deleteBackupRecord
} from './database'
import { runAllScanners } from '../scanner/index'
import { randomUUID } from 'crypto'
import { mkdir } from 'fs/promises'

export async function runScan(): Promise<ScanResultWithItems> {
  const scanId = randomUUID()
  const startedAt = new Date().toISOString()
  insertScan(scanId, startedAt)

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
  await mkdir(BACKUP_DIR, { recursive: true })
  const results: CleanResult[] = []
  const { getScanItems } = await import('./database')
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

      // 3. delete source files
      const { rm } = await import('fs/promises')
      for (const p of paths) {
        await rm(p, { recursive: true, force: true })
      }

      // 4. mark as cleaned
      markItemsCleaned([row.id])

      results.push({ itemId: row.id, success: true, backupId })
    } catch (err) {
      results.push({ itemId: row.id, success: false, error: String(err) })
    }
  }

  return results
}

export async function restoreBackups(backupIds: string[]): Promise<import('../shared/types').RestoreResult[]> {
  const results: import('../shared/types').RestoreResult[] = []
  const { getBackups } = await import('./database')
  const allBackups = getBackups()

  for (const backupId of backupIds) {
    const backup = allBackups.find(b => b.id === backupId)
    if (!backup) {
      results.push({ id: randomUUID(), backupId, status: 'failed', errorMessage: 'Backup not found' })
      continue
    }

    try {
      // restore each original path
      for (const origPath of backup.originalPaths) {
        const parentDir = path.dirname(origPath)
        await mkdir(parentDir, { recursive: true })
        await restoreBackupArchive(backup.compressedPath, parentDir)
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
  const allBackups = (await import('./database')).getBackups()
  for (const backupId of backupIds) {
    const backup = allBackups.find(b => b.id === backupId)
    if (backup) {
      await deleteArchive(backup.compressedPath)
    }
    deleteBackupRecord(backupId)
  }
}
