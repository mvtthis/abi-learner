import { db, type Card, INACTIVE_NEXT_REVIEW } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

const LOCAL_IMPORTS_KEY = 'abi-learner-imported-decks'

function getLocalImportedDecks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_IMPORTS_KEY) || '[]')
  } catch {
    return []
  }
}

function addLocalImportedDeck(deckId: string) {
  const ids = getLocalImportedDecks()
  if (!ids.includes(deckId)) {
    ids.push(deckId)
    localStorage.setItem(LOCAL_IMPORTS_KEY, JSON.stringify(ids))
  }
}

export interface PublicDeck {
  id: string
  name: string
  description: string
  subject: string
  emoji: string
  card_count: number
}

export interface PublicCard {
  id: string
  deck_id: string
  front: string
  back: string
  tags: string[]
}

export async function fetchPublicDecks(): Promise<PublicDeck[]> {
  if (!supabase || !isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('public_decks')
    .select('*')
    .order('subject')

  if (error || !data) return []
  return data
}

export async function fetchPublicCards(deckId: string): Promise<PublicCard[]> {
  if (!supabase || !isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('public_cards')
    .select('*')
    .eq('deck_id', deckId)

  if (error || !data) return []
  return data
}

/**
 * Import/update a deck. Uses public_cards.id as local card ID.
 * - Existing cards: update front/back/tags, keep progress
 * - New cards: add with inactive next_review
 * Returns { added, updated }
 */
export async function importDeckToLocal(
  deckId: string,
  userId?: string
): Promise<{ added: number; updated: number; cleaned: number }> {
  const publicCards = await fetchPublicCards(deckId)
  if (publicCards.length === 0) return { added: 0, updated: 0, cleaned: 0 }

  const now = Date.now()
  let added = 0
  let updated = 0

  for (const pc of publicCards) {
    const existing = await db.cards.get(pc.id)

    if (existing) {
      // Update content, keep progress
      if (existing.front !== pc.front || existing.back !== pc.back || JSON.stringify(existing.tags) !== JSON.stringify(pc.tags)) {
        await db.cards.update(pc.id, {
          front: pc.front,
          back: pc.back,
          tags: pc.tags,
          updated_at: now,
          deleted: false,
          sync_status: 'pending',
        })
        updated++
      } else if (existing.deleted) {
        // Restore soft-deleted card
        await db.cards.update(pc.id, { deleted: false, updated_at: now, sync_status: 'pending' })
        updated++
      }
    } else {
      // New card — use public_cards.id as local ID
      await db.cards.put({
        id: pc.id,
        front: pc.front,
        back: pc.back,
        tags: pc.tags,
        created_at: now,
        updated_at: now,
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

  // Cleanup: remove old UUID-based duplicates (same front text, different ID)
  const publicFronts = new Map(publicCards.map((pc) => [pc.front, pc.id]))
  const allLocalCards = await db.cards.filter((c) => !c.deleted).toArray()
  let cleaned = 0
  for (const local of allLocalCards) {
    const correctId = publicFronts.get(local.front)
    if (correctId && local.id !== correctId) {
      // This is an old UUID-based card that now has a Supabase-ID version
      // Transfer progress to the new card if it has more reviews
      const newCard = await db.cards.get(correctId)
      if (newCard && local.repetitions > newCard.repetitions) {
        await db.cards.update(correctId, {
          repetitions: local.repetitions,
          next_review: local.next_review,
          ease_factor: local.ease_factor,
          interval: local.interval,
          updated_at: Date.now(),
          sync_status: 'pending',
        })
      }
      // Delete the old duplicate
      await db.cards.delete(local.id)
      cleaned++
    }
  }

  addLocalImportedDeck(deckId)
  if (supabase && userId) {
    await supabase
      .from('user_deck_imports')
      .upsert({ user_id: userId, deck_id: deckId })
  }

  return { added, updated, cleaned }
}

export async function getUserImportedDecks(
  userId: string | null
): Promise<string[]> {
  const localIds = getLocalImportedDecks()

  if (supabase && isSupabaseConfigured() && userId) {
    const { data } = await supabase
      .from('user_deck_imports')
      .select('deck_id')
      .eq('user_id', userId)

    const remoteIds = data?.map((d) => d.deck_id) ?? []
    return [...new Set([...localIds, ...remoteIds])]
  }

  return localIds
}
