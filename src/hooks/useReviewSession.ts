import { useState, useCallback, useEffect } from 'react'
import { db, type Card, INACTIVE_NEXT_REVIEW, getActivatedTopics } from '@/lib/db'
import { useSpacedRepetition } from './useSpacedRepetition'
import { sortForSession, shuffle, REAPPEAR_GAP } from '@/lib/leitner'

export interface ReviewSession {
  queue: Card[]
  currentCard: Card | null
  isFlipped: boolean
  isComplete: boolean
  totalCards: number
  reviewedCount: number
  correctCount: number
  seenIds: Set<string>
}

export function useReviewSession(filterTags?: string[]) {
  const [session, setSession] = useState<ReviewSession>({
    queue: [],
    currentCard: null,
    isFlipped: false,
    isComplete: false,
    totalCards: 0,
    reviewedCount: 0,
    correctCount: 0,
    seenIds: new Set(),
  })
  const [loading, setLoading] = useState(true)
  const { reviewCard } = useSpacedRepetition()

  const loadSession = useCallback(async () => {
    setLoading(true)
    const now = Date.now()
    const activatedTopics = await getActivatedTopics()

    const isInActivatedTopic = (card: Card) =>
      card.tags.some((tag) => {
        const parts = tag.split('::')
        if (parts.length < 2) return activatedTopics.has(parts[0])
        const topicKey = parts.slice(0, 2).join('::')
        return activatedTopics.has(topicKey)
      })

    // Due review cards (already in algorithm, next_review reached)
    const reviewCards = await db.cards
      .filter((c) => !c.deleted && c.repetitions > 0 && c.next_review <= now)
      .toArray()

    // New cards from activated topics (never reviewed)
    const newCards = await db.cards
      .filter((c) => !c.deleted && c.repetitions === 0 && isInActivatedTopic(c))
      .toArray()

    let filteredNew = [...newCards]
    let filteredReview = [...reviewCards]

    // Apply tag filter
    if (filterTags && filterTags.length > 0) {
      const matchesFilter = (card: Card) =>
        filterTags.some((ft) =>
          card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
        )
      filteredNew = filteredNew.filter(matchesFilter)
      filteredReview = filteredReview.filter(matchesFilter)
    }

    // New cards first (shuffled), then review cards (sorted by level)
    const sorted = [...shuffle(filteredNew), ...sortForSession(filteredReview)]

    setSession({
      queue: sorted.slice(1),
      currentCard: sorted[0] ?? null,
      isFlipped: false,
      isComplete: sorted.length === 0,
      totalCards: sorted.length,
      reviewedCount: 0,
      correctCount: 0,
      seenIds: new Set(),
    })
    setLoading(false)
  }, [filterTags])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const flip = () => {
    setSession((s) => ({ ...s, isFlipped: !s.isFlipped }))
  }

  const answer = async (correct: boolean) => {
    if (!session.currentCard) return

    const result = await reviewCard(session.currentCard.id, correct)

    setSession((prev) => {
      const newQueue = [...prev.queue]
      const reviewedCount = prev.reviewedCount + 1
      const correctCount = prev.correctCount + (correct ? 1 : 0)
      const newSeenIds = new Set(prev.seenIds)
      if (prev.currentCard) newSeenIds.add(prev.currentCard.id)

      // If wrong, reinsert after all unseen cards
      if (!correct && prev.currentCard) {
        const firstSeenIndex = newQueue.findIndex((c) => newSeenIds.has(c.id))
        const insertAt = firstSeenIndex === -1 ? newQueue.length : firstSeenIndex
        newQueue.splice(insertAt, 0, prev.currentCard)
      }

      const nextCard = newQueue.shift() ?? null

      return {
        queue: newQueue,
        currentCard: nextCard,
        isFlipped: false,
        isComplete: nextCard === null,
        totalCards: prev.totalCards,
        reviewedCount,
        correctCount,
        seenIds: newSeenIds,
      }
    })
  }

  return { session, loading, flip, answer, reload: loadSession }
}

export function useDueCount(filterTags?: string[]) {
  const [reviewCount, setReviewCount] = useState(0)
  const [newCount, setNewCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const now = Date.now()
      const activatedTopics = await getActivatedTopics()

      const isInActivatedTopic = (card: Card) =>
        card.tags.some((tag) => {
          const parts = tag.split('::')
          if (parts.length < 2) return activatedTopics.has(parts[0])
          const topicKey = parts.slice(0, 2).join('::')
          return activatedTopics.has(topicKey)
        })

      let reviewCards = await db.cards
        .filter((c) => !c.deleted && c.repetitions > 0 && c.next_review <= now)
        .toArray()

      let newCards = await db.cards
        .filter((c) => !c.deleted && c.repetitions === 0 && isInActivatedTopic(c))
        .toArray()

      if (filterTags && filterTags.length > 0) {
        const matchesFilter = (card: Card) =>
          filterTags.some((ft) =>
            card.tags.some((t) =>
              t.toLowerCase().startsWith(ft.toLowerCase())
            )
          )
        reviewCards = reviewCards.filter(matchesFilter)
        newCards = newCards.filter(matchesFilter)
      }

      setReviewCount(reviewCards.length)
      setNewCount(newCards.length)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [filterTags])

  return { reviewCount, newCount, totalCount: reviewCount + newCount }
}
