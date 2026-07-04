import { useState, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import ScannerPage from '../pages/ScannerPage'
import BackupPage from '../pages/BackupPage'
import SettingsPage from '../pages/SettingsPage'
import type { CacheItem } from '../../shared/types'

export default function MainLayout() {
  const [activePage, setActivePage] = useState('scanner')
  const [categorySizes, setCategorySizes] = useState<Record<string, number>>({})

  const handleScanComplete = useCallback((items: CacheItem[]) => {
    const map: Record<string, number> = {}
    for (const item of items) {
      map[item.scannerId] = (map[item.scannerId] || 0) + item.sizeBytes
    }
    setCategorySizes(map)
  }, [])

  return (
    <div className="flex h-screen">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        categorySizes={categorySizes}
      />
      <main className="flex-1 p-6 overflow-hidden">
        {activePage === 'scanner' && <ScannerPage onScanComplete={handleScanComplete} />}
        {activePage === 'backups' && <BackupPage />}
        {activePage === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
