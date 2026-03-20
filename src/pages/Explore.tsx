import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePublicDecks } from '@/hooks/usePublicDecks'
import { DeckCard } from '@/components/DeckCard'
import { isSupabaseConfigured } from '@/lib/supabase'
import { db } from '@/lib/db'

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
  const [importAllResult, setImportAllResult] = useState<string | null>(null)

  const handleImportAll = async (clearFirst: boolean) => {
    setImportingAll(true)
    setImportAllResult(null)

    if (clearFirst) {
      await db.cards.clear()
      await db.reviewLogs.clear()
      localStorage.removeItem('abi-learner-imported-decks')
    }

    const count = await importAllDecks()
    setImportAllResult(`${count} Karten importiert!`)
    setImportingAll(false)
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

  const allImported = decks.length > 0 && decks.every((d) => importedDeckIds.includes(d.id))
  const totalCards = decks.reduce((s, d) => s + d.card_count, 0)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-bold text-white">Deck-Bibliothek</h2>

      {/* Import All Button */}
      {decks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          {importAllResult ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-center">
              <p className="text-emerald-400 text-sm font-medium">{importAllResult}</p>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 text-xs">
                {decks.length} Decks · {totalCards} Karten
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleImportAll(true)}
                  disabled={importingAll}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                >
                  {importingAll ? 'Importiere...' : 'Alle neu importieren'}
                </button>
                {!allImported && (
                  <button
                    onClick={() => handleImportAll(false)}
                    disabled={importingAll}
                    className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                  >
                    Fehlende hinzufügen
                  </button>
                )}
              </div>
              <p className="text-zinc-600 text-[10px]">
                "Alle neu importieren" löscht bestehende Karten + Lernfortschritt
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

      {SUBJECT_ORDER.filter((s) => grouped.has(s)).map((subject) => (
        <div key={subject}>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">
            {SUBJECT_LABELS[subject] ?? subject}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {grouped.get(subject)!.map((deck) => (
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
      ))}
    </div>
  )
}
