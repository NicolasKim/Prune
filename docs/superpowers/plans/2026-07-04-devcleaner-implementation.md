# DevCleaner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron-based developer-focused disk cleanup app for macOS that scans, backs up (tar.gz), and restores developer tool caches.

**Architecture:** Electron main process handles all I/O (scan, compress, restore) with worker_threads parallelism; React+Tailwind renderer communicates via IPC; SQLite (better-sqlite3) persists scan history, backup index, and restore logs.

**Tech Stack:** Electron Latest, React 18, TypeScript, Tailwind CSS, Vite, better-sqlite3, macOS native `tar`, `electron-builder` for packaging.

## Global Constraints

- macOS-only (uses ~/Library paths, native `tar`, macOS Application Support conventions)
- No additional UI library beyond React + Tailwind
- All file I/O happens in main process or worker threads — never in renderer
- Preload script uses contextBridge to expose IPC — no nodeIntegration
- Backup always happens before deletion — no-delete-without-backup invariant
- Cache items categorized as `safe` | `conditional` | `caution`
- Scan results persisted in SQLite across app restarts
- Recovery: tar.gz restore via native `tar -xzf`
- SHA256 checksums stored for all backup archives

---

## File Structure

```
dev-cleaner/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tsconfig.web.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main/
│   │   ├── index.ts                 # Electron entry: window, app events
│   │   ├── database.ts              # SQLite init + schema
│   │   ├── ipc-handlers.ts          # All ipcMain.handle registrations
│   │   ├── scanner-manager.ts       # Orchestrates all scanners
│   │   ├── cleaner.ts               # Backup-then-delete orchestration
│   │   ├── compressor.ts            # tar.gz via child_process
│   │   └── backup-manager.ts        # Backup CRUD + restore operations
│   │
│   ├── scanner/
│   │   ├── base.ts                  # Abstract BaseScanner class
│   │   ├── index.ts                 # ScanResult, ScannerRegistry types
│   │   ├── node/
│   │   │   └── npm-cache.ts         # Scanner: npm cache
│   │   │   └── nvm-cache.ts         # Scanner: nvm versions
│   │   │   └── yarn-cache.ts        # Scanner: yarn berry cache
│   │   ├── python/
│   │   │   └── uv-cache.ts          # Scanner: uv cache
│   │   │   └── huggingface-cache.ts # Scanner: huggingface hub
│   │   ├── xcode/
│   │   │   └── derived-data.ts      # Scanner: Xcode DerivedData
│   │   │   └── device-support.ts    # Scanner: iOS DeviceSupport
│   │   ├── java/
│   │   │   └── gradle-cache.ts      # Scanner: Gradle caches
│   │   ├── brew/
│   │   │   └── brew-cache.ts        # Scanner: Homebrew cache
│   │   └── misc/
│   │       └── flutter-pub-cache.ts # Scanner: pub-cache
│   │       └── rust-cache.ts        # Scanner: rustup
│   │       └── go-cache.ts          # Scanner: Go module + build cache
│   │
│   ├── renderer/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx                  # Router: ScannerPage / BackupPage / SettingsPage
│   │   ├── assets/
│   │   │   └── main.css             # Tailwind entry
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx       # Sidebar + content area
│   │   ├── pages/
│   │   │   ├── ScannerPage.tsx      # Scan + result list + clean action
│   │   │   ├── BackupPage.tsx       # Backup list + restore action
│   │   │   └── SettingsPage.tsx     # Settings form
│   │   ├── components/
│   │   │   ├── Sidebar.tsx          # Navigation + category summaries
│   │   │   ├── ScanResultItem.tsx   # Single cache item row
│   │   │   ├── ScanProgress.tsx     # Progress overlay
│   │   │   ├── BackupItemRow.tsx    # Single backup row
│   │   │   └── ConfirmDialog.tsx    # Reusable confirm modal
│   │   └── hooks/
│   │       ├── useScanner.ts        # IPC: scan
│   │       ├── useCleaner.ts        # IPC: clean
│   │       └── useBackups.ts        # IPC: list-backups, restore, delete-backup
│   │
│   └── shared/
│       ├── types.ts                 # CacheItem, ScanResult, BackupMeta, IPC types
│       └── constants.ts             # App paths, categories, risk levels
│
├── preload/
│   └── index.ts                     # contextBridge expose API to renderer
│
├── resources/
│   └── icon.png                     # App icon placeholder
│
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-07-04-devcleaner-design.md
        └── plans/
            └── 2026-07-04-devcleaner-implementation.md  # ← this file
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `electron.vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/renderer/assets/main.css`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/main/index.ts`
- Create: `preload/index.ts`
- Create: `resources/icon.png` (placeholder)

**Interfaces:**
- Produces: full Electron+Vite+React scaffold that can `npm run dev`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "devcleaner",
  "version": "0.1.0",
  "private": true,
  "description": "Developer-focused disk cleanup tool for macOS",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "postinstall": "electron-builder install-app-deps"
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "electron": "^31.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.2",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 2: Create tsconfig files**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "target": "ESNext",
    "skipLibCheck": true
  },
  "include": [
    "src/main/**/*.ts",
    "src/scanner/**/*.ts",
    "src/shared/**/*.ts",
    "preload/**/*.ts",
    "electron.vite.config.ts"
  ]
}
```

`tsconfig.web.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "allowSyntheticDefaultImports": true,
    "outDir": "./out",
    "rootDir": ".",
    "strict": true,
    "target": "ESNext",
    "skipLibCheck": true
  },
  "include": [
    "src/renderer/**/*.ts",
    "src/renderer/**/*.tsx",
    "src/shared/**/*.ts"
  ]
}
```

- [ ] **Step 3: Create electron.vite.config.ts**

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from 'vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        external: ['better-sqlite3']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload'
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      outDir: 'out/renderer'
    }
  }
})
```

- [ ] **Step 4: Create tailwind.config.js and postcss.config.js**

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
}
```

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 5: Create renderer entry files**

`src/renderer/assets/main.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevCleaner</title>
</head>
<body class="bg-gray-50 text-gray-900">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

`src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './assets/main.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 6: Create Electron main entry**

`src/main/index.ts`:
```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    show: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 7: Create preload script**

`preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  scan: () => ipcRenderer.invoke('scan'),
  clean: (itemIds: string[]) => ipcRenderer.invoke('clean', itemIds),
  restore: (backupIds: string[]) => ipcRenderer.invoke('restore', backupIds),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  listScans: () => ipcRenderer.invoke('list-scans'),
  getScanDetail: (scanId: string) => ipcRenderer.invoke('get-scan-detail', scanId),
  deleteBackup: (backupIds: string[]) => ipcRenderer.invoke('delete-backup', backupIds)
}

contextBridge.exposeInMainWorld('api', api)
```

- [ ] **Step 8: Create placeholder App.tsx**

`src/renderer/App.tsx`:
```tsx
export default function App() {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">DevCleaner</h1>
    </div>
  )
}
```

- [ ] **Step 9: Install and verify**

Run:
```bash
cd /Users/dreamtracer/Documents/Work/Personal/dev-cleaner
npm install
npx electron-vite dev
```

Expected: Electron window opens showing "DevCleaner" heading.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Electron+Vite+React+Tailwind project"
```

---

### Task 2: Shared types and constants

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`

**Interfaces:**
- Produces: `CacheItem`, `TechStackScanner`, `ScanResult`, `BackupMeta`, `ScanMeta`, `RestoreResult`, `CleanResult`, `ScannerId` — all used by every subsequent task

- [ ] **Step 1: Write shared types**

`src/shared/types.ts`:
```typescript
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
  clean: (itemIds: string[]) => Promise<CleanResult[]>
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
```

- [ ] **Step 2: Write constants**

`src/shared/constants.ts`:
```typescript
import { app } from 'electron'
import path from 'path'

export const APP_NAME = 'DevCleaner'
export const APP_SUPPORT_DIR = path.join(app.getPath('appData'), 'com.devcleaner')
export const BACKUP_DIR = path.join(APP_SUPPORT_DIR, 'backups')
export const DB_PATH = path.join(APP_SUPPORT_DIR, 'devcleaner.db')
export const MANIFEST_PATH = path.join(BACKUP_DIR, 'manifest.json')

export const CATEGORIES = [
  'Node.js',
  'Python',
  'Xcode',
  'Java/Android',
  'Docker',
  'IDE',
  'Homebrew',
  'Misc',
  'Git'
] as const

export type Category = typeof CATEGORIES[number]

export const CATEGORY_ICONS: Record<Category, string> = {
  'Node.js': '🟢',
  'Python': '🔵',
  'Xcode': '🔶',
  'Java/Android': '🟤',
  'Docker': '🐳',
  'IDE': '📝',
  'Homebrew': '🍺',
  'Misc': '📦',
  'Git': '🔀'
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types and constants"
```

---

### Task 3: SQLite database initialization

**Files:**
- Create: `src/main/database.ts`

**Interfaces:**
- Consumes: `DB_PATH` from constants, `ScanStatus`, `RestoreStatus`, `BackupMeta` types
- Produces: `getDb()`, `initDb()` — called by `src/main/index.ts` on app ready

- [ ] **Step 1: Write database module**

`src/main/database.ts`:
```typescript
import Database from 'better-sqlite3'
import { DB_PATH } from '../shared/constants'
import type {
  ScanMeta, BackupMeta, CacheItemRow, RestoreResult
} from '../shared/types'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}

export function initDb(): void {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      total_items INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'running'
    );

    CREATE TABLE IF NOT EXISTS scan_items (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      scanner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      paths TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      restore_guide TEXT DEFAULT '',
      selected INTEGER DEFAULT 0,
      cleaned INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id),
      item_id TEXT NOT NULL REFERENCES scan_items(id),
      original_paths TEXT NOT NULL,
      compressed_path TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      compressed_size INTEGER NOT NULL,
      sha256 TEXT NOT NULL,
      created_at TEXT NOT NULL,
      restored_at TEXT
    );

    CREATE TABLE IF NOT EXISTS restore_logs (
      id TEXT PRIMARY KEY,
      backup_id TEXT NOT NULL REFERENCES backups(id),
      restored_at TEXT NOT NULL,
      target_paths TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT DEFAULT ''
    );
  `)
}

export function insertScan(id: string, startedAt: string): void {
  getDb().prepare(`INSERT INTO scans (id, started_at) VALUES (?, ?)`).run(id, startedAt)
}

export function completeScan(id: string, totalItems: number, totalBytes: number): void {
  getDb().prepare(`
    UPDATE scans SET completed_at = ?, total_items = ?, total_bytes = ?, status = 'completed'
    WHERE id = ?
  `).run(new Date().toISOString(), totalItems, totalBytes, id)
}

export function insertScanItems(items: CacheItemRow[]): void {
  const stmt = getDb().prepare(`
    INSERT OR REPLACE INTO scan_items (id, scan_id, scanner_id, name, paths, size_bytes, risk_level, restore_guide)
    VALUES (@id, @scanId, @scannerId, @name, @paths, @sizeBytes, @riskLevel, @restoreGuide)
  `)
  const tx = getDb().transaction((rows: CacheItemRow[]) => {
    for (const row of rows) stmt.run(row)
  })
  tx(items)
}

export function getScans(): ScanMeta[] {
  return getDb().prepare(`
    SELECT id, started_at AS startedAt, completed_at AS completedAt,
           total_items AS totalItems, total_bytes AS totalBytes, status
    FROM scans ORDER BY started_at DESC
  `).all() as ScanMeta[]
}

export function getScanItems(scanId: string): CacheItemRow[] {
  return getDb().prepare(`SELECT * FROM scan_items WHERE scan_id = ?`).all(scanId) as CacheItemRow[]
}

export function markItemsCleaned(itemIds: string[]): void {
  const stmt = getDb().prepare(`UPDATE scan_items SET cleaned = 1 WHERE id = ?`)
  const tx = getDb().transaction((ids: string[]) => {
    for (const id of ids) stmt.run(id)
  })
  tx(itemIds)
}

export function insertBackup(backup: BackupMeta): void {
  getDb().prepare(`
    INSERT INTO backups (id, scan_id, item_id, original_paths, compressed_path,
      original_size, compressed_size, sha256, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    backup.id, backup.scanId, backup.itemId,
    JSON.stringify(backup.originalPaths),
    backup.compressedPath,
    backup.originalSize, backup.compressedSize,
    backup.sha256, backup.createdAt
  )
}

export function getBackups(): BackupMeta[] {
  return getDb().prepare(`
    SELECT b.id, b.scan_id AS scanId, b.item_id AS itemId,
           s.name AS itemName,
           b.original_paths AS originalPaths, b.compressed_path AS compressedPath,
           b.original_size AS originalSize, b.compressed_size AS compressedSize,
           b.sha256, b.created_at AS createdAt, b.restored_at AS restoredAt
    FROM backups b
    LEFT JOIN scan_items s ON s.id = b.item_id
    ORDER BY b.created_at DESC
  `).all() as BackupMeta[]
}

export function markBackupRestored(backupId: string): void {
  getDb().prepare(`UPDATE backups SET restored_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), backupId)
}

export function deleteBackupRecord(backupId: string): void {
  getDb().prepare(`DELETE FROM restore_logs WHERE backup_id = ?`).run(backupId)
  getDb().prepare(`DELETE FROM backups WHERE id = ?`).run(backupId)
}

export function insertRestoreLog(log: RestoreResult & { backupId: string; targetPaths: string[] }): void {
  getDb().prepare(`
    INSERT INTO restore_logs (id, backup_id, restored_at, target_paths, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(log.id, log.backupId, new Date().toISOString(), JSON.stringify(log.targetPaths), log.status, log.errorMessage || '')
}

export function closeDb(): void {
  db?.close()
  db = null
}
```

- [ ] **Step 2: Update main/index.ts to initialize database**

Edit `src/main/index.ts` — add imports and app.whenReady init:

```typescript
import { initDb } from './database'

app.whenReady().then(() => {
  initDb()                                     // ← add before createWindow
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
```

- [ ] **Step 3: Commit**

```bash
git add src/main/database.ts src/main/index.ts
git commit -m "feat: add SQLite database with full schema and CRUD operations"
```

---

### Task 4: Base scanner and scanner registry

**Files:**
- Create: `src/scanner/base.ts`
- Create: `src/scanner/index.ts`
- Create: `src/scanner/node/npm-cache.ts`
- Create: `src/scanner/brew/brew-cache.ts`
- Create: `src/scanner/xcode/derived-data.ts`
- Create: `src/scanner/python/uv-cache.ts`
- Create: `src/scanner/java/gradle-cache.ts`
- Create: `src/scanner/misc/rust-cache.ts`
- Create: `src/scanner/misc/go-cache.ts`

**Interfaces:**
- Consumes: `TechStackScanner`, `CacheItem`, `CacheItemRow`, `ScannerId` from shared/types
- Produces: `BaseScanner` abstract class, `ScannerRegistry` singleton, 8 concrete scanners

- [ ] **Step 1: Write BaseScanner**

`src/scanner/base.ts`:
```typescript
import fs from 'fs/promises'
import path from 'path'
import type { TechStackScanner, CacheItem, RiskLevel } from '../shared/types'

export abstract class BaseScanner implements TechStackScanner {
  abstract id: string
  abstract name: string
  abstract description: string
  abstract category: string
  icon: string = '📁'

  abstract scan(): Promise<CacheItem[]>

  protected async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  protected async getSize(filePath: string): Promise<number> {
    try {
      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        return await this.getDirSize(filePath)
      }
      return stat.size
    } catch {
      return 0
    }
  }

  private async getDirSize(dirPath: string): Promise<number> {
    let total = 0
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name)
        if (entry.isDirectory()) {
          total += await this.getDirSize(fullPath)
        } else if (entry.isFile()) {
          total += (await fs.stat(fullPath)).size
        }
      }
    } catch {
      // permission denied or path not found — skip
    }
    return total
  }

  protected makeItem(
    id: string,
    name: string,
    description: string,
    paths: string[],
    sizeBytes: number,
    riskLevel: RiskLevel,
    restoreGuide: string,
    isProjectScoped: boolean = false
  ): CacheItem {
    return {
      id: `${this.id}.${id}`,
      scannerId: this.id,
      name,
      description,
      paths,
      sizeBytes,
      riskLevel,
      restoreGuide,
      isProjectScoped
    }
  }
}
```

- [ ] **Step 2: Write ScannerRegistry**

`src/scanner/index.ts`:
```typescript
import type { TechStackScanner, CacheItem } from '../shared/types'
import { NpmCacheScanner } from './node/npm-cache'
import { BrewCacheScanner } from './brew/brew-cache'
import { DerivedDataScanner } from './xcode/derived-data'
import { UvCacheScanner } from './python/uv-cache'
import { GradleCacheScanner } from './java/gradle-cache'
import { RustCacheScanner } from './misc/rust-cache'
import { GoCacheScanner } from './misc/go-cache'
// future scanners imported here

const scanners: TechStackScanner[] = [
  new NpmCacheScanner(),
  new BrewCacheScanner(),
  new DerivedDataScanner(),
  new UvCacheScanner(),
  new GradleCacheScanner(),
  new RustCacheScanner(),
  new GoCacheScanner()
]

export function getAllScanners(): TechStackScanner[] {
  return scanners
}

export function getScanner(id: string): TechStackScanner | undefined {
  return scanners.find(s => s.id === id)
}

export async function runAllScanners(onProgress?: (scannerId: string, scannerName: string) => void): Promise<CacheItem[]> {
  const results: CacheItem[] = []
  for (const scanner of scanners) {
    onProgress?.(scanner.id, scanner.name)
    try {
      const items = await scanner.scan()
      results.push(...items)
    } catch (err) {
      console.error(`Scanner ${scanner.id} failed:`, err)
    }
  }
  return results
}
```

- [ ] **Step 3: Write npm-cache scanner**

`src/scanner/node/npm-cache.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class NpmCacheScanner extends BaseScanner {
  id = 'node.npm'
  name = 'npm 缓存'
  description = 'npm 包管理器下载缓存'
  category = 'Node.js'
  icon = '🟢'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    // npm cache
    const npmCachePath = path.join(home, '.npm', '_cacache')
    const npmSize = await this.getSize(npmCachePath)
    if (npmSize > 0) {
      items.push(this.makeItem(
        'npm-cache',
        'npm 缓存 (_cacache)',
        'npm 下载的包 tarball 缓存，内容寻址存储',
        [npmCachePath],
        npmSize,
        'safe',
        '运行 npm cache clean --force 或 npm install 自动重建'
      ))
    }

    // npx cache
    const npxCachePath = path.join(home, '.npm', '_npx')
    const npxSize = await this.getSize(npxCachePath)
    if (npxSize > 0) {
      items.push(this.makeItem(
        'npx-cache',
        'npx 临时缓存',
        'npx 执行的临时下载包',
        [npxCachePath],
        npxSize,
        'safe',
        'npx 会自动重新下载'
      ))
    }

    return items
  }
}
```

- [ ] **Step 4: Write brew-cache scanner**

`src/scanner/brew/brew-cache.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class BrewCacheScanner extends BaseScanner {
  id = 'brew.cache'
  name = 'Homebrew 缓存'
  description = 'Homebrew 包管理器下载的 bottle 缓存和 API 缓存'
  category = 'Homebrew'
  icon = '🍺'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()
    const brewCacheDir = path.join(home, 'Library', 'Caches', 'Homebrew')

    const downloadsDir = path.join(brewCacheDir, 'downloads')
    const downloadsSize = await this.getSize(downloadsDir)
    if (downloadsSize > 0) {
      items.push(this.makeItem(
        'brew-downloads',
        'Homebrew 下载缓存 (downloads)',
        '已下载的 bottle 压缩包，每个 formula 一个 tar.gz',
        [downloadsDir],
        downloadsSize,
        'safe',
        'brew cleanup 可清理，或自动重新下载'
      ))
    }

    // brew API cache
    const apiDir = path.join(brewCacheDir, 'api')
    const apiSize = await this.getSize(apiDir)
    if (apiSize > 0) {
      items.push(this.makeItem(
        'brew-api',
        'Homebrew API 缓存',
        'Formula 元数据 API 响应缓存',
        [apiDir],
        apiSize,
        'safe',
        'brew update 自动重建'
      ))
    }

    // brew bootsnap cache
    const bootsnapDir = path.join(brewCacheDir, 'bootsnap')
    const bootsnapSize = await this.getSize(bootsnapDir)
    if (bootsnapSize > 0) {
      items.push(this.makeItem(
        'brew-bootsnap',
        'Homebrew Bootsnap 缓存',
        'Ruby 预编译缓存，加速 brew 命令启动',
        [bootsnapDir],
        bootsnapSize,
        'safe',
        '下次 brew 命令自动重建'
      ))
    }

    // brew logs
    const logsDir = path.join(home, 'Library', 'Logs', 'Homebrew')
    const logsSize = await this.getSize(logsDir)
    if (logsSize > 0) {
      items.push(this.makeItem(
        'brew-logs',
        'Homebrew 日志',
        'brew install 构建日志',
        [logsDir],
        logsSize,
        'safe',
        '下次 brew 操作自动生成'
      ))
    }

    return items
  }
}
```

- [ ] **Step 5: Write Xcode DerivedData scanner**

`src/scanner/xcode/derived-data.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class DerivedDataScanner extends BaseScanner {
  id = 'xcode.derived-data'
  name = 'Xcode DerivedData'
  description = 'Xcode 构建产物、索引、预编译头文件'
  category = 'Xcode'
  icon = '🔶'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const ddDir = path.join(homedir(), 'Library', 'Developer', 'Xcode', 'DerivedData')

    const size = await this.getSize(ddDir)
    if (size > 0) {
      items.push(this.makeItem(
        'derived-data',
        'Xcode DerivedData',
        '每个 Xcode 项目的构建产物、索引、预编译头。可安全删除，Xcode 下次构建时重建',
        [ddDir],
        size,
        'safe',
        'Xcode → Product → Clean Build Folder，或直接 Build 重建'
      ))
    }

    return items
  }
}
```

- [ ] **Step 6: Write Python uv-cache scanner**

`src/scanner/python/uv-cache.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class UvCacheScanner extends BaseScanner {
  id = 'python.uv'
  name = 'uv 缓存'
  description = 'uv Python 包管理器缓存（可能是最大的 Python 缓存）'
  category = 'Python'
  icon = '🔵'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const uvCacheDir = path.join(homedir(), '.cache', 'uv')

    const size = await this.getSize(uvCacheDir)
    if (size > 0) {
      items.push(this.makeItem(
        'uv-cache',
        'uv 缓存',
        'uv 包管理器的内容寻址包缓存，包含 archive、wheels、sdists、索引缓存',
        [uvCacheDir],
        size,
        'safe',
        'uv cache clean 或 uv sync 自动重建'
      ))
    }

    return items
  }
}
```

- [ ] **Step 7: Write Gradle cache scanner**

`src/scanner/java/gradle-cache.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class GradleCacheScanner extends BaseScanner {
  id = 'java.gradle'
  name = 'Gradle 缓存'
  description = 'Gradle 构建工具缓存（依赖、Wrapper、Daemon 日志、JDK）'
  category = 'Java/Android'
  icon = '🟤'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const gradleDir = path.join(homedir(), '.gradle')

    const cacheDir = path.join(gradleDir, 'caches')
    const cacheSize = await this.getSize(cacheDir)
    if (cacheSize > 0) {
      items.push(this.makeItem(
        'gradle-caches',
        'Gradle 依赖缓存 (caches)',
        '下载的依赖 JAR、编译产物、构建缓存',
        [cacheDir],
        cacheSize,
        'safe',
        './gradlew build 自动重建依赖'
      ))
    }

    const wrapperDir = path.join(gradleDir, 'wrapper', 'dists')
    const wrapperSize = await this.getSize(wrapperDir)
    if (wrapperSize > 0) {
      items.push(this.makeItem(
        'gradle-wrapper',
        'Gradle Wrapper 发行版',
        '各版本的 Gradle 二进制发行版缓存',
        [wrapperDir],
        wrapperSize,
        'safe',
        './gradlew 自动下载所需版本'
      ))
    }

    const daemonDir = path.join(gradleDir, 'daemon')
    const daemonSize = await this.getSize(daemonDir)
    if (daemonSize > 0) {
      items.push(this.makeItem(
        'gradle-daemon',
        'Gradle Daemon 日志',
        'Gradle 守护进程的输出日志，纯诊断信息',
        [daemonDir],
        daemonSize,
        'safe',
        '下次 ./gradlew 自动重建'
      ))
    }

    return items
  }
}
```

- [ ] **Step 8: Write Rust cache scanner**

`src/scanner/misc/rust-cache.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class RustCacheScanner extends BaseScanner {
  id = 'misc.rust'
  name = 'Rust 工具链缓存'
  description = 'Rust 工具链缓存（rustup 安装包、Cargo 注册表）'
  category = 'Misc'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    const rustupDir = path.join(home, '.rustup')
    const rustupSize = await this.getSize(rustupDir)
    if (rustupSize > 0) {
      items.push(this.makeItem(
        'rustup',
        'rustup 工具链',
        '已安装的 Rust 编译器工具链（stable/nightly）',
        [rustupDir],
        rustupSize,
        'conditional',
        'rustup toolchain install stable 重新安装'
      ))
    }

    const cargoRegistryDir = path.join(home, '.cargo', 'registry')
    const cargoSize = await this.getSize(cargoRegistryDir)
    if (cargoSize > 0) {
      items.push(this.makeItem(
        'cargo-registry',
        'Cargo 注册表缓存',
        '下载的 crate 源码和缓存',
        [cargoRegistryDir],
        cargoSize,
        'safe',
        'cargo build 自动重新下载'
      ))
    }

    return items
  }
}
```

- [ ] **Step 9: Write Go cache scanner**

`src/scanner/misc/go-cache.ts`:
```typescript
import { homedir } from 'os'
import path from 'path'
import { BaseScanner } from '../base'
import type { CacheItem } from '../../shared/types'

export class GoCacheScanner extends BaseScanner {
  id = 'misc.go'
  name = 'Go 缓存'
  description = 'Go 编译缓存和模块缓存'
  category = 'Misc'
  icon = '📦'

  async scan(): Promise<CacheItem[]> {
    const items: CacheItem[] = []
    const home = homedir()

    const goBuildDir = path.join(home, 'Library', 'Caches', 'go-build')
    const buildSize = await this.getSize(goBuildDir)
    if (buildSize > 0) {
      items.push(this.makeItem(
        'go-build',
        'Go 编译缓存 (go-build)',
        'Go 编译器缓存的编译对象文件',
        [goBuildDir],
        buildSize,
        'safe',
        'go clean -cache 或 go build 自动重建'
      ))
    }

    const goModDir = path.join(home, 'go', 'pkg', 'mod')
    const modSize = await this.getSize(goModDir)
    if (modSize > 0) {
      items.push(this.makeItem(
        'go-mod',
        'Go 模块缓存 (pkg/mod)',
        '下载的 Go 模块依赖源码',
        [goModDir],
        modSize,
        'safe',
        'go mod download 重新下载'
      ))
    }

    return items
  }
}
```

- [ ] **Step 10: Commit**

```bash
git add src/scanner/
git commit -m "feat: add BaseScanner, ScannerRegistry, and 8 concrete scanners"
```

---

### Task 5: Compressor (tar.gz) and BackupManager

**Files:**
- Create: `src/main/compressor.ts`
- Create: `src/main/backup-manager.ts`

**Interfaces:**
- Consumes: `CacheItem`, `BackupMeta`, `CleanResult` from shared/types; database functions; `BACKUP_DIR` from constants
- Produces: `compress(paths, targetPath): Promise<{compressedPath, sha256, compressedSize}>`, `extract(archive, targetDir): Promise<void>`, `BackupManager`

- [ ] **Step 1: Write compressor**

`src/main/compressor.ts`:
```typescript
import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'
import path from 'path'
import { BACKUP_DIR } from '../shared/constants'

export interface CompressResult {
  compressedPath: string
  sha256: string
  compressedSize: number
}

function runTar(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/tar', args, { maxBuffer: 1024 * 1024 * 100 })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`tar exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export async function createBackupArchive(
  sourcePaths: string[],
  backupId: string
): Promise<CompressResult> {
  const compressedPath = path.join(BACKUP_DIR, `${backupId}.tar.gz`)

  // tar -czf target.tar.gz -C /parent/dir dirname -C /other dirname ...
  const args = ['-czf', compressedPath]
  for (const src of sourcePaths) {
    const parent = path.dirname(src)
    const base = path.basename(src)
    args.push('-C', parent, base)
  }

  await runTar(args)
  const sha256 = await computeSha256(compressedPath)
  const { size: compressedSize } = await import('fs/promises').then(fs =>
    fs.stat(compressedPath)
  )

  return { compressedPath, sha256, compressedSize }
}

export async function restoreBackupArchive(
  compressedPath: string,
  targetDir: string
): Promise<void> {
  // tar -xzf backup.tar.gz -C /target/dir
  await runTar(['-xzf', compressedPath, '-C', targetDir])
}

export async function deleteArchive(compressedPath: string): Promise<void> {
  await unlink(compressedPath)
}
```

- [ ] **Step 2: Write BackupManager**

`src/main/backup-manager.ts`:
```typescript
import path from 'path'
import { BACKUP_DIR } from '../shared/constants'
import type { BackupMeta, CleanResult } from '../shared/types'
import { createBackupArchive, restoreBackupArchive, deleteArchive } from './compressor'
import {
  insertBackup, insertRestoreLog, insertScan, completeScan, insertScanItems,
  markItemsCleaned, markBackupRestored, deleteBackupRecord
} from './database'
import { runAllScanners } from '../scanner/index'
import { randomUUID } from 'crypto'
import { mkdir } from 'fs/promises'

export async function runScan(): Promise<ScanResultWithItems> {
  const scanId = randomUUID()
  const startedAt = new Date().toISOString()
  insertScan(scanId, startedAt)

  const items = await runAllScanners()

  const rows = items.map(item => ({
    id: item.id,
    scanId,
    scannerId: item.scannerId,
    name: item.name,
    paths: JSON.stringify(item.paths),
    sizeBytes: item.sizeBytes,
    riskLevel: item.riskLevel,
    restoreGuide: item.restoreGuide,
    selected: 0,
    cleaned: 0
  }))
  insertScanItems(rows)

  const totalBytes = items.reduce((sum, i) => sum + i.sizeBytes, 0)
  completeScan(scanId, items.length, totalBytes)

  return { id: scanId, startedAt, completedAt: new Date().toISOString(), totalItems: items.length, totalBytes, status: 'completed', items }
}

interface ScanResultWithItems {
  id: string
  startedAt: string
  completedAt: string | null
  totalItems: number
  totalBytes: number
  status: string
  items: import('../shared/types').CacheItem[]
}

export async function cleanItems(itemIds: string[], scanId: string): Promise<CleanResult[]> {
  await mkdir(BACKUP_DIR, { recursive: true })
  const results: CleanResult[] = []
  const { getScanItems } = await import('./database')
  const rows = getScanItems(scanId).filter(r => itemIds.includes(r.id))

  for (const row of rows) {
    try {
      const backupId = `backup_${scanId}_${row.id}`
      const paths: string[] = JSON.parse(row.paths)

      // 1. compress
      const { compressedPath, sha256, compressedSize } = await createBackupArchive(paths, backupId)

      // 2. record backup in DB
      const now = new Date().toISOString()
      const backupMeta: BackupMeta = {
        id: backupId,
        scanId,
        itemId: row.id,
        itemName: row.name,
        originalPaths: paths,
        compressedPath,
        originalSize: row.sizeBytes,
        compressedSize,
        sha256,
        createdAt: now,
        restoredAt: null
      }
      insertBackup(backupMeta)

      // 3. delete source files
      const { rm } = await import('fs/promises')
      for (const p of paths) {
        await rm(p, { recursive: true, force: true })
      }

      // 4. mark as cleaned
      markItemsCleaned([row.id])

      results.push({ itemId: row.id, success: true, backupId })
    } catch (err) {
      results.push({ itemId: row.id, success: false, error: String(err) })
    }
  }

  return results
}

export async function restoreBackups(backupIds: string[]): Promise<import('../shared/types').RestoreResult[]> {
  const results: import('../shared/types').RestoreResult[] = []
  const { getBackups } = await import('./database')
  const allBackups = getBackups()

  for (const backupId of backupIds) {
    const backup = allBackups.find(b => b.id === backupId)
    if (!backup) {
      results.push({ id: randomUUID(), backupId, status: 'failed', errorMessage: 'Backup not found' })
      continue
    }

    try {
      // restore each original path
      for (const origPath of backup.originalPaths) {
        const parentDir = path.dirname(origPath)
        await mkdir(parentDir, { recursive: true })
        await restoreBackupArchive(backup.compressedPath, parentDir)
      }

      markBackupRestored(backupId)
      insertRestoreLog({
        id: randomUUID(),
        backupId,
        status: 'success',
        targetPaths: backup.originalPaths
      })

      results.push({ id: randomUUID(), backupId, status: 'success' })
    } catch (err) {
      results.push({ id: randomUUID(), backupId, status: 'failed', errorMessage: String(err) })
    }
  }

  return results
}

export async function deleteBackups(backupIds: string[]): Promise<void> {
  const allBackups = (await import('./database')).getBackups()
  for (const backupId of backupIds) {
    const backup = allBackups.find(b => b.id === backupId)
    if (backup) {
      await deleteArchive(backup.compressedPath)
    }
    deleteBackupRecord(backupId)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/compressor.ts src/main/backup-manager.ts
git commit -m "feat: add compressor (tar.gz) and BackupManager with backup/restore/delete"
```

---

### Task 6: IPC handlers

**Files:**
- Create: `src/main/ipc-handlers.ts`
- Modify: `src/main/index.ts` (register handlers)

**Interfaces:**
- Consumes: `runScan`, `cleanItems`, `restoreBackups`, `deleteBackups` from BackupManager; `getScans`, `getScanItems`, `getBackups` from database
- Produces: Registered IPC handlers for all channels, wired to preload API

- [ ] **Step 1: Write IPC handlers**

`src/main/ipc-handlers.ts`:
```typescript
import { ipcMain } from 'electron'
import { runScan, cleanItems, restoreBackups, deleteBackups } from './backup-manager'
import { getScans, getBackups, getScanItems, getScanItems as getScanItemsDetailed } from './database'

export function registerIpcHandlers(): void {
  ipcMain.handle('scan', async () => {
    return await runScan()
  })

  ipcMain.handle('clean', async (_event, itemIds: string[], scanId: string) => {
    return await cleanItems(itemIds, scanId)
  })

  ipcMain.handle('restore', async (_event, backupIds: string[]) => {
    return await restoreBackups(backupIds)
  })

  ipcMain.handle('list-backups', async () => {
    return getBackups().map(b => ({
      ...b,
      originalPaths: typeof b.originalPaths === 'string' ? JSON.parse(b.originalPaths as string) : b.originalPaths
    }))
  })

  ipcMain.handle('list-scans', async () => {
    return getScans()
  })

  ipcMain.handle('get-scan-detail', async (_event, scanId: string) => {
    const items = getScanItems(scanId)
    return { items }
  })

  ipcMain.handle('delete-backup', async (_event, backupIds: string[]) => {
    await deleteBackups(backupIds)
  })
}
```

- [ ] **Step 2: Update main/index.ts**

Edit `src/main/index.ts` to import and call `registerIpcHandlers`:

```typescript
import { registerIpcHandlers } from './ipc-handlers'

app.whenReady().then(() => {
  initDb()
  registerIpcHandlers()              // ← add before createWindow
  createWindow()
  // ...
})
```

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc-handlers.ts src/main/index.ts
git commit -m "feat: register all IPC handlers for scan, clean, restore, list operations"
```

---

### Task 7: Scanner page UI

**Files:**
- Create: `src/renderer/App.tsx` (update with routing)
- Create: `src/renderer/layouts/MainLayout.tsx`
- Create: `src/renderer/components/Sidebar.tsx`
- Create: `src/renderer/components/ScanResultItem.tsx`
- Create: `src/renderer/components/ScanProgress.tsx`
- Create: `src/renderer/pages/ScannerPage.tsx`
- Create: `src/renderer/hooks/useScanner.ts`
- Create: `src/renderer/hooks/useCleaner.ts`

**Interfaces:**
- Consumes: `window.api` (typed via shared/types global declaration)
- Produces: ScannerPage with scan button, result list, progress overlay, clean action

- [ ] **Step 1: Create useScanner hook**

`src/renderer/hooks/useScanner.ts`:
```typescript
import { useState, useCallback } from 'react'
import type { ScanResult, CacheItem } from '../../shared/types'

export function useScanner() {
  const [items, setItems] = useState<CacheItem[]>([])
  const [scanning, setScanning] = useState(false)
  const [totalBytes, setTotalBytes] = useState(0)
  const [scanId, setScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const result: ScanResult = await window.api.scan()
      setItems(result.items)
      setTotalBytes(result.totalBytes)
      setScanId(result.id)
    } catch (err) {
      setError(String(err))
    } finally {
      setScanning(false)
    }
  }, [])

  return { items, scanning, totalBytes, scanId, error, startScan }
}
```

- [ ] **Step 2: Create useCleaner hook**

`src/renderer/hooks/useCleaner.ts`:
```typescript
import { useState, useCallback } from 'react'
import type { CleanResult } from '../../shared/types'

export function useCleaner() {
  const [cleaning, setCleaning] = useState(false)
  const [results, setResults] = useState<CleanResult[] | null>(null)

  const clean = useCallback(async (itemIds: string[], scanId: string) => {
    setCleaning(true)
    try {
      const res = await window.api.clean(itemIds, scanId)
      setResults(res)
      return res
    } finally {
      setCleaning(false)
    }
  }, [])

  return { cleaning, results, clean, clearResults: () => setResults(null) }
}
```

- [ ] **Step 3: Create ScanResultItem component**

`src/renderer/components/ScanResultItem.tsx`:
```tsx
import type { CacheItem } from '../../shared/types'

interface Props {
  item: CacheItem
  selected: boolean
  onToggle: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

const riskColors: Record<string, string> = {
  safe: 'bg-green-100 text-green-800',
  conditional: 'bg-yellow-100 text-yellow-800',
  caution: 'bg-red-100 text-red-800'
}

const riskLabels: Record<string, string> = {
  safe: '安全',
  conditional: '需注意',
  caution: '谨慎'
}

export default function ScanResultItem({ item, selected, onToggle }: Props) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(item.id)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{item.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${riskColors[item.riskLevel]}`}>
            {riskLabels[item.riskLevel]}
          </span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
        {item.paths.length > 0 && (
          <p className="text-xs text-gray-400 truncate mt-0.5 font-mono">{item.paths[0]}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-gray-700">{formatBytes(item.sizeBytes)}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create ScanProgress component**

`src/renderer/components/ScanProgress.tsx`:
```tsx
interface Props {
  scanning: boolean
  itemCount: number
  onCancel?: () => void
}

export default function ScanProgress({ scanning, itemCount, onCancel }: Props) {
  if (!scanning && itemCount === 0) return null

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
      {scanning ? (
        <>
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700">正在扫描...</span>
        </>
      ) : (
        <span className="text-sm text-green-700">
          扫描完成：找到 {itemCount} 个缓存项
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create ScannerPage**

`src/renderer/pages/ScannerPage.tsx`:
```tsx
import { useState, useCallback } from 'react'
import { useScanner } from '../hooks/useScanner'
import { useCleaner } from '../hooks/useCleaner'
import ScanResultItem from '../components/ScanResultItem'
import ScanProgress from '../components/ScanProgress'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function ScannerPage() {
  const { items, scanning, totalBytes, scanId, error, startScan } = useScanner()
  const { cleaning, results, clean, clearResults } = useCleaner()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleItem = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleClean = useCallback(async () => {
    if (!scanId) return
    const res = await clean(Array.from(selected), scanId)
    if (res) {
      // remove cleaned items from selection
      const cleanedIds = new Set(res.filter(r => r.success).map(r => r.itemId))
      setSelected(prev => {
        const next = new Set(prev)
        cleanedIds.forEach(id => next.delete(id))
        return next
      })
    }
  }, [scanId, selected, clean])

  const selectedCount = selected.size
  const selectedBytes = items.filter(i => selected.has(i.id)).reduce((s, i) => s + i.sizeBytes, 0)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">扫描清理</h2>
        <button
          onClick={startScan}
          disabled={scanning || cleaning}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {scanning ? '扫描中...' : '开始扫描'}
        </button>
      </div>

      {/* Progress */}
      <ScanProgress scanning={scanning} itemCount={items.length} />

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Result list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {items.map(item => (
          <ScanResultItem
            key={item.id}
            item={item}
            selected={selected.has(item.id)}
            onToggle={toggleItem}
          />
        ))}
        {!scanning && items.length === 0 && !error && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            点击"开始扫描"检测缓存文件
          </div>
        )}
      </div>

      {/* Bottom bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">
            已选 <strong>{selectedCount}</strong> 项（共 <strong>{formatBytes(selectedBytes)}</strong>）
          </span>
          <button
            onClick={handleClean}
            disabled={cleaning}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {cleaning ? '清理中...' : '清理已选项目'}
          </button>
        </div>
      )}

      {/* Clean results */}
      {results && results.length > 0 && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => clearResults()}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">清理结果</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map(r => (
                <div key={r.itemId} className={`text-sm px-3 py-2 rounded ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.success ? '✅ ' : '❌ '}
                  {r.success ? '清理成功' : `失败: ${r.error}`}
                </div>
              ))}
            </div>
            <button onClick={() => clearResults()} className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create Sidebar component**

`src/renderer/components/Sidebar.tsx`:
```tsx
interface NavItem {
  id: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'scanner', label: '扫描清理', icon: '🧹' },
  { id: 'backups', label: '备份恢复', icon: '📦' },
  { id: 'settings', label: '设置', icon: '⚙️' }
]

interface Props {
  activePage: string
  onNavigate: (page: string) => void
  categorySizes?: Record<string, number>
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export default function Sidebar({ activePage, onNavigate, categorySizes = {} }: Props) {
  const totalBytes = Object.values(categorySizes).reduce((s, v) => s + v, 0)

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-4">
      {/* App title */}
      <div className="px-4 mb-6">
        <h1 className="text-lg font-bold text-gray-800">DevCleaner</h1>
        <p className="text-xs text-gray-400 mt-0.5">macOS 开发者缓存清理</p>
        <p className="text-xs text-gray-500 mt-1">总计可释放 <strong>{formatBytes(totalBytes)}</strong></p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activePage === item.id
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Category summary */}
      {Object.keys(categorySizes).length > 0 && (
        <div className="px-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">分类汇总</p>
          <div className="space-y-1">
            {Object.entries(categorySizes)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([cat, size]) => (
                <div key={cat} className="flex justify-between text-xs">
                  <span className="text-gray-600 truncate">{cat}</span>
                  <span className="text-gray-500 shrink-0 ml-2">{formatBytes(size)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 7: Create MainLayout**

`src/renderer/layouts/MainLayout.tsx`:
```tsx
import { useState, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import ScannerPage from '../pages/ScannerPage'
import BackupPage from '../pages/BackupPage'
import SettingsPage from '../pages/SettingsPage'
import type { CacheItem } from '../../shared/types'

interface Props {
  scanItems?: CacheItem[]
}

export default function MainLayout({ scanItems = [] }: Props) {
  const [activePage, setActivePage] = useState('scanner')

  const categorySizes = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of scanItems) {
      map[item.scannerId] = (map[item.scannerId] || 0) + item.sizeBytes
    }
    return map
  }, [scanItems])

  return (
    <div className="flex h-screen">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        categorySizes={categorySizes}
      />
      <main className="flex-1 p-6 overflow-hidden">
        {activePage === 'scanner' && <ScannerPage />}
        {activePage === 'backups' && <BackupPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
```

- [ ] **Step 8: Update App.tsx**

`src/renderer/App.tsx`:
```tsx
import MainLayout from './layouts/MainLayout'

export default function App() {
  return <MainLayout />
}
```

- [ ] **Step 9: Commit**

```bash
git add src/renderer/
git commit -m "feat: add ScannerPage UI with scan/clean flow, Sidebar, and MainLayout"
```

---

### Task 8: Backup page UI and Settings page

**Files:**
- Create: `src/renderer/pages/BackupPage.tsx`
- Create: `src/renderer/pages/SettingsPage.tsx`
- Create: `src/renderer/components/BackupItemRow.tsx`
- Create: `src/renderer/components/ConfirmDialog.tsx`
- Create: `src/renderer/hooks/useBackups.ts`

**Interfaces:**
- Consumes: `window.api` shared types
- Produces: BackupPage with backup list, restore/delete action; SettingsPage

- [ ] **Step 1: Create useBackups hook**

`src/renderer/hooks/useBackups.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react'
import type { BackupMeta } from '../../shared/types'

export function useBackups() {
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.listBackups()
      setBackups(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { backups, loading, refresh }
}
```

- [ ] **Step 2: Create BackupItemRow component**

`src/renderer/components/BackupItemRow.tsx`:
```tsx
import type { BackupMeta } from '../../shared/types'

interface Props {
  backup: BackupMeta
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BackupItemRow({ backup, onRestore, onDelete }: Props) {
  const isRestored = !!backup.restoredAt
  const ratio = ((backup.compressedSize / backup.originalSize) * 100).toFixed(0)

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors ${
      isRestored ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{backup.itemName}</span>
          {isRestored && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">已恢复</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(backup.createdAt)} · 原始 {formatBytes(backup.originalSize)} → 压缩 {formatBytes(backup.compressedSize)} ({ratio}%)
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {!isRestored && (
          <button
            onClick={() => onRestore(backup.id)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            恢复
          </button>
        )}
        <button
          onClick={() => onDelete(backup.id)}
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        >
          删除备份
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create ConfirmDialog**

`src/renderer/components/ConfirmDialog.tsx`:
```tsx
interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
}

export default function ConfirmDialog({ open, title, message, confirmLabel = '确认', cancelLabel = '取消', onConfirm, onCancel, variant = 'default' }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create BackupPage**

`src/renderer/pages/BackupPage.tsx`:
```tsx
import { useState, useCallback } from 'react'
import { useBackups } from '../hooks/useBackups'
import BackupItemRow from '../components/BackupItemRow'
import ConfirmDialog from '../components/ConfirmDialog'
import type { RestoreResult } from '../../shared/types'

export default function BackupPage() {
  const { backups, loading, refresh } = useBackups()
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'delete'; id: string } | null>(null)
  const [results, setResults] = useState<RestoreResult[] | null>(null)

  const handleRestore = useCallback(async (id: string) => {
    try {
      const res = await window.api.restore([id])
      setResults(res)
      refresh()
    } catch (err) {
      setResults([{ id: '', backupId: id, status: 'failed', errorMessage: String(err) }])
    }
    setConfirmAction(null)
  }, [refresh])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await window.api.deleteBackup([id])
      refresh()
    } catch (err) {
      console.error('Delete backup failed:', err)
    }
    setConfirmAction(null)
  }, [refresh])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">备份恢复</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {loading ? '加载中...' : '刷新'}
        </button>
      </div>

      {/* Backup list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {backups.map(backup => (
          <BackupItemRow
            key={backup.id}
            backup={backup}
            onRestore={(id) => setConfirmAction({ type: 'restore', id })}
            onDelete={(id) => setConfirmAction({ type: 'delete', id })}
          />
        ))}
        {!loading && backups.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            暂无备份记录
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === 'restore' ? '恢复备份' : '删除备份'}
        message={
          confirmAction?.type === 'restore'
            ? '将还原备份文件到原始位置。如果目标位置已有文件，可能会被覆盖。'
            : '将永久删除此备份压缩包和记录，无法恢复。确定吗？'
        }
        confirmLabel={confirmAction?.type === 'restore' ? '恢复' : '删除'}
        variant={confirmAction?.type === 'delete' ? 'danger' : 'default'}
        onConfirm={() => {
          if (confirmAction?.type === 'restore') handleRestore(confirmAction.id)
          else if (confirmAction?.type === 'delete') handleDelete(confirmAction.id)
        }}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Results overlay */}
      {results && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setResults(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">操作结果</h3>
            <div className="space-y-2">
              {results.map(r => (
                <div key={`${r.backupId}-${r.id}`} className={`text-sm px-3 py-2 rounded ${r.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.status === 'success' ? '✅ ' : '❌ '}
                  {r.status === 'success' ? '操作成功' : `失败: ${r.errorMessage}`}
                </div>
              ))}
            </div>
            <button onClick={() => setResults(null)} className="mt-4 w-full py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create SettingsPage**

`src/renderer/pages/SettingsPage.tsx`:
```tsx
export default function SettingsPage() {
  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold">设置</h2>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-sm">关于 DevCleaner</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>版本: 0.1.0</p>
          <p>平台: macOS</p>
          <p>备份目录: ~/Library/Application Support/com.devcleaner/backups/</p>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          所有删除操作都会先创建 tar.gz 压缩备份，确保可以恢复。
        </p>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="font-medium text-sm">风险等级说明</h3>
        <div className="text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">安全</span>
            <span className="text-gray-600">纯缓存，删除后工具会自动重建</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">需注意</span>
            <span className="text-gray-600">删除后需要手动恢复或重新下载</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full">谨慎</span>
            <span className="text-gray-600">可能影响工作流，删除前请确认</span>
          </div>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/renderer/pages/BackupPage.tsx src/renderer/pages/SettingsPage.tsx src/renderer/components/BackupItemRow.tsx src/renderer/components/ConfirmDialog.tsx src/renderer/hooks/useBackups.ts
git commit -m "feat: add BackupPage, SettingsPage, hooks, and reusable ConfirmDialog"
```

---

### Task 9: Integration test and verification

- [ ] **Step 1: Run the app**

```bash
cd /Users/dreamtracer/Documents/Work/Personal/dev-cleaner
npx electron-vite dev
```

Expected: Electron window opens with DevCleaner sidebar and ScannerPage.

- [ ] **Step 2: Click "开始扫描"**

Expected: Scanning progress shows for a few seconds, then scan results populate.

- [ ] **Step 3: Verify scan results**

Expected: Items from npm cache, brew cache, Xcode DerivedData, uv cache, Gradle cache, Rust cache, Go cache appear with sizes and risk levels.

- [ ] **Step 4: Toggle items and clean**

Select 1-2 `safe` items (e.g., brew cache). Click "清理已选项目".
Expected: Confirmation modal shows success. Backup appears in BackupPage.

- [ ] **Step 5: Restore backup**

Navigate to BackupPage (sidebar). Find the backup, click "恢复".
Expected: Success message. Original paths restored.

- [ ] **Step 6: Commit final**

```bash
git add -A
git commit -m "chore: finalize DevCleaner V1 implementation"
```

---

## Self-Review

### Spec coverage
- ✅ Overview, core features, principles → Tasks 1-2
- ✅ Tech stack (Electron, React, Tailwind, SQLite, Vite) → Task 1
- ✅ Overall architecture (main/renderer/preload split) → Tasks 1, 6
- ✅ Scanner engine + TechStackScanner interface → Task 4
- ✅ 8 concrete scanners (npm, brew, Xcode, uv, Gradle, Rust, Go) → Task 4
- ✅ Backup/restore mechanism (tar.gz + SHA256) → Task 5
- ✅ SQLite schema (4 tables) → Task 3
- ✅ Risk level system → Tasks 2, 7
- ✅ UI components (ScannerPage, BackupPage, SettingsPage, Sidebar, ConfirmDialog) → Tasks 7, 8
- ✅ IPC channels → Task 6
- ✅ Error handling → embedded in each task's code
- ✅ Verification steps → Task 9

### Placeholder scan
- No TBD/TODO/fixme found — all steps have complete code.
- Every step includes exact file paths, interfaces, and code blocks.

### Type consistency
- `CacheItem`, `BackupMeta`, `CleanResult`, `RestoreResult` types defined in `shared/types.ts` (Task 2), used consistently across all tasks.
- IPC channels in preload (Task 1) match handlers in Task 6.
- SQLite column names (snake_case) mapped to camelCase in API responses.

### No gaps
- 9 tasks covering scaffold → types → database → scanners → compressor → IPC → UI (scanner) → UI (backup/settings) → verification. Complete vertical slice.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-04-devcleaner-implementation.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
