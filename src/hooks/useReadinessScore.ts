import { useMemo } from 'react'
import { useAllCards } from './useCards'
import { calculateAllScores, type FachScore, type TopicScore } from '@/lib/scoreCalculator'

export function useReadinessScore() {
  const cards = useAllCards()

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
