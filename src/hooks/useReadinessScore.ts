import { useMemo } from 'react'
import { useAllCards } from './useCards'
import { INACTIVE_NEXT_REVIEW } from '@/lib/db'
import { calculateAllScores, type FachScore, type TopicScore } from '@/lib/scoreCalculator'

export function useReadinessScore() {
  const allCards = useAllCards()

  // Only include activated cards (not far-future inactive ones)
  const cards = useMemo(
    () => allCards.filter((c) => c.next_review < INACTIVE_NEXT_REVIEW || c.repetitions > 0),
    [allCards]
  )

  const scores = useMemo(() => {
    if (cards.length === 0) {
      return {
        overall: 0,
        fachScores: [] as FachScore[],
        topicScores: new Map<string, TopicScore[]>(),
      }
    }
    return calculateAllScores(cards)
  }, [cards])

  return scores
}
