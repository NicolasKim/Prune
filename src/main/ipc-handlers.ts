import { ipcMain } from 'electron'
import { runScan, cleanItems } from './backup-manager'
import { getScans, getScanItems, getScan } from './database'
import {
  readSettings,
  writeSettings,
  applyLaunchAtLogin,
  type AppSettings,
} from './settings'
import type { CacheItem } from '../shared/types'

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
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('scan', async () => {
    return await runScan()
  })

  ipcMain.handle('clean', async (_event, payload: { itemIds: string[]; scanId: string }) => {
    return await cleanItems(payload.itemIds, payload.scanId)
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

  ipcMain.handle('get-settings', async () => {
    return readSettings()
  })

  ipcMain.handle('set-settings', async (_event, partial: Partial<AppSettings>) => {
    const current = readSettings()
    const next: AppSettings = { ...current, ...partial }
    writeSettings(next)

    if (typeof partial.launchAtLogin === 'boolean') {
      applyLaunchAtLogin(partial.launchAtLogin)
    }

    return next
  })
}
