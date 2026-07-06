import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../database', () => ({
  insertScan: vi.fn(),
  completeScan: vi.fn(),
  insertScanItems: vi.fn(),
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({ run: vi.fn() })),
  })),
}))

let scanDelayMs = 50
vi.mock('../../scanner/index', () => ({
  runAllScanners: vi.fn(async () => {
    await new Promise(resolve => setTimeout(resolve, scanDelayMs))
    return [{
      id: 'item-1',
      scannerId: 'node',
      name: 'node_modules',
      description: '',
      paths: ['/tmp/node_modules'],
      sizeBytes: 100,
      riskLevel: 'safe' as const,
      restoreGuide: '',
    }]
  }),
}))

import { runAllScanners } from '../../scanner/index'
import { runScan, isScanActive } from '../backup-manager'

describe('backup-manager', () => {
  beforeEach(() => {
    scanDelayMs = 50
    vi.mocked(runAllScanners).mockClear()
  })

  it('reuses the same in-flight scan when invoked concurrently', async () => {
    const first = runScan()
    const second = runScan()

    expect(isScanActive()).toBe(true)
    expect(first).toBe(second)

    const result = await first
    expect(result.status).toBe('completed')
    expect(result.items).toHaveLength(1)
    expect(isScanActive()).toBe(false)
    expect(runAllScanners).toHaveBeenCalledTimes(1)
  })
})
