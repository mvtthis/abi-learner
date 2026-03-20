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

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await getPendingCount()
      setPendingCount(count)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  return { isOnline, isSyncing, pendingCount, lastSyncError, sync }
}
