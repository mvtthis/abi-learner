import { v4 as uuidv4 } from 'uuid'
import { db, type Card } from './db'
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

export async function importDeckToLocal(
  deckId: string,
  userId?: string
): Promise<number> {
  const publicCards = await fetchPublicCards(deckId)
  if (publicCards.length === 0) return 0

  const now = Date.now()
  const cards: Card[] = publicCards.map((pc) => ({
    id: uuidv4(),
    front: pc.front,
    back: pc.back,
    tags: pc.tags,
    created_at: now,
    updated_at: now,
    deleted: false,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: now,
    sync_status: 'pending' as const,
  }))

  await db.cards.bulkPut(cards)

  // Track import locally + in Supabase
  addLocalImportedDeck(deckId)
  if (supabase && userId) {
    await supabase
      .from('user_deck_imports')
      .upsert({ user_id: userId, deck_id: deckId })
  }

  return cards.length
}

export async function getUserImportedDecks(
  userId: string | null
): Promise<string[]> {
  // Always include local imports
  const localIds = getLocalImportedDecks()

  // Merge with Supabase if logged in
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
