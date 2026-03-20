import { v4 as uuidv4 } from 'uuid'
import { db, type Card } from './db'
import { supabase, isSupabaseConfigured } from './supabase'

export async function pushPendingChanges(userId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return

  // Push pending cards
  const pendingCards = await db.cards
    .where('sync_status')
    .equals('pending')
    .toArray()

  if (pendingCards.length > 0) {
    const supabaseCards = pendingCards.map((c) => ({
      id: c.id,
      user_id: userId,
      front: c.front,
      back: c.back,
      tags: c.tags,
      created_at: new Date(c.created_at).toISOString(),
      updated_at: new Date(c.updated_at).toISOString(),
      deleted: c.deleted,
      ease_factor: c.ease_factor,
      interval: c.interval,
      repetitions: c.repetitions,
      next_review: new Date(c.next_review).toISOString(),
    }))

    // Batch in groups of 200 to avoid payload limits
    for (let i = 0; i < supabaseCards.length; i += 200) {
      const batch = supabaseCards.slice(i, i + 200)
      const { error } = await supabase
        .from('cards')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        console.error('Push cards error:', error.message)
        return // Don't mark as synced if push failed
      }
    }

    await db.cards
      .where('sync_status')
      .equals('pending')
      .modify({ sync_status: 'synced' })
  }

  // Push pending reviews
  const pendingReviews = await db.reviewLogs
    .where('sync_status')
    .equals('pending')
    .toArray()

  if (pendingReviews.length > 0) {
    const supabaseReviews = pendingReviews.map((r) => ({
      id: r.id,
      user_id: userId,
      card_id: r.card_id,
      reviewed_at: new Date(r.reviewed_at).toISOString(),
      quality: r.quality,
      interval: r.interval,
      ease_factor: r.ease_factor,
    }))

    const { error } = await supabase
      .from('review_logs')
      .insert(supabaseReviews)

    if (!error) {
      await db.reviewLogs
        .where('sync_status')
        .equals('pending')
        .modify({ sync_status: 'synced' })
    }
  }
}

export async function pullRemoteChanges(userId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return

  const syncMeta = await db.syncMeta.get('main')
  const lastSync = syncMeta?.last_sync_timestamp ?? '1970-01-01T00:00:00Z'

  const { data: remoteCards } = await supabase
    .from('cards')
    .select()
    .eq('user_id', userId)
    .gt('updated_at', lastSync)

  if (remoteCards && remoteCards.length > 0) {
    for (const rc of remoteCards) {
      const localCard = await db.cards.get(rc.id)
      const remoteUpdated = new Date(rc.updated_at).getTime()

      if (!localCard || remoteUpdated > localCard.updated_at) {
        await db.cards.put({
          id: rc.id,
          front: rc.front,
          back: rc.back,
          tags: rc.tags,
          created_at: new Date(rc.created_at).getTime(),
          updated_at: remoteUpdated,
          deleted: rc.deleted,
          ease_factor: rc.ease_factor,
          interval: rc.interval,
          repetitions: rc.repetitions,
          next_review: new Date(rc.next_review).getTime(),
          sync_status: 'synced',
        })
      }
    }
  }

  await db.syncMeta.put({
    id: 'main',
    last_sync_timestamp: new Date().toISOString(),
  })
}

/**
 * Sync missing deck imports:
 * Checks which decks the user imported on other devices (via user_deck_imports)
 * and auto-imports public_cards into local IndexedDB if they're missing.
 */
async function syncDeckImports(userId: string): Promise<void> {
  if (!supabase || !isSupabaseConfigured()) return

  // Get all decks this user has imported (from any device)
  const { data: imports } = await supabase
    .from('user_deck_imports')
    .select('deck_id')
    .eq('user_id', userId)

  if (!imports || imports.length === 0) return

  // Get local card count to check which decks are actually present
  const localCards = await db.cards.filter((c) => !c.deleted).toArray()

  for (const imp of imports) {
    const deckId = imp.deck_id

    // Get the public cards for this deck to know what tags they use
    const { data: publicCards } = await supabase
      .from('public_cards')
      .select('front, back, tags')
      .eq('deck_id', deckId)
      .limit(1)

    if (!publicCards || publicCards.length === 0) continue

    // Check if we have any local cards that match this deck's content
    // by checking if any local card has the same front text as the first public card
    const sampleFront = publicCards[0].front
    const hasLocalCards = localCards.some((c) => c.front === sampleFront)

    if (hasLocalCards) continue // Already have this deck locally

    // Fetch all public cards for this deck and import them
    const { data: allPublicCards } = await supabase
      .from('public_cards')
      .select('*')
      .eq('deck_id', deckId)

    if (!allPublicCards || allPublicCards.length === 0) continue

    console.log(`Syncing missing deck: ${deckId} (${allPublicCards.length} cards)`)

    const now = Date.now()
    const cards: Card[] = allPublicCards.map((pc) => ({
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

    // Update local tracking
    try {
      const stored = JSON.parse(localStorage.getItem('abi-learner-imported-decks') || '[]')
      if (!stored.includes(deckId)) {
        stored.push(deckId)
        localStorage.setItem('abi-learner-imported-decks', JSON.stringify(stored))
      }
    } catch {}
  }
}

export async function syncAll(userId: string): Promise<void> {
  await pushPendingChanges(userId)
  await pullRemoteChanges(userId)
  await syncDeckImports(userId)
}

export function getPendingCount(): Promise<number> {
  return db.cards.where('sync_status').equals('pending').count()
}
