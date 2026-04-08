import type { Card } from './db'

export interface FachScore {
  fach: string
  score: number
  totalCards: number
  reviewedCards: number
  masteredCards: number
}

export interface TopicScore {
  topic: string
  score: number
  totalCards: number
  masteredCards: number
}

const FACH_MAP: Record<string, string> = {
  bio: 'Biologie',
  geschichte: 'Geschichte',
  sport: 'Sport',
  deutsch: 'Deutsch',
  englisch: 'Englisch',
}

export function getFach(tags: string[]): string {
  for (const tag of tags) {
    const prefix = tag.split('::')[0].toLowerCase()
    if (FACH_MAP[prefix]) return prefix
  }
  return 'sonstige'
}

export function getFachLabel(fach: string): string {
  return FACH_MAP[fach] ?? 'Sonstige'
}

/**
 * Card mastery based on Leitner level (stored in repetitions field).
 * Level 0 = 0%, Level 1 = 33%, Level 2 = 66%, Level 3+ = 100%
 * 100% = 3x hintereinander richtig beantwortet.
 */
export function getCardMastery(card: Card): number {
  const level = card.repetitions
  if (level <= 0) return 0
  if (level === 1) return 33
  if (level === 2) return 66
  return 100 // level 3+
}

export function isCardMastered(card: Card): boolean {
  return card.repetitions >= 3
}

export function calculateFachScore(cards: Card[]): FachScore | null {
  const activeCards = cards.filter((c) => !c.deleted)
  if (activeCards.length === 0) return null

  const fach = getFach(activeCards[0].tags)
  const reviewedCards = activeCards.filter((c) => c.repetitions > 0)
  const masteredCards = activeCards.filter((c) => isCardMastered(c))

  const score =
    activeCards.reduce((sum, c) => sum + getCardMastery(c), 0) /
    activeCards.length

  return {
    fach,
    score: Math.round(score),
    totalCards: activeCards.length,
    reviewedCards: reviewedCards.length,
    masteredCards: masteredCards.length,
  }
}

export function calculateAllScores(cards: Card[]): {
  overall: number
  fachScores: FachScore[]
  topicScores: Map<string, TopicScore[]>
} {
  const activeCards = cards.filter((c) => !c.deleted)

  const fachGroups = new Map<string, Card[]>()
  for (const card of activeCards) {
    const fach = getFach(card.tags)
    const group = fachGroups.get(fach) ?? []
    group.push(card)
    fachGroups.set(fach, group)
  }

  const fachScores: FachScore[] = []
  for (const [, group] of fachGroups) {
    const score = calculateFachScore(group)
    if (score) fachScores.push(score)
  }

  const totalCards = fachScores.reduce((s, f) => s + f.totalCards, 0)
  const overall =
    totalCards > 0
      ? Math.round(
          fachScores.reduce(
            (s, f) => s + f.score * (f.totalCards / totalCards),
            0
          )
        )
      : 0

  const topicScores = new Map<string, TopicScore[]>()
  for (const [fach, group] of fachGroups) {
    const topicGroups = new Map<string, Card[]>()
    for (const card of group) {
      const tag = card.tags.find((t) =>
        t.toLowerCase().startsWith(fach + '::')
      )
      const topic = tag
        ? tag.split('::').slice(0, 2).join('::')
        : fach + '::allgemein'
      const tg = topicGroups.get(topic) ?? []
      tg.push(card)
      topicGroups.set(topic, tg)
    }

    const topics: TopicScore[] = []
    for (const [topic, topicCards] of topicGroups) {
      const s = calculateFachScore(topicCards)
      if (s) {
        topics.push({
          topic: topic.split('::').pop() ?? topic,
          score: s.score,
          totalCards: s.totalCards,
          masteredCards: s.masteredCards,
        })
      }
    }
    topics.sort((a, b) => a.score - b.score)
    topicScores.set(fach, topics)
  }

  return { overall, fachScores, topicScores }
}
