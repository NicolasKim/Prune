import { app } from 'electron'
import path from 'path'

export const APP_NAME = 'DevCleaner'
export function getAppSupportDir(): string { return path.join(app.getPath('appData'), 'com.devcleaner') }
export function getBackupDir(): string { return path.join(getAppSupportDir(), 'backups') }
export function getDbPath(): string { return path.join(getAppSupportDir(), 'devcleaner.db') }
