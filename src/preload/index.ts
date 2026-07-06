import { contextBridge, ipcRenderer } from 'electron'

const api = {
  scan: () => ipcRenderer.invoke('scan'),
  clean: (payload: { itemIds: string[]; scanId: string }) => ipcRenderer.invoke('clean', payload),
  listScans: () => ipcRenderer.invoke('list-scans'),
  getScanDetail: (scanId: string) => ipcRenderer.invoke('get-scan-detail', scanId),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (partial: { launchAtLogin?: boolean }) => ipcRenderer.invoke('set-settings', partial),
  onMenuStartScan: (callback: () => void) => {
    ipcRenderer.on('menu-start-scan', () => callback())
  },
}

contextBridge.exposeInMainWorld('api', api)
