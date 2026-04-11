import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePublicDecks } from '@/hooks/usePublicDecks'
import { DeckCard } from '@/components/DeckCard'
import { isSupabaseConfigured } from '@/lib/supabase'

const SUBJECT_ORDER = ['bio', 'geschichte', 'sport', 'deutsch', 'englisch']
const SUBJECT_LABELS: Record<string, string> = {
  bio: 'Biologie',
  geschichte: 'Geschichte',
  sport: 'Sport',
  deutsch: 'Deutsch',
  englisch: 'Englisch',
}

export function Explore() {
  const { user } = useAuth()
  const { decks, importedDeckIds, loading, importing, importDeck, importAllDecks } =
    usePublicDecks(user?.id ?? null)
  const [importingAll, setImportingAll] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const handleUpdateAll = async () => {
    setImportingAll(true)
    setImportResult(null)
    const { added, updated } = await importAllDecks()
    const parts: string[] = []
    if (added > 0) parts.push(`${added} neu`)
    if (updated > 0) parts.push(`${updated} aktualisiert`)
    setImportResult(parts.length > 0 ? parts.join(', ') : 'Alles auf dem neuesten Stand')
    setImportingAll(false)
  }

  const handleUpdateSubject = async (subject: string) => {
    setImportResult(null)
    const subjectDecks = decks.filter((d) => d.subject === subject)
    let totalAdded = 0
    let totalUpdated = 0
    for (const deck of subjectDecks) {
      const count = await importDeck(deck.id)
      totalAdded += count
    }
    const parts: string[] = []
    if (totalAdded > 0) parts.push(`${totalAdded} neu`)
    setImportResult(`${SUBJECT_LABELS[subject]}: ${parts.length > 0 ? parts.join(', ') : 'Bereits aktuell'}`)
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <span className="text-4xl mb-4 block">📚</span>
        <h2 className="text-lg font-bold text-white mb-2">Deck-Bibliothek</h2>
        <p className="text-zinc-500 text-sm">
          Supabase nicht konfiguriert. Richte VITE_SUPABASE_URL und
          VITE_SUPABASE_ANON_KEY in .env ein, um öffentliche Decks zu nutzen.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Group by subject
  const grouped = new Map<string, typeof decks>()
  for (const deck of decks) {
    const group = grouped.get(deck.subject) ?? []
    group.push(deck)
    grouped.set(deck.subject, group)
  }

  const totalCards = decks.reduce((s, d) => s + d.card_count, 0)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-bold text-white">Deck-Bibliothek</h2>

      {/* Update All */}
      {decks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          {importResult ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-center">
              <p className="text-emerald-400 text-sm font-medium">{importResult}</p>
              <button
                onClick={() => setImportResult(null)}
                className="text-zinc-500 text-xs mt-2 hover:text-zinc-300"
              >
                Schließen
              </button>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 text-xs">
                {decks.length} Decks · {totalCards} Karten
              </p>
              <button
                onClick={handleUpdateAll}
                disabled={importingAll}
                className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {importingAll ? 'Aktualisiere...' : 'Alle aktualisieren'}
              </button>
              <p className="text-zinc-600 text-[10px]">
                Aktualisiert Karteninhalte ohne Lernfortschritt zu löschen.
              </p>
            </>
          )}
        </div>
      )}

      {decks.length === 0 && (
        <p className="text-zinc-500 text-sm text-center py-8">
          Noch keine öffentlichen Decks vorhanden.
        </p>
      )}

      {SUBJECT_ORDER.filter((s) => grouped.has(s)).map((subject) => {
        const subjectDecks = grouped.get(subject)!
        const isUpdating = subjectDecks.some((d) => importing === d.id)

        return (
          <div key={subject}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-400">
                {SUBJECT_LABELS[subject] ?? subject}
              </h3>
              <button
                onClick={() => handleUpdateSubject(subject)}
                disabled={isUpdating || importingAll}
                className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? 'Aktualisiere...' : 'Aktualisieren'}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {subjectDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  name={deck.name}
                  description={deck.description}
                  emoji={deck.emoji}
                  cardCount={deck.card_count}
                  isImported={importedDeckIds.includes(deck.id)}
                  isImporting={importing === deck.id}
                  onImport={() => importDeck(deck.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
