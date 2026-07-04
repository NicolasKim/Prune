import { useState, useCallback } from 'react'
import type { ScanResult, CacheItem } from '../../shared/types'

export function useScanner(onScanResult?: (items: CacheItem[], totalBytes: number) => void) {
  const [items, setItems] = useState<CacheItem[]>([])
  const [scanning, setScanning] = useState(false)
  const [totalBytes, setTotalBytes] = useState(0)
  const [scanId, setScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const result: ScanResult = await window.api.scan()
      setItems(result.items)
      setTotalBytes(result.totalBytes)
      setScanId(result.id)
      onScanResult?.(result.items, result.totalBytes)
    } catch (err) {
      setError(String(err))
    } finally {
      setScanning(false)
    }
  }, [onScanResult])

  return { items, scanning, totalBytes, scanId, error, startScan }
}
