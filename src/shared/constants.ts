import { app } from 'electron'
import path from 'path'

export {
  SCAN_ROOT,
  TRAVERSE_PRUNE_DIRS,
  RESULT_EXCLUDE_PATTERNS,
  PROJECT_MARKERS,
  ALL_PROJECT_MARKER_FILES,
  ALL_CACHE_DIR_NAMES,
} from './scan-config'
export type { ProjectStack } from './scan-config'

export const APP_NAME = 'Prune'
export function getAppSupportDir(): string { return path.join(app.getPath('appData'), 'com.devcleaner') }
export function getDbPath(): string { return path.join(getAppSupportDir(), 'devcleaner.db') }
