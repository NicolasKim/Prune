import { useState, useCallback } from 'react'
import type { CleanResult } from '../../shared/types'

export function useCleaner() {
  const [cleaning, setCleaning] = useState(false)
  const [results, setResults] = useState<CleanResult[] | null>(null)

  const clean = useCallback(async (itemIds: string[], scanId: string) => {
    setCleaning(true)
    try {
      const res = await window.api.clean({ itemIds, scanId })
      setResults(res)
      return res
    } finally {
      setCleaning(false)
    }
  }, [])

  return { cleaning, results, clean, clearResults: () => setResults(null) }
}
