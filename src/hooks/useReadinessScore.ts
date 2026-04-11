import { useMemo } from 'react'
import { useAllCards } from './useCards'
import { calculateAllScores, type FachScore, type TopicScore } from '@/lib/scoreCalculator'

export function useReadinessScore() {
  const allCards = useAllCards()

  const scores = useMemo(() => {
    if (allCards.length === 0) {
      return {
        overall: 0,
        fachScores: [] as FachScore[],
        topicScores: new Map<string, TopicScore[]>(),
      }
    }
    // Include ALL cards — score calculation handles level 0 as 0%
    return calculateAllScores(allCards)
  }, [allCards])

  return scores
}
