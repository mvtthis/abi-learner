import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { getFach, getFachLabel } from '@/lib/scoreCalculator'

export interface WeakCard {
  id: string
  front: string
  tags: string[]
  fach: string
  topic: string
  firstAttemptWrong: boolean
  totalAttempts: number
  wrongAttempts: number
}

export interface WeakTopic {
  topic: string
  topicLabel: string
  fach: string
  fachLabel: string
  wrongCards: number
  totalCards: number
}

/**
 * Find cards that were wrong on first attempt, grouped by topic.
 * Useful for identifying which video topics to revisit.
 */
export function useWeakTopics() {
  const data = useLiveQuery(async () => {
    const allCards = await db.cards.filter((c) => !c.deleted).toArray()
    const allLogs = await db.reviewLogs.orderBy('reviewed_at').toArray()

    // Group logs by card_id, find first attempt per card
    const firstAttemptByCard = new Map<string, boolean>() // card_id → was first attempt wrong?
    const attemptCounts = new Map<string, { total: number; wrong: number }>()
    const seenCards = new Set<string>()

    for (const log of allLogs) {
      if (!seenCards.has(log.card_id)) {
        // First review of this card
        firstAttemptByCard.set(log.card_id, log.quality <= 1)
        seenCards.add(log.card_id)
      }
      const counts = attemptCounts.get(log.card_id) ?? { total: 0, wrong: 0 }
      counts.total++
      if (log.quality <= 1) counts.wrong++
      attemptCounts.set(log.card_id, counts)
    }

    // Build weak cards list
    const weakCards: WeakCard[] = []
    for (const card of allCards) {
      const wasFirstWrong = firstAttemptByCard.get(card.id)
      if (wasFirstWrong === undefined) continue // never reviewed
      if (!wasFirstWrong) continue // got it right first time

      const fach = getFach(card.tags)
      const topic = card.tags[0]?.split('::').slice(0, 2).join('::') ?? fach
      const counts = attemptCounts.get(card.id) ?? { total: 0, wrong: 0 }

      weakCards.push({
        id: card.id,
        front: card.front,
        tags: card.tags,
        fach,
        topic,
        firstAttemptWrong: true,
        totalAttempts: counts.total,
        wrongAttempts: counts.wrong,
      })
    }

    // Group by topic
    const topicMap = new Map<string, { fach: string; wrong: number; total: number }>()
    for (const card of allCards) {
      const fach = getFach(card.tags)
      const topic = card.tags[0]?.split('::').slice(0, 2).join('::') ?? fach
      if (!topicMap.has(topic)) topicMap.set(topic, { fach, wrong: 0, total: 0 })
      const t = topicMap.get(topic)!
      t.total++
      if (firstAttemptByCard.get(card.id)) t.wrong++
    }

    const weakTopics: WeakTopic[] = Array.from(topicMap.entries())
      .filter(([, v]) => v.wrong > 0)
      .map(([topic, v]) => ({
        topic,
        topicLabel: topic.split('::').pop() ?? topic,
        fach: v.fach,
        fachLabel: getFachLabel(v.fach),
        wrongCards: v.wrong,
        totalCards: v.total,
      }))
      .sort((a, b) => (b.wrongCards / b.totalCards) - (a.wrongCards / a.totalCards))

    return { weakCards, weakTopics }
  })

  return data ?? { weakCards: [], weakTopics: [] }
}
