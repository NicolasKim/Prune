import type { ScanMeta } from '../../shared/types'

export type RestoreAction =
  | { type: 'idle' }
  | { type: 'restore-completed'; scanId: string }
  | { type: 'wait-for-running'; scanId: string }

export function getRestoreAction(scans: ScanMeta[]): RestoreAction {
  if (scans.length === 0) return { type: 'idle' }

  const latest = scans[0]
  if (latest.status === 'completed') {
    return { type: 'restore-completed', scanId: latest.id }
  }
  if (latest.status === 'running') {
    return { type: 'wait-for-running', scanId: latest.id }
  }
  return { type: 'idle' }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
