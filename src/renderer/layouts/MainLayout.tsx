import { useState, useCallback, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import ScannerPage from '../pages/ScannerPage'
import SettingsPage from '../pages/SettingsPage'
import { useScanner } from '../hooks/useScanner'
import { categorySizesFromItems } from '../../shared/category-sizes'
import type { CacheItem } from '../../shared/types'

export default function MainLayout() {
  const [activePage, setActivePage] = useState('scanner')
  const [categorySizes, setCategorySizes] = useState<Record<string, number>>({})

  const handleItemsChange = useCallback((items: CacheItem[]) => {
    setCategorySizes(categorySizesFromItems(items))
  }, [])

  const scanSession = useScanner(handleItemsChange)
  const scanningRef = useRef(scanSession.scanning)
  scanningRef.current = scanSession.scanning
  const startScanRef = useRef(scanSession.startScan)
  startScanRef.current = scanSession.startScan

  useEffect(() => {
    window.api.onMenuStartScan(() => {
      setActivePage('scanner')
      if (!scanningRef.current) startScanRef.current()
    })
  }, [])

  return (
    <div className="flex flex-col h-screen">
      {/* Reserve space for macOS traffic lights (hiddenInset) */}
      <div className="h-8 shrink-0 titlebar-drag" />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          categorySizes={categorySizes}
        />
        <main className="flex-1 p-6 overflow-hidden app-no-drag">
          <div className={activePage === 'scanner' ? 'h-full' : 'hidden'}>
            <ScannerPage scanSession={scanSession} />
          </div>
          {activePage === 'settings' && (
            <div className="h-full overflow-y-auto">
              <SettingsPage />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
