export type RiskLevel = 'safe' | 'conditional' | 'caution'
export type ScanStatus = 'running' | 'completed' | 'failed'

export interface CacheItem {
  id: string
  scannerId: string
  name: string
  description: string
  paths: string[]
  sizeBytes: number
  riskLevel: RiskLevel
  restoreGuide: string
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

export interface CleanResult {
  itemId: string
  success: boolean
  error?: string
}

export interface AppSettings {
  launchAtLogin: boolean
}

export interface Api {
  scan: () => Promise<ScanResult>
  clean: (payload: { itemIds: string[]; scanId: string }) => Promise<CleanResult[]>
  listScans: () => Promise<ScanMeta[]>
  getScanDetail: (scanId: string) => Promise<ScanResult>
  getSettings: () => Promise<AppSettings>
  setSettings: (partial: Partial<AppSettings>) => Promise<AppSettings>
  onMenuStartScan: (callback: () => void) => void
}

declare global {
  interface Window {
    api: Api
  }
}
