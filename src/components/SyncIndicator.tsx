interface SyncIndicatorProps {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  onSync?: () => void
}

export function SyncIndicator({
  isOnline,
  isSyncing,
  pendingCount,
  onSync,
}: SyncIndicatorProps) {
  return (
    <button
      onClick={onSync}
      className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg hover:bg-zinc-800/50 transition-colors"
      title={
        isSyncing
          ? 'Synchronisiere...'
          : isOnline
          ? `Online${pendingCount > 0 ? ` · ${pendingCount} ausstehend` : ''}`
          : 'Offline'
      }
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isSyncing
            ? 'bg-yellow-400 animate-pulse'
            : isOnline
            ? pendingCount > 0
              ? 'bg-yellow-400'
              : 'bg-emerald-400'
            : 'bg-zinc-500'
        }`}
      />
      <span className="text-zinc-500">
        {isSyncing ? 'Sync...' : isOnline ? 'Online' : 'Offline'}
      </span>
      {pendingCount > 0 && !isSyncing && (
        <span className="text-zinc-600">{pendingCount}</span>
      )}
    </button>
  )
}
