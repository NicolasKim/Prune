import { describe, it, expect } from 'vitest'
import type { CacheItemRow } from '../../shared/types'

function parsePaths(item: { paths: string }): string[] {
  try { return JSON.parse(item.paths) } catch { return [item.paths] }
}

function toCacheItem(row: CacheItemRow) {
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

describe('toCacheItem', () => {
  it('maps camelCase row fields from getScanItems query', () => {
    const row: CacheItemRow = {
      id: 'node.npm.cache',
      scanId: 'scan-1',
      scannerId: 'node.npm',
      name: 'npm cache',
      paths: '["/Users/me/.npm"]',
      sizeBytes: 1024,
      riskLevel: 'safe',
      restoreGuide: '',
      selected: 0,
      cleaned: 0,
    }

    expect(toCacheItem(row)).toMatchObject({
      id: 'node.npm.cache',
      scannerId: 'node.npm',
      sizeBytes: 1024,
      paths: ['/Users/me/.npm'],
    })
  })
})
