export type RiskLevel = 'safe' | 'conditional' | 'caution'
export type ScanStatus = 'running' | 'completed' | 'failed'
export type RestoreStatus = 'success' | 'partial' | 'failed'

export interface CacheItem {
  id: string
  scannerId: string
  name: string
  description: string
  paths: string[]
  sizeBytes: number
  riskLevel: RiskLevel
  restoreGuide: string
  isProjectScoped: boolean
}

export interface CacheItemRow {
  id: string
  scanId: string
  scannerId: string
  name: string
  paths: string
  sizeBytes: number
  riskLevel: RiskLevel
  restoreGuide: string
  selected: number
  cleaned: number
}

export interface TechStackScanner {
  id: string
  name: string
  description: string
  category: string
  icon: string
  scan(): Promise<CacheItem[]>
}

export interface ScanResult {
  id: string
  startedAt: string
  completedAt: string | null
  totalItems: number
  totalBytes: number
  status: ScanStatus
  items: CacheItem[]
}

export interface ScanMeta {
  id: string
  startedAt: string
  completedAt: string | null
  totalItems: number
  totalBytes: number
  status: ScanStatus
}

export interface BackupMeta {
  id: string
  scanId: string
  itemId: string
  itemName: string
  originalPaths: string[]
  compressedPath: string
  originalSize: number
  compressedSize: number
  sha256: string
  createdAt: string
  restoredAt: string | null
}

export interface RestoreResult {
  id: string
  backupId: string
  status: RestoreStatus
  errorMessage?: string
}

export interface CleanResult {
  itemId: string
  success: boolean
  backupId?: string
  error?: string
}

export interface Api {
  scan: () => Promise<ScanResult>
  clean: (payload: { itemIds: string[]; scanId: string }) => Promise<CleanResult[]>
  restore: (backupIds: string[]) => Promise<RestoreResult[]>
  listBackups: () => Promise<BackupMeta[]>
  listScans: () => Promise<ScanMeta[]>
  getScanDetail: (scanId: string) => Promise<ScanResult>
  deleteBackup: (backupIds: string[]) => Promise<void>
}

declare global {
  interface Window {
    api: Api
  }
}
