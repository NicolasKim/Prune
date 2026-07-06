import { useState, useEffect, useCallback } from 'react'
import type { AppSettings } from '../../shared/types'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.getSettings()
      .then(setSettings)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [])

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    setSaving(true)
    setError(null)
    try {
      const next = await window.api.setSettings(partial)
      setSettings(next)
      return next
    } catch (err) {
      setError(String(err))
      return null
    } finally {
      setSaving(false)
    }
  }, [])

  const setLaunchAtLogin = useCallback(async (enabled: boolean) => {
    return updateSettings({ launchAtLogin: enabled })
  }, [updateSettings])

  return { settings, loading, saving, error, setLaunchAtLogin }
}
