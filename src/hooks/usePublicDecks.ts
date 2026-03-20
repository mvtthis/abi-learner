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
        userId ? getUserImportedDecks(userId) : [],
      ])
      setDecks(fetchedDecks)
      setImportedDeckIds(imported)
      setLoading(false)
    }
    load()
  }, [userId])

  const importDeck = async (deckId: string) => {
    setImporting(deckId)
    const count = await importDeckToLocal(deckId, userId ?? undefined)
    if (count > 0) {
      setImportedDeckIds((prev) => [...prev, deckId])
    }
    setImporting(null)
    return count
  }

  return { decks, importedDeckIds, loading, importing, importDeck }
}
