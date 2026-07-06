import { app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { APP_NAME, getAppSupportDir } from '../shared/constants'
import { initDb, closeDb, failOrphanedRunningScans } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { readSettings, syncLaunchAtLoginSetting } from './settings'
import { createTray, destroyTray, getAppIconPath } from './tray'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// Set app name for Dock display (macOS). Must be called before ready event.
app.setName(APP_NAME)

function createWindow(show = true): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    icon: getAppIconPath(),
  })

  mainWindow.on('ready-to-show', () => {
    if (show) mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Set Dock icon in development (packaged app uses the .app bundle icon).
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock.setIcon(getAppIconPath())
  }

  fs.mkdirSync(getAppSupportDir(), { recursive: true })
  initDb()
  failOrphanedRunningScans()
  registerIpcHandlers()

  const settings = readSettings()
  syncLaunchAtLoginSetting(settings)

  const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin === true
  createWindow(!openedAtLogin)
  createTray(getMainWindow)

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow(true)
    }
  })
})

app.on('window-all-closed', () => {
  // Keep running in menu bar tray on macOS.
})

app.on('before-quit', () => {
  isQuitting = true
  closeDb()
  destroyTray()
})
