import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { usePublicDecks } from '@/hooks/usePublicDecks'
import { DeckCard } from '@/components/DeckCard'
import { isSupabaseConfigured } from '@/lib/supabase'
import { db, INACTIVE_NEXT_REVIEW } from '@/lib/db'
import { fetchPublicCards } from '@/lib/deckImport'

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
  const [confirmReset, setConfirmReset] = useState(false)
  const [reimportingSubject, setReimportingSubject] = useState<string | null>(null)

  const handleImportAll = async (clearFirst: boolean) => {
    setImportingAll(true)
    setImportAllResult(null)
    setConfirmReset(false)

    if (clearFirst) {
      await db.cards.clear()
      await db.reviewLogs.clear()
      await db.activatedTopics.clear()
      localStorage.removeItem('abi-learner-imported-decks')
    }

    const count = await importAllDecks()
    setImportAllResult(`${count} Karten importiert!`)
    setImportingAll(false)
  }

  const handleReimportSubject = async (subject: string) => {
    setReimportingSubject(subject)

    // Get existing local cards for this subject
    const localCards = await db.cards
      .filter((c) => !c.deleted && c.tags.some((t) => t.toLowerCase().startsWith(subject + '::')))
      .toArray()
    const localByFront = new Map(localCards.map((c) => [c.front, c]))

    // Fetch fresh cards from Supabase for all decks of this subject
    const subjectDecks = decks.filter((d) => d.subject === subject)
    let updated = 0
    let added = 0

    for (const deck of subjectDecks) {
      const publicCards = await fetchPublicCards(deck.id)
      for (const pc of publicCards) {
        const existing = localByFront.get(pc.front)
        if (existing) {
          // Update content but keep progress (repetitions, next_review, review logs)
          if (existing.back !== pc.back || JSON.stringify(existing.tags) !== JSON.stringify(pc.tags)) {
            await db.cards.update(existing.id, {
              back: pc.back,
              tags: pc.tags,
              updated_at: Date.now(),
              sync_status: 'pending',
            })
            updated++
          }
          localByFront.delete(pc.front) // Mark as still exists
        } else {
          // New card — add it
          const { v4: uuidv4 } = await import('uuid')
          await db.cards.put({
            id: uuidv4(),
            front: pc.front,
            back: pc.back,
            tags: pc.tags,
            created_at: Date.now(),
            updated_at: Date.now(),
            deleted: false,
            ease_factor: 2.5,
            interval: 0,
            repetitions: 0,
            next_review: INACTIVE_NEXT_REVIEW,
            sync_status: 'pending',
          })
          added++
        }
      }
    }

    // Cards that no longer exist in public decks — soft delete
    let removed = 0
    for (const [, card] of localByFront) {
      await db.cards.update(card.id, { deleted: true, updated_at: Date.now(), sync_status: 'pending' })
      removed++
    }

    const parts: string[] = []
    if (updated > 0) parts.push(`${updated} aktualisiert`)
    if (added > 0) parts.push(`${added} neu`)
    if (removed > 0) parts.push(`${removed} entfernt`)
    setImportAllResult(`${SUBJECT_LABELS[subject]}: ${parts.join(', ') || 'Keine Änderungen'}`)
    setReimportingSubject(null)
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

      {/* Import All */}
      {decks.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          {importAllResult ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-center">
              <p className="text-emerald-400 text-sm font-medium">{importAllResult}</p>
              <button
                onClick={() => setImportAllResult(null)}
                className="text-zinc-500 text-xs mt-2 hover:text-zinc-300"
              >
                Schließen
              </button>
            </div>
          ) : confirmReset ? (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm font-medium">Achtung!</p>
                <p className="text-zinc-400 text-xs mt-1">
                  Das löscht alle Karten und deinen gesamten Lernfortschritt unwiderruflich.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleImportAll(true)}
                  disabled={importingAll}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 disabled:opacity-50"
                >
                  {importingAll ? 'Lösche & importiere...' : 'Ja, alles zurücksetzen'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-zinc-400 text-xs">
                {decks.length} Decks · {totalCards} Karten
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(true)}
                  disabled={importingAll}
                  className="flex-1 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                >
                  Alle neu importieren
                </button>
                {!allImported && (
                  <button
                    onClick={() => handleImportAll(false)}
                    disabled={importingAll}
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {importingAll ? 'Importiere...' : 'Fehlende hinzufügen'}
                  </button>
                )}
              </div>
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
        const subjectImported = subjectDecks.every((d) => importedDeckIds.includes(d.id))
        const isReimporting = reimportingSubject === subject

        return (
          <div key={subject}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-400">
                {SUBJECT_LABELS[subject] ?? subject}
              </h3>
              <button
                onClick={() => handleReimportSubject(subject)}
                disabled={isReimporting || importingAll}
                className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 disabled:opacity-50 transition-colors"
              >
                {isReimporting ? 'Aktualisiere...' : 'Aktualisieren'}
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
