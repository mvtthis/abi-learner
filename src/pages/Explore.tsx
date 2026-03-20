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
  const { decks, importedDeckIds, loading, importing, importDeck } =
    usePublicDecks(user?.id ?? null)

  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6 max-w-lg mx-auto text-center">
        <span className="text-4xl mb-4 block">📚</span>
        <h2 className="text-lg font-bold text-white mb-2">Deck-Bibliothek</h2>
        <p className="text-zinc-500 text-sm">
          Supabase nicht konfiguriert. Richte VITE_SUPABASE_URL und
          VITE_SUPABASE_ANON_KEY in .env ein, um öffentliche Decks zu nutzen.
        </p>
        <p className="text-zinc-600 text-xs mt-4">
          Du kannst trotzdem Karten per .txt-Import hinzufügen.
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

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-bold text-white">Deck-Bibliothek</h2>

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
