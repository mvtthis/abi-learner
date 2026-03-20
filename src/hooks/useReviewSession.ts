import { useState, useCallback, useEffect } from 'react'
import { db, type Card } from '@/lib/db'
import { getSettings } from '@/lib/db'
import { useSpacedRepetition } from './useSpacedRepetition'

export interface ReviewSession {
  cards: Card[]
  currentIndex: number
  currentCard: Card | null
  isFlipped: boolean
  isComplete: boolean
  totalCards: number
  reviewedCount: number
  againQueue: Card[]
}

export function useReviewSession(filterTags?: string[]) {
  const [session, setSession] = useState<ReviewSession>({
    cards: [],
    currentIndex: 0,
    currentCard: null,
    isFlipped: false,
    isComplete: false,
    totalCards: 0,
    reviewedCount: 0,
    againQueue: [],
  })
  const [loading, setLoading] = useState(true)
  const { reviewCard } = useSpacedRepetition()

  const loadSession = useCallback(async () => {
    setLoading(true)
    const settings = await getSettings()
    const now = Date.now()

    // Get due cards
    let allCards = await db.cards
      .filter((c) => !c.deleted && c.next_review <= now)
      .toArray()

    // Get new cards (never reviewed)
    let newCards = await db.cards
      .filter((c) => !c.deleted && c.repetitions === 0 && c.next_review <= now)
      .toArray()

    // Apply tag filter
    if (filterTags && filterTags.length > 0) {
      allCards = allCards.filter((card) =>
        filterTags.some((ft) =>
          card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
        )
      )
      newCards = newCards.filter((card) =>
        filterTags.some((ft) =>
          card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
        )
      )
    }

    // Limit new cards per day
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayReviews = await db.reviewLogs
      .where('reviewed_at')
      .aboveOrEqual(todayStart.getTime())
      .toArray()

    const newCardsReviewedToday = new Set(
      todayReviews
        .filter((r) => {
          const card = allCards.find((c) => c.id === r.card_id)
          return card && card.repetitions <= 1
        })
        .map((r) => r.card_id)
    )

    const newCardLimit = Math.max(
      0,
      settings.new_cards_per_day - newCardsReviewedToday.size
    )

    // Separate review cards and new cards
    const reviewCards = allCards.filter((c) => c.repetitions > 0)
    const limitedNewCards = newCards.slice(0, newCardLimit)

    // Shuffle and combine
    const sessionCards = [...shuffle(reviewCards), ...shuffle(limitedNewCards)]

    setSession({
      cards: sessionCards,
      currentIndex: 0,
      currentCard: sessionCards[0] ?? null,
      isFlipped: false,
      isComplete: sessionCards.length === 0,
      totalCards: sessionCards.length,
      reviewedCount: 0,
      againQueue: [],
    })
    setLoading(false)
  }, [filterTags])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const flip = () => {
    setSession((s) => ({ ...s, isFlipped: true }))
  }

  const answer = async (quality: number) => {
    if (!session.currentCard) return

    await reviewCard(session.currentCard.id, quality)

    setSession((prev) => {
      const newAgainQueue =
        quality <= 1
          ? [...prev.againQueue, prev.currentCard!]
          : prev.againQueue

      const nextIndex = prev.currentIndex + 1
      const reviewedCount = prev.reviewedCount + 1

      // Check if we still have cards in the main queue
      if (nextIndex < prev.cards.length) {
        return {
          ...prev,
          currentIndex: nextIndex,
          currentCard: prev.cards[nextIndex],
          isFlipped: false,
          reviewedCount,
          againQueue: newAgainQueue,
        }
      }

      // Check "again" queue
      if (newAgainQueue.length > 0) {
        const againCards = [...newAgainQueue]
        return {
          ...prev,
          cards: [...prev.cards, ...againCards],
          currentIndex: nextIndex,
          currentCard: againCards[0],
          isFlipped: false,
          totalCards: prev.totalCards + againCards.length,
          reviewedCount,
          againQueue: [],
        }
      }

      // Session complete
      return {
        ...prev,
        currentCard: null,
        isFlipped: false,
        isComplete: true,
        reviewedCount,
        againQueue: [],
      }
    })
  }

  const dueCount = session.totalCards

  return { session, loading, flip, answer, dueCount, reload: loadSession }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function useDueCount(filterTags?: string[]) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const now = Date.now()
      let dueCards = await db.cards
        .filter((c) => !c.deleted && c.next_review <= now)
        .toArray()

      if (filterTags && filterTags.length > 0) {
        dueCards = dueCards.filter((card) =>
          filterTags.some((ft) =>
            card.tags.some((t) =>
              t.toLowerCase().startsWith(ft.toLowerCase())
            )
          )
        )
      }
      setCount(dueCards.length)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [filterTags])

  return count
}
