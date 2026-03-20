interface DeckCardProps {
  name: string
  description?: string
  emoji: string
  cardCount: number
  isImported: boolean
  isImporting: boolean
  onImport: () => void
}

export function DeckCard({
  name,
  description,
  emoji,
  cardCount,
  isImported,
  isImporting,
  onImport,
}: DeckCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
          <p className="text-xs text-zinc-600 mt-1">{cardCount} Karten</p>
        </div>
      </div>

      {isImported ? (
        <div className="text-xs text-emerald-500 text-center py-2 bg-emerald-500/10 rounded-lg">
          Bereits hinzugefügt ✓
        </div>
      ) : (
        <button
          onClick={onImport}
          disabled={isImporting}
          className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {isImporting ? 'Importiere...' : 'Hinzufügen'}
        </button>
      )}
    </div>
  )
}
