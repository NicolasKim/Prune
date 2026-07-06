import { describe, it, expect } from 'vitest'
import { getRestoreAction } from '../scan-session-restore'
import type { ScanMeta } from '../../../shared/types'

function scan(overrides: Partial<ScanMeta> & Pick<ScanMeta, 'status'>): ScanMeta {
  return {
    id: 'scan-1',
    startedAt: '2026-07-05T00:00:00.000Z',
    completedAt: null,
    totalItems: 0,
    totalBytes: 0,
    ...overrides,
  }
}

describe('getRestoreAction', () => {
  it('returns idle when there are no scans', () => {
    expect(getRestoreAction([])).toEqual({ type: 'idle' })
  })

  it('restores the latest completed scan', () => {
    const action = getRestoreAction([
      scan({ id: 'latest', status: 'completed', completedAt: '2026-07-05T01:00:00.000Z' }),
      scan({ id: 'older', status: 'completed', completedAt: '2026-07-04T01:00:00.000Z' }),
    ])
    expect(action).toEqual({ type: 'restore-completed', scanId: 'latest' })
  })

  it('waits for a running scan to finish', () => {
    const action = getRestoreAction([scan({ id: 'active', status: 'running' })])
    expect(action).toEqual({ type: 'wait-for-running', scanId: 'active' })
  })

  it('ignores failed scans', () => {
    const action = getRestoreAction([scan({ id: 'failed', status: 'failed' })])
    expect(action).toEqual({ type: 'idle' })
  })
})
