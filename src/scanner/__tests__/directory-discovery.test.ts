import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { findDirectoriesByNames } from '../utils'

describe('findDirectoriesByNames', () => {
  let tempRoot: string

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'devcleaner-dir-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true })
  })

  async function mkdirp(relativePath: string): Promise<void> {
    await fs.mkdir(path.join(tempRoot, relativePath), { recursive: true })
  }

  it('finds multiple directory names in one pass', async () => {
    await mkdirp('app/dist')
    await mkdirp('app/coverage')
    await mkdirp('svc/.pytest_cache')

    const index = await findDirectoriesByNames(['dist', 'coverage', '.pytest_cache'], tempRoot)

    expect(index.get('dist')).toEqual([path.join(tempRoot, 'app/dist')])
    expect(index.get('coverage')).toEqual([path.join(tempRoot, 'app/coverage')])
    expect(index.get('.pytest_cache')).toEqual([path.join(tempRoot, 'svc/.pytest_cache')])
  })

  it('does not enter pruned directories', async () => {
    await mkdirp('outer/node_modules/pkg/dist')
    await mkdirp('outer/web/dist')

    const index = await findDirectoriesByNames(['dist'], tempRoot)

    expect(index.get('dist')).toEqual([path.join(tempRoot, 'outer/web/dist')])
  })

  it('returns empty arrays for names with no matches', async () => {
    const index = await findDirectoriesByNames(['dist', '.turbo'], tempRoot)

    expect(index.get('dist')).toEqual([])
    expect(index.get('.turbo')).toEqual([])
  })
})
