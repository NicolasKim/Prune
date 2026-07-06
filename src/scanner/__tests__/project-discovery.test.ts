import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { discoverProjectsFromRoot } from '../project-discovery'

describe('discoverProjectsFromRoot', () => {
  let tempRoot: string

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'devcleaner-test-'))
  })

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true })
  })

  async function mkdirp(relativePath: string): Promise<string> {
    const fullPath = path.join(tempRoot, relativePath)
    await fs.mkdir(fullPath, { recursive: true })
    return fullPath
  }

  async function writeFile(relativePath: string, content = ''): Promise<string> {
    const fullPath = path.join(tempRoot, relativePath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, content)
    return fullPath
  }

  it('discovers projects by marker files', async () => {
    await writeFile('apps/web/package.json')
    await writeFile('backend/pom.xml')
    await writeFile('cli/Cargo.toml')

    const registry = await discoverProjectsFromRoot(tempRoot)
    const all = registry.getAll().map(p => p.root).sort()

    expect(all).toEqual([
      path.join(tempRoot, 'apps/web'),
      path.join(tempRoot, 'backend'),
      path.join(tempRoot, 'cli'),
    ].sort())
  })

  it('merges multiple markers in the same directory', async () => {
    await writeFile('hybrid/package.json')
    await writeFile('hybrid/build.gradle')

    const registry = await discoverProjectsFromRoot(tempRoot)
    const project = registry.getAll().find(p => p.root === path.join(tempRoot, 'hybrid'))

    expect(project?.markers.sort()).toEqual(['build.gradle', 'package.json'])
    expect(project?.stacks.sort()).toEqual(['java', 'node'])
  })

  it('keeps monorepo sub-packages as separate projects', async () => {
    await writeFile('mono/package.json')
    await writeFile('mono/apps/web/package.json')

    const registry = await discoverProjectsFromRoot(tempRoot)
    const roots = registry.getByStack('node').sort()

    expect(roots).toEqual([
      path.join(tempRoot, 'mono'),
      path.join(tempRoot, 'mono/apps/web'),
    ].sort())
  })

  it('does not enter pruned directories', async () => {
    await mkdirp('outer/node_modules/deep')
    await writeFile('outer/node_modules/deep/package.json')
    await writeFile('outer/web/package.json')

    const registry = await discoverProjectsFromRoot(tempRoot)
    const roots = registry.getByStack('node')

    expect(roots).toEqual([path.join(tempRoot, 'outer/web')])
  })

  it('excludes markers under result exclude patterns', async () => {
    await writeFile('.pub-cache/hosted/package.json')

    const registry = await discoverProjectsFromRoot(tempRoot)
    expect(registry.getByStack('node')).toEqual([])
  })
})
