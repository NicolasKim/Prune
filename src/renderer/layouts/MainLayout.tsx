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
