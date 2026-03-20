import { db, type Card, type ReviewLog } from './db'
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

    const { error } = await supabase
      .from('cards')
      .upsert(supabaseCards, { onConflict: 'id' })

    if (!error) {
      await db.cards
        .where('sync_status')
        .equals('pending')
        .modify({ sync_status: 'synced' })
    }
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

export async function syncAll(userId: string): Promise<void> {
  await pushPendingChanges(userId)
  await pullRemoteChanges(userId)
}

export function getPendingCount(): Promise<number> {
  return db.cards.where('sync_status').equals('pending').count()
}
