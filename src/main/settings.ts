import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import { getAppSupportDir } from '../shared/constants'

export interface AppSettings {
  launchAtLogin: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  launchAtLogin: false,
}

function getSettingsPath(): string {
  return path.join(getAppSupportDir(), 'settings.json')
}

export function readSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(getSettingsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function writeSettings(settings: AppSettings): void {
  fs.mkdirSync(getAppSupportDir(), { recursive: true })
  fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

export function applyLaunchAtLogin(enabled: boolean): void {
  if (process.platform !== 'darwin') return

  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: enabled,
  })
}

export function syncLaunchAtLoginSetting(settings: AppSettings): void {
  applyLaunchAtLogin(settings.launchAtLogin)
}
