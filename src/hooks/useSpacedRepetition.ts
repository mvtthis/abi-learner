import { v4 as uuidv4 } from 'uuid'
import { db, getCardFach, getDaysUntilExam } from '@/lib/db'
import { leitnerAnswer } from '@/lib/leitner'

export function useSpacedRepetition() {
  const reviewCard = async (cardId: string, correct: boolean) => {
    const card = await db.cards.get(cardId)
    if (!card) return null

    const fach = getCardFach(card)
    const daysUntilExam = await getDaysUntilExam(fach)

    const result = leitnerAnswer(correct, card.repetitions, daysUntilExam)

    try {
      await db.transaction('rw', [db.cards, db.reviewLogs], async () => {
        await db.cards.update(cardId, {
          repetitions: result.level,
          next_review: result.next_review,
          updated_at: Date.now(),
          sync_status: 'pending',
        })

        await db.reviewLogs.put({
          id: uuidv4(),
          card_id: cardId,
          reviewed_at: Date.now(),
          quality: correct ? 4 : 1,
          interval: result.level,
          ease_factor: card.ease_factor,
          sync_status: 'pending',
        })
      })

      return result
    } catch (err) {
      console.error('Failed to save review:', err)
      return null
    }
  }

  return { reviewCard }
}
