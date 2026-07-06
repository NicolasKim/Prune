import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  initScanContext,
  clearScanContext,
  getNamedDirectories,
} from '../scan-context'

vi.mock('../project-discovery', () => ({
  discoverProjects: vi.fn(async () => ({
    getByStack: () => [],
    getAll: () => [],
  })),
}))

vi.mock('../utils', () => ({
  findDirectoriesByNames: vi.fn(async () => new Map([
    ['__pycache__', ['/tmp/project/__pycache__']],
    ['dist', ['/tmp/project/dist']],
  ])),
}))

describe('scan-context', () => {
  beforeEach(() => {
    clearScanContext()
  })

  it('exposes cached named directories after init', async () => {
    await initScanContext()

    expect(getNamedDirectories('__pycache__')).toEqual(['/tmp/project/__pycache__'])
    expect(getNamedDirectories('dist')).toEqual(['/tmp/project/dist'])
    expect(getNamedDirectories('missing')).toEqual([])

    clearScanContext()
  })

  it('rejects concurrent scan initialization', async () => {
    const first = initScanContext()
    await expect(initScanContext()).rejects.toThrow('Scan already in progress')
    await first
    clearScanContext()
  })
})
