import { useState, useEffect } from 'react'
import {
  fetchPublicDecks,
  importDeckToLocal,
  getUserImportedDecks,
  type PublicDeck,
} from '@/lib/deckImport'

export function usePublicDecks(userId: string | null) {
  const [decks, setDecks] = useState<PublicDeck[]>([])
  const [importedDeckIds, setImportedDeckIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [fetchedDecks, imported] = await Promise.all([
        fetchPublicDecks(),
        getUserImportedDecks(userId),
      ])
      setDecks(fetchedDecks)
      setImportedDeckIds(imported)
      setLoading(false)
    }
    load()
  }, [userId])

  const importDeck = async (deckId: string) => {
    setImporting(deckId)
    const { added, updated } = await importDeckToLocal(deckId, userId ?? undefined)
    if (added > 0 || updated > 0) {
      setImportedDeckIds((prev) => [...new Set([...prev, deckId])])
    }
    setImporting(null)
    return added
  }

  const importAllDecks = async () => {
    let totalAdded = 0
    let totalUpdated = 0
    for (const deck of decks) {
      const { added, updated } = await importDeckToLocal(deck.id, userId ?? undefined)
      totalAdded += added
      totalUpdated += updated
    }
    setImportedDeckIds(decks.map((d) => d.id))
    return { added: totalAdded, updated: totalUpdated }
  }

  return { decks, importedDeckIds, loading, importing, importDeck, importAllDecks }
}
