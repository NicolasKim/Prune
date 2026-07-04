import { ipcMain } from 'electron'
import { runScan, cleanItems, restoreBackups, deleteBackups } from './backup-manager'
import { getScans, getBackups, getScanItems, getScan } from './database'
import type { CacheItem, ScanResult } from '../shared/types'

function parsePaths(item: { paths: string }): string[] {
  try { return JSON.parse(item.paths) } catch { return [item.paths] }
}

function toCacheItem(row: import('../shared/types').CacheItemRow): CacheItem {
  return {
    id: row.id,
    scannerId: row.scannerId,
    name: row.name,
    description: '',
    paths: parsePaths(row),
    sizeBytes: row.sizeBytes,
    riskLevel: row.riskLevel,
    restoreGuide: row.restoreGuide,
    isProjectScoped: false
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('scan', async () => {
    return await runScan()
  })

  ipcMain.handle('clean', async (_event, payload: { itemIds: string[]; scanId: string }) => {
    return await cleanItems(payload.itemIds, payload.scanId)
  })

  ipcMain.handle('restore', async (_event, backupIds: string[]) => {
    return await restoreBackups(backupIds)
  })

  ipcMain.handle('list-backups', async () => {
    return getBackups().map(b => ({
      ...b,
      originalPaths: typeof b.originalPaths === 'string'
        ? JSON.parse(b.originalPaths as string)
        : b.originalPaths
    }))
  })

  ipcMain.handle('list-scans', async () => {
    return getScans()
  })

  ipcMain.handle('get-scan-detail', async (_event, scanId: string) => {
    const scan = getScan(scanId)
    if (!scan) throw new Error(`Scan ${scanId} not found`)
    const rows = getScanItems(scanId)
    const items = rows.map(toCacheItem)
    return { ...scan, items }
  })

  ipcMain.handle('delete-backup', async (_event, backupIds: string[]) => {
    await deleteBackups(backupIds)
  })
}
