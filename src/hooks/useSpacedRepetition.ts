import { v4 as uuidv4 } from 'uuid'
import { db, type Card } from '@/lib/db'
import { sm2 } from '@/lib/sm2'

export function useSpacedRepetition() {
  const reviewCard = async (cardId: string, quality: number) => {
    const card = await db.cards.get(cardId)
    if (!card) return

    const result = sm2(
      quality,
      card.ease_factor,
      card.interval,
      card.repetitions
    )

    // Update card
    await db.cards.update(cardId, {
      ease_factor: result.ease_factor,
      interval: result.interval,
      repetitions: result.repetitions,
      next_review: result.next_review,
      updated_at: Date.now(),
      sync_status: 'pending',
    })

    // Log review
    await db.reviewLogs.put({
      id: uuidv4(),
      card_id: cardId,
      reviewed_at: Date.now(),
      quality,
      interval: result.interval,
      ease_factor: result.ease_factor,
      sync_status: 'pending',
    })

    return result
  }

  return { reviewCard }
}
