import { useState, useEffect, useCallback } from 'react'
import type { BackupMeta } from '../../shared/types'

export function useBackups() {
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.listBackups()
      setBackups(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { backups, loading, refresh }
}
