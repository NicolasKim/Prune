import { describe, it, expect } from 'vitest'
import { ProjectRegistry } from '../project-discovery'

describe('ProjectRegistry', () => {
  it('groups projects by stack', () => {
    const registry = new ProjectRegistry([
      { root: '/a/web', markers: ['package.json'], stacks: ['node'] },
      { root: '/a/api', markers: ['pom.xml'], stacks: ['java'] },
      { root: '/a/mobile', markers: ['pubspec.yaml'], stacks: ['flutter'] },
      { root: '/a/cli', markers: ['Cargo.toml'], stacks: ['rust'] },
      { root: '/a/full', markers: ['package.json', 'build.gradle'], stacks: ['node', 'java'] },
    ])

    expect(registry.getByStack('node')).toEqual(['/a/web', '/a/full'])
    expect(registry.getByStack('java')).toEqual(['/a/api', '/a/full'])
    expect(registry.getByStack('rust')).toEqual(['/a/cli'])
    expect(registry.getByStack('flutter')).toEqual(['/a/mobile'])
    expect(registry.getByStack('python')).toEqual([])
    expect(registry.getByStack('go')).toEqual([])
  })

  it('returns all discovered projects', () => {
    const projects = [
      { root: '/a/web', markers: ['package.json'], stacks: ['node'] as const },
    ]
    const registry = new ProjectRegistry(projects)
    expect(registry.getAll()).toEqual(projects)
  })
})
