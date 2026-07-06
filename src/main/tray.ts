import { app, Menu, Tray, BrowserWindow, nativeImage } from 'electron'
import path from 'path'
import { APP_NAME } from '../shared/constants'

let tray: Tray | null = null

function getLogoPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'prune-logo.png')
  }
  return path.join(app.getAppPath(), 'resources/prune-logo.png')
}

function loadTrayIcon() {
  const icon = nativeImage.createFromPath(getLogoPath())
  if (icon.isEmpty()) {
    return nativeImage.createEmpty()
  }
  return icon.resize({ width: 18, height: 18 })
}

export function createTray(getMainWindow: () => BrowserWindow | null): Tray {
  if (tray) return tray

  tray = new Tray(loadTrayIcon())
  tray.setToolTip(APP_NAME)

  const doQuickScan = () => {
    const win = getMainWindow()
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    win.webContents.send('menu-start-scan')
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '快捷扫描',
      click: () => doQuickScan(),
    },
    { type: 'separator' },
    {
      label: `打开 ${APP_NAME}`,
      click: () => showMainWindow(getMainWindow),
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)

  return tray
}

export function showMainWindow(getMainWindow: () => BrowserWindow | null): void {
  const win = getMainWindow()
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

export function getAppIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'icon.png')
  }
  return path.join(app.getAppPath(), 'resources/icon.png')
}
