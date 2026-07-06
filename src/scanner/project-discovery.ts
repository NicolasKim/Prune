import path from 'path'
import {
  PROJECT_MARKERS,
  SCAN_ROOT,
  type ProjectStack,
} from '../shared/scan-config'
import { findAllProjectMarkers } from './utils'

export interface DiscoveredProject {
  root: string
  markers: string[]
  stacks: ProjectStack[]
}

function markerToStacks(marker: string): ProjectStack[] {
  const stacks: ProjectStack[] = []
  for (const [stack, markers] of Object.entries(PROJECT_MARKERS) as Array<[ProjectStack, readonly string[]]>) {
    if (markers.includes(marker)) {
      stacks.push(stack)
    }
  }
  return stacks
}

export class ProjectRegistry {
  constructor(private readonly projects: DiscoveredProject[]) {}

  getByStack(stack: ProjectStack): string[] {
    return this.projects
      .filter(project => project.stacks.includes(stack))
      .map(project => project.root)
  }

  getAll(): DiscoveredProject[] {
    return this.projects
  }
}

function buildRegistryFromMarkers(
  markerFiles: Array<{ file: string; marker: string }>
): ProjectRegistry {
  const byRoot = new Map<string, DiscoveredProject>()

  for (const { file, marker } of markerFiles) {
    const root = path.dirname(file)
    const stacks = markerToStacks(marker)
    const existing = byRoot.get(root)

    if (existing) {
      if (!existing.markers.includes(marker)) {
        existing.markers.push(marker)
      }
      for (const stack of stacks) {
        if (!existing.stacks.includes(stack)) {
          existing.stacks.push(stack)
        }
      }
      continue
    }

    byRoot.set(root, {
      root,
      markers: [marker],
      stacks: [...stacks],
    })
  }

  return new ProjectRegistry(Array.from(byRoot.values()))
}

export async function discoverProjectsFromRoot(scanRoot: string): Promise<ProjectRegistry> {
  const markerFiles = await findAllProjectMarkers(scanRoot)
  return buildRegistryFromMarkers(markerFiles)
}

export async function discoverProjects(): Promise<ProjectRegistry> {
  return discoverProjectsFromRoot(SCAN_ROOT)
}
