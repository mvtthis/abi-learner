import { useState, useEffect, useCallback } from 'react'
import { syncAll, getPendingCount } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'

export function useSync(userId: string | null) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const sync = useCallback(async () => {
    if (!userId || !isOnline || !isSupabaseConfigured() || isSyncing) return

    setIsSyncing(true)
    setLastSyncError(null)
    try {
      await syncAll(userId)
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
      const count = await getPendingCount()
      setPendingCount(count)
    }
  }, [userId, isOnline, isSyncing])

  // Sync on mount and when coming online
  useEffect(() => {
    if (isOnline && userId) {
      sync()
    }
  }, [isOnline, userId])

  // Auto-sync every 30s when online and has pending changes, full sync every 2min
  useEffect(() => {
    if (!userId || !isOnline || !isSupabaseConfigured()) return

    const interval = setInterval(async () => {
      const count = await getPendingCount()
      setPendingCount(count)
      if (count > 0) {
        sync()
      }
    }, 30000) // check every 30s

    const fullSync = setInterval(() => {
      sync()
    }, 120000) // full sync every 2min

    return () => {
      clearInterval(interval)
      clearInterval(fullSync)
    }
  }, [userId, isOnline, sync])

  return { isOnline, isSyncing, pendingCount, lastSyncError, sync }
}
