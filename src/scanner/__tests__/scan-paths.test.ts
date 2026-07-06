import { describe, it, expect } from 'vitest'
import { buildFindCommand } from '../utils'
import { TRAVERSE_PRUNE_DIRS, ALL_PROJECT_MARKER_FILES } from '../../shared/scan-config'

describe('buildFindCommand', () => {
  it('includes scan root and prune rules', () => {
    const cmd = buildFindCommand({
      scanRoot: '/tmp/test-home',
      names: ['package.json'],
      type: 'f',
    })

    expect(cmd).toContain("find '/tmp/test-home'")
    for (const dir of TRAVERSE_PRUNE_DIRS) {
      expect(cmd).toContain(`'*/${dir}/*'`)
    }
    expect(cmd).toContain("-name 'package.json'")
    expect(cmd).toContain('-type f')
    expect(cmd).toContain('2>/dev/null')
  })

  it('supports directory search mode', () => {
    const cmd = buildFindCommand({
      scanRoot: '/tmp/test-home',
      names: ['dist'],
      type: 'd',
    })

    expect(cmd).toContain("-name 'dist'")
    expect(cmd).toContain('-type d')
  })

  it('combines multiple marker file names', () => {
    const cmd = buildFindCommand({
      scanRoot: '/tmp/test-home',
      names: ALL_PROJECT_MARKER_FILES,
      type: 'f',
    })

    expect(cmd).toContain("-name 'package.json'")
    expect(cmd).toContain("-name 'Cargo.toml'")
    expect(cmd).toContain("-name 'pubspec.yaml'")
  })
})
