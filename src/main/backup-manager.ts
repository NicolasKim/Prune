import { shell } from 'electron'
import { randomUUID } from 'crypto'
import type { CleanResult } from '../shared/types'
import {
  insertScan, completeScan, insertScanItems,
  markItemsCleaned, getScanItems, getDb
} from './database'
import { runAllScanners } from '../scanner/index'

let activeScan: Promise<ScanResultWithItems> | null = null

export function isScanActive(): boolean {
  return activeScan !== null
}

export function runScan(): Promise<ScanResultWithItems> {
  if (activeScan) return activeScan

  activeScan = executeScan().finally(() => {
    activeScan = null
  })
  return activeScan
}

async function executeScan(): Promise<ScanResultWithItems> {
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
  const results: CleanResult[] = []
  const rows = getScanItems(scanId).filter(r => itemIds.includes(r.id))

  for (const row of rows) {
    try {
      const paths: string[] = JSON.parse(row.paths)
      for (const p of paths) {
        await shell.trashItem(p)
      }
      markItemsCleaned([row.id])
      results.push({ itemId: row.id, success: true })
    } catch (err) {
      results.push({ itemId: row.id, success: false, error: String(err) })
    }
  }

  return results
}
