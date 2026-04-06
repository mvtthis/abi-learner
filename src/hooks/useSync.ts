import { useState, useEffect, useCallback, useRef } from 'react'
import { syncAll, getPendingCount } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'

export function useSync(userId: string | null) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSyncError, setLastSyncError] = useState<string | null>(null)
  const isSyncingRef = useRef(false)

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
    if (!userId || !navigator.onLine || !isSupabaseConfigured() || isSyncingRef.current) return

    isSyncingRef.current = true
    setIsSyncing(true)
    setLastSyncError(null)
    try {
      await syncAll(userId)
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
      const count = await getPendingCount()
      setPendingCount(count)
    }
  }, [userId])

  // Sync on mount and when coming online
  useEffect(() => {
    if (isOnline && userId) {
      sync()
    }
  }, [isOnline, userId])

  // Auto-sync intervals — only run when online
  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) return

    const interval = setInterval(async () => {
      if (!navigator.onLine) return
      const count = await getPendingCount()
      setPendingCount(count)
      if (count > 0) {
        sync()
      }
    }, 30000)

    const fullSync = setInterval(() => {
      if (!navigator.onLine) return
      sync()
    }, 120000)

    return () => {
      clearInterval(interval)
      clearInterval(fullSync)
    }
  }, [userId, sync])

  return { isOnline, isSyncing, pendingCount, lastSyncError, sync }
}
