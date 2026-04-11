import { useState, useCallback, useEffect } from 'react'
import { db, type Card, getActivatedTopics, saveSessionSnapshot, getExamDates, getCardFach } from '@/lib/db'
import { useSpacedRepetition } from './useSpacedRepetition'
import { weightedShuffle, shuffle } from '@/lib/leitner'
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
  const examDates = await getExamDates()

  const isInActivatedTopic = (card: Card) =>
    card.tags.some((tag) => {
      const parts = tag.split('::')
      if (parts.length < 2) return activatedTopics.has(parts[0])
      const topicKey = parts.slice(0, 2).join('::')
      return activatedTopics.has(topicKey)
    })

  // Filter out cards for exams that already happened
  const isExamPast = (card: Card) => {
    const fach = getCardFach(card)
    const exam = examDates.get(fach)
    if (!exam) return false
    const examDate = new Date(exam.date)
    examDate.setHours(13, 0, 0, 0)
    return Date.now() >= examDate.getTime()
  }

  const allLogs = await db.reviewLogs.toArray()
  const reviewedCardIds = new Set(allLogs.map((r) => r.card_id))

  // Count wrong answers per card for weighted sorting
  const wrongCounts = new Map<string, number>()
  for (const log of allLogs) {
    if (log.quality <= 1) {
      wrongCounts.set(log.card_id, (wrongCounts.get(log.card_id) ?? 0) + 1)
    }
  }

  let newCards = await db.cards
    .filter((c) => !c.deleted && !reviewedCardIds.has(c.id) && isInActivatedTopic(c) && !isExamPast(c))
    .toArray()

  let reviewCards = await db.cards
    .filter((c) => !c.deleted && reviewedCardIds.has(c.id) && c.next_review <= now && isInActivatedTopic(c) && !isExamPast(c))
    .toArray()

  if (filterTags && filterTags.length > 0) {
    const matchesFilter = (card: Card) =>
      filterTags.some((ft) =>
        card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
      )
    reviewCards = reviewCards.filter(matchesFilter)
    newCards = newCards.filter(matchesFilter)
  }

  return { newCards, reviewCards, wrongCounts }
}

const SESSION_STORAGE_KEY = 'abi-learner-active-session'

function saveSessionToStorage(session: ReviewSession) {
  try {
    const serializable = {
      ...session,
      seenIds: Array.from(session.seenIds),
      progressBefore: {
        overall: session.progressBefore.overall,
        fach: Array.from(session.progressBefore.fach.entries()),
      },
      progressAfter: session.progressAfter ? {
        overall: session.progressAfter.overall,
        fach: Array.from(session.progressAfter.fach.entries()),
      } : null,
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serializable))
  } catch {}
}

function loadSessionFromStorage(): ReviewSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Don't restore completed sessions
    if (parsed.isComplete) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return {
      ...parsed,
      seenIds: new Set(parsed.seenIds),
      progressBefore: {
        overall: parsed.progressBefore.overall,
        fach: new Map(parsed.progressBefore.fach),
      },
      progressAfter: null,
    }
  } catch {
    return null
  }
}

function clearSessionStorage() {
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

export function useReviewSession(filterTags?: string[], intensive?: boolean) {
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
    // Try to restore an active session
    const saved = loadSessionFromStorage()
    if (saved && saved.currentCard) {
      setSession(saved)
      setLoading(false)
      return
    }

    setLoading(true)

    // Snapshot current progress before session (only cards that have been reviewed)
    const allCards = await db.cards.filter((c) => !c.deleted && c.repetitions > 0).toArray()
    const scores = calculateAllScores(allCards)
    const fachBefore = new Map(scores.fachScores.map((f) => [f.fach, f.score]))
    const progressBefore = { overall: scores.overall, fach: fachBefore }

    let sessionCards: Card[]
    let totalAvailable: number

    if (intensive) {
      // Intensive mode: ALL reviewed cards from activated topics, weakest first
      const activatedTopics = await getActivatedTopics()
      const examDates = await getExamDates()

      const isInActivatedTopic = (card: Card) =>
        card.tags.some((tag) => {
          const parts = tag.split('::')
          if (parts.length < 2) return activatedTopics.has(parts[0])
          return activatedTopics.has(parts.slice(0, 2).join('::'))
        })

      const isExamPast = (card: Card) => {
        const fach = getCardFach(card)
        const exam = examDates.get(fach)
        if (!exam) return false
        const examDate = new Date(exam.date)
        examDate.setHours(13, 0, 0, 0)
        return Date.now() >= examDate.getTime()
      }

      const allLogs = await db.reviewLogs.toArray()
      const wrongCounts = new Map<string, number>()
      for (const log of allLogs) {
        if (log.quality <= 1) wrongCounts.set(log.card_id, (wrongCounts.get(log.card_id) ?? 0) + 1)
      }

      let allReviewed = await db.cards
        .filter((c) => !c.deleted && c.repetitions > 0 && isInActivatedTopic(c) && !isExamPast(c))
        .toArray()

      if (filterTags && filterTags.length > 0) {
        allReviewed = allReviewed.filter((card) =>
          filterTags.some((ft) =>
            card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
          )
        )
      }

      const picked = weightedShuffle(allReviewed, wrongCounts).slice(0, SESSION_SIZE)
      sessionCards = shuffle(picked)
      totalAvailable = allReviewed.length
    } else {
      const { newCards, reviewCards, wrongCounts } = await getDueCards(filterTags)

      // STRICT: new cards only until ALL are done. Reviews come AFTER.
      if (newCards.length > 0) {
        const picked = weightedShuffle(newCards, wrongCounts).slice(0, SESSION_SIZE)
        sessionCards = shuffle(picked)
        totalAvailable = newCards.length
      } else {
        const picked = weightedShuffle(reviewCards, wrongCounts).slice(0, SESSION_SIZE)
        sessionCards = shuffle(picked)
        totalAvailable = reviewCards.length
      }
    }
    const remaining = totalAvailable - sessionCards.length
    const sessionsLeft = Math.ceil(remaining / SESSION_SIZE)

    const newSession: ReviewSession = {
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
    }
    setSession(newSession)
    if (!newSession.isComplete) saveSessionToStorage(newSession)
    setLoading(false)
  }, [filterTags, intensive])

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
    const isSessionEnding = session.queue.length === 0

    // Calculate progress after if session is ending
    let progressAfter: { overall: number; fach: Map<string, number> } | null = null
    if (isSessionEnding) {
      const freshCards = await db.cards.filter((c) => !c.deleted && c.repetitions > 0).toArray()
      const freshScores = calculateAllScores(freshCards)
      progressAfter = {
        overall: freshScores.overall,
        fach: new Map(freshScores.fachScores.map((f) => [f.fach, f.score])),
      }

      // Save session snapshot for progress graph (fach + topic level)
      const snapshotScores: Record<string, number> = {}
      for (const fs of freshScores.fachScores) {
        snapshotScores[fs.fach] = fs.score
      }
      // Also save per-topic scores (e.g. sport::trainingslehre)
      for (const [fach, topics] of freshScores.topicScores) {
        for (const t of topics) {
          const topicKey = `${fach}::${t.topic.toLowerCase()}`
          snapshotScores[topicKey] = t.score
        }
      }
      await saveSessionSnapshot(snapshotScores)
    }

    setSession((prev) => {
      const newQueue = [...prev.queue]
      const counted = prev.reviewedCount + 1
      const correctCount = prev.correctCount + (correct ? 1 : 0)
      const newSeenIds = new Set(prev.seenIds)
      if (prev.currentCard) newSeenIds.add(prev.currentCard.id)

      // No reinsertion of wrong cards — they come back next session
      const nextCard = newQueue.shift() ?? null
      const isComplete = nextCard === null

      const updated = {
        ...prev,
        queue: newQueue,
        currentCard: nextCard,
        isFlipped: false,
        isComplete,
        reviewedCount: counted,
        correctCount,
        seenIds: newSeenIds,
        progressAfter: isComplete ? progressAfter : prev.progressAfter,
      }

      // Persist or clear session storage
      if (updated.isComplete) {
        clearSessionStorage()
      } else {
        saveSessionToStorage(updated)
      }

      return updated
    })
  }

  const reload = useCallback(() => {
    clearSessionStorage()
    loadSession()
  }, [loadSession])

  return { session, loading, flip, answer, reload }
}

export function useDueCount(filterTags?: string[]) {
  const [reviewCount, setReviewCount] = useState(0)
  const [newCount, setNewCount] = useState(0)

  const refresh = useCallback(async () => {
    const { newCards, reviewCards } = await getDueCards(filterTags)
    setNewCount(newCards.length)
    setReviewCount(newCards.length > 0 ? 0 : reviewCards.length)
  }, [filterTags])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10000)
    // Also refresh when tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  return { reviewCount, newCount, totalCount: reviewCount + newCount, refresh }
}
