import { contextBridge, ipcRenderer } from 'electron'

const api = {
  scan: () => ipcRenderer.invoke('scan'),
  clean: (payload: { itemIds: string[]; scanId: string }) => ipcRenderer.invoke('clean', payload),
  restore: (backupIds: string[]) => ipcRenderer.invoke('restore', backupIds),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  listScans: () => ipcRenderer.invoke('list-scans'),
  getScanDetail: (scanId: string) => ipcRenderer.invoke('get-scan-detail', scanId),
  deleteBackup: (backupIds: string[]) => ipcRenderer.invoke('delete-backup', backupIds)
}

contextBridge.exposeInMainWorld('api', api)
