import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  SCAN_ROOT,
  TRAVERSE_PRUNE_DIRS,
  RESULT_EXCLUDE_PATTERNS,
  ALL_PROJECT_MARKER_FILES,
} from '../shared/scan-config'

const execAsync = promisify(exec)

/** Full-home find output can exceed the default 1MB exec buffer. */
const EXEC_OPTIONS = {
  maxBuffer: 100 * 1024 * 1024,
  timeout: 10 * 60 * 1000,
}

export interface FindCommandOptions {
  scanRoot: string
  names: string[]
  type: 'f' | 'd'
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function buildFindCommand(options: FindCommandOptions): string {
  const { scanRoot, names, type } = options
  const pruneExpr = TRAVERSE_PRUNE_DIRS
    .map(dir => `-path '*/${dir}/*'`)
    .join(' -o ')

  const nameExpr = names.map(name => `-name ${shellQuote(name)}`).join(' -o ')

  return [
    `find ${shellQuote(scanRoot)}`,
    `\\( ${pruneExpr} \\) -prune -o`,
    `\\( ${nameExpr} \\) -type ${type} -print 2>/dev/null`,
  ].join(' ')
}

function shouldExcludePath(filePath: string): boolean {
  return RESULT_EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))
}

async function runFind(options: FindCommandOptions): Promise<string[]> {
  try {
    const { stdout } = await execAsync(buildFindCommand(options), EXEC_OPTIONS)
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Find directories by name within the scan root with traversal pruning.
 */
export async function findDirectories(
  dirName: string,
  scanRoot: string = SCAN_ROOT
): Promise<string[]> {
  const index = await findDirectoriesByNames([dirName], scanRoot)
  return index.get(dirName) ?? []
}

/**
 * Find multiple directory names in a single find pass.
 */
export async function findDirectoriesByNames(
  dirNames: readonly string[],
  scanRoot: string = SCAN_ROOT
): Promise<Map<string, string[]>> {
  const uniqueNames = [...new Set(dirNames)]
  const index = new Map<string, string[]>()
  for (const name of uniqueNames) {
    index.set(name, [])
  }

  if (uniqueNames.length === 0) {
    return index
  }

  const paths = await runFind({ scanRoot, names: uniqueNames, type: 'd' })
  for (const dirPath of paths) {
    if (shouldExcludePath(dirPath)) continue
    const baseName = path.basename(dirPath)
    const bucket = index.get(baseName)
    if (bucket) {
      bucket.push(dirPath)
    }
  }

  return index
}

/**
 * Find project directories by marker files.
 * Returns parent directories, deduplicated and filtered.
 */
export async function findProjectsByMarker(
  markerFile: string,
  scanRoot: string = SCAN_ROOT
): Promise<string[]> {
  const files = await runFind({ scanRoot, names: [markerFile], type: 'f' })
  const dirs = new Set<string>()
  for (const file of files) {
    if (shouldExcludePath(file)) continue
    dirs.add(path.dirname(file))
  }
  return Array.from(dirs)
}

/**
 * Find all project marker files in one pass.
 */
export async function findAllProjectMarkers(
  scanRoot: string = SCAN_ROOT
): Promise<Array<{ file: string; marker: string }>> {
  const files = await runFind({ scanRoot, names: ALL_PROJECT_MARKER_FILES, type: 'f' })
  const results: Array<{ file: string; marker: string }> = []

  for (const file of files) {
    if (shouldExcludePath(file)) continue
    results.push({ file, marker: path.basename(file) })
  }

  return results
}
