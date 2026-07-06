import { useState, useCallback, useEffect, useRef } from 'react'
import type { ScanResult, CacheItem } from '../../shared/types'
import { getRestoreAction, sleep } from './scan-session-restore'

export function useScanner(onItemsChange?: (items: CacheItem[]) => void) {
  const [items, setItems] = useState<CacheItem[]>([])
  const [scanning, setScanning] = useState(false)
  const [totalBytes, setTotalBytes] = useState(0)
  const [scanId, setScanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const onItemsChangeRef = useRef(onItemsChange)
  onItemsChangeRef.current = onItemsChange

  const applyScanResult = useCallback((result: ScanResult) => {
    setItems(result.items)
    setTotalBytes(result.totalBytes)
    setScanId(result.id)
    onItemsChangeRef.current?.(result.items)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      try {
        const scans = await window.api.listScans()
        if (cancelled) return

        const action = getRestoreAction(scans)
        if (action.type === 'idle') return

        if (action.type === 'restore-completed') {
          const detail = await window.api.getScanDetail(action.scanId)
          if (cancelled) return
          applyScanResult(detail)
          return
        }

        setScanning(true)
        setScanId(action.scanId)

        while (!cancelled) {
          await sleep(1000)
          const detail = await window.api.getScanDetail(action.scanId)
          if (cancelled) return

          if (detail.status === 'completed') {
            applyScanResult(detail)
            setScanning(false)
            return
          }
          if (detail.status === 'failed') {
            setError('扫描失败')
            setScanning(false)
            return
          }
        }
      } catch (err) {
        if (!cancelled) setError(String(err))
      }
    }

    restoreSession()
    return () => { cancelled = true }
  }, [applyScanResult])

  const startScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const result: ScanResult = await window.api.scan()
      applyScanResult(result)
    } catch (err) {
      setError(String(err))
    } finally {
      setScanning(false)
    }
  }, [applyScanResult])

  const removeItems = useCallback((itemIds: string[]) => {
    const idSet = new Set(itemIds)
    setItems(prev => {
      const next = prev.filter(i => !idSet.has(i.id))
      setTotalBytes(next.reduce((s, i) => s + i.sizeBytes, 0))
      onItemsChangeRef.current?.(next)
      return next
    })
  }, [])

  return { items, scanning, totalBytes, scanId, error, startScan, removeItems }
}
