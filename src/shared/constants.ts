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
  'Node.js': '\u{1F7E2}',
  'Python': '\u{1F535}',
  'Xcode': '\u{1F7B6}',
  'Java/Android': '\u{1F7E4}',
  'Docker': '\u{1F433}',
  'IDE': '\u{1F4DD}',
  'Homebrew': '\u{1F37A}',
  'Misc': '\u{1F4E6}',
  'Git': '\u{1F500}'
}
