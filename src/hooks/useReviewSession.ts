import { useState, useCallback, useEffect } from 'react'
import { db, type Card, getActivatedTopics } from '@/lib/db'
import { useSpacedRepetition } from './useSpacedRepetition'
import { sortForSession, shuffle } from '@/lib/leitner'
import { calculateAllScores, getFach } from '@/lib/scoreCalculator'

const SESSION_SIZE = 20

export interface ReviewSession {
  queue: Card[]
  currentCard: Card | null
  isFlipped: boolean
  isComplete: boolean
  totalCards: number
  reviewedCount: number
  correctCount: number
  seenIds: Set<string>
  /** Total available cards (not just this session) */
  totalAvailable: number
  /** How many sessions are left after this one */
  sessionsLeft: number
  /** Progress snapshot before session started */
  progressBefore: { overall: number; fach: Map<string, number> }
  /** Progress after session (calculated on completion) */
  progressAfter: { overall: number; fach: Map<string, number> } | null
}

/** Shared helper to get all due cards */
async function getDueCards(filterTags?: string[]) {
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
        card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
      )
    reviewCards = reviewCards.filter(matchesFilter)
    newCards = newCards.filter(matchesFilter)
  }

  return { newCards, reviewCards }
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
    totalAvailable: 0,
    sessionsLeft: 0,
    progressBefore: { overall: 0, fach: new Map() },
    progressAfter: null,
  })
  const [loading, setLoading] = useState(true)
  const { reviewCard } = useSpacedRepetition()

  const loadSession = useCallback(async () => {
    setLoading(true)

    // Snapshot current progress before session
    const allCards = await db.cards.filter((c) => !c.deleted).toArray()
    const scores = calculateAllScores(allCards)
    const fachBefore = new Map(scores.fachScores.map((f) => [f.fach, f.score]))
    const progressBefore = { overall: scores.overall, fach: fachBefore }

    const { newCards, reviewCards } = await getDueCards(filterTags)

    // New cards have priority — only mix in reviews when no new cards left
    let sessionCards: Card[]
    if (newCards.length > 0) {
      // Only new cards in this session
      const shuffled = shuffle(newCards)
      sessionCards = shuffled.slice(0, SESSION_SIZE)
    } else {
      // All new cards done — now reviews
      const sorted = sortForSession(reviewCards)
      sessionCards = sorted.slice(0, SESSION_SIZE)
    }

    const totalAvailable = newCards.length + reviewCards.length
    const remaining = totalAvailable - sessionCards.length
    const sessionsLeft = Math.ceil(remaining / SESSION_SIZE)

    setSession({
      queue: sessionCards.slice(1),
      currentCard: sessionCards[0] ?? null,
      isFlipped: false,
      isComplete: sessionCards.length === 0,
      totalCards: sessionCards.length,
      reviewedCount: 0,
      correctCount: 0,
      seenIds: new Set(),
      totalAvailable,
      sessionsLeft,
      progressBefore,
      progressAfter: null,
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

    await reviewCard(session.currentCard.id, correct)

    const reviewedCount = session.reviewedCount + 1
    const isLastAnswer = reviewedCount >= session.totalCards

    // Calculate progress after if session is ending
    let progressAfter: { overall: number; fach: Map<string, number> } | null = null
    if (isLastAnswer || (session.queue.length === 0 && correct)) {
      const freshCards = await db.cards.filter((c) => !c.deleted).toArray()
      const freshScores = calculateAllScores(freshCards)
      progressAfter = {
        overall: freshScores.overall,
        fach: new Map(freshScores.fachScores.map((f) => [f.fach, f.score])),
      }
    }

    setSession((prev) => {
      const newQueue = [...prev.queue]
      const counted = prev.reviewedCount + 1
      const correctCount = prev.correctCount + (correct ? 1 : 0)
      const newSeenIds = new Set(prev.seenIds)
      if (prev.currentCard) newSeenIds.add(prev.currentCard.id)

      // No reinsertion of wrong cards — they come back next session
      const nextCard = newQueue.shift() ?? null

      return {
        ...prev,
        queue: newQueue,
        currentCard: nextCard,
        isFlipped: false,
        isComplete: nextCard === null,
        reviewedCount: counted,
        correctCount,
        seenIds: newSeenIds,
        progressAfter: nextCard === null ? progressAfter : prev.progressAfter,
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
      const { newCards, reviewCards } = await getDueCards(filterTags)
      setReviewCount(reviewCards.length)
      setNewCount(newCards.length)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [filterTags])

  return { reviewCount, newCount, totalCount: reviewCount + newCount }
}
