import { ALL_CACHE_DIR_NAMES } from '../shared/scan-config'
import { discoverProjects, type ProjectRegistry } from './project-discovery'
import { findDirectoriesByNames } from './utils'

let currentRegistry: ProjectRegistry | null = null
let directoryIndex: Map<string, string[]> | null = null
let scanInProgress = false

export async function initScanContext(): Promise<ProjectRegistry> {
  if (scanInProgress) {
    throw new Error('Scan already in progress')
  }

  scanInProgress = true
  try {
    const [registry, dirs] = await Promise.all([
      discoverProjects(),
      findDirectoriesByNames(ALL_CACHE_DIR_NAMES),
    ])
    currentRegistry = registry
    directoryIndex = dirs
    return registry
  } catch (err) {
    scanInProgress = false
    currentRegistry = null
    directoryIndex = null
    throw err
  }
}

export function getProjectRegistry(): ProjectRegistry {
  if (!currentRegistry) {
    throw new Error('Scan context not initialized. Call initScanContext() first.')
  }
  return currentRegistry
}

export function getNamedDirectories(dirName: string): string[] {
  if (!directoryIndex) {
    throw new Error('Scan context not initialized. Call initScanContext() first.')
  }
  return directoryIndex.get(dirName) ?? []
}

export function clearScanContext(): void {
  currentRegistry = null
  directoryIndex = null
  scanInProgress = false
}
