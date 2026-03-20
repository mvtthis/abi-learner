import type { Card } from './db'

export interface FachScore {
  fach: string
  score: number
  deckCoverage: number
  masteryScore: number
  recencyScore: number
  totalCards: number
  reviewedCards: number
}

export interface TopicScore {
  topic: string
  score: number
  totalCards: number
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

export function getCardMastery(card: Card): number {
  if (card.repetitions === 0) return 0
  if (card.repetitions === 1 && card.interval <= 1) return 20
  if (card.repetitions === 2 && card.interval <= 3) return 40
  if (card.repetitions >= 3 && card.interval <= 7) return 60
  if (card.repetitions >= 3 && card.interval <= 14) return 80
  if (card.repetitions >= 3 && card.interval > 14) return 100
  // Fallback based on interval
  if (card.interval <= 1) return 20
  if (card.interval <= 3) return 40
  if (card.interval <= 7) return 60
  if (card.interval <= 14) return 80
  return 100
}

export function getRecencyScore(card: Card): number {
  const now = Date.now()
  if (card.next_review < now) return 0 // overdue
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (card.next_review <= today.getTime()) return 50 // due today
  return 100 // future
}

export function calculateFachScore(cards: Card[]): FachScore | null {
  if (cards.length === 0) return null
  const activeCards = cards.filter((c) => !c.deleted)
  if (activeCards.length === 0) return null

  const fach = getFach(activeCards[0].tags)
  const reviewedCards = activeCards.filter((c) => c.repetitions > 0)

  const deckCoverage = reviewedCards.length / activeCards.length

  const masteryScore =
    activeCards.reduce((sum, c) => sum + getCardMastery(c), 0) /
    activeCards.length /
    100

  const recencyScore =
    activeCards.reduce((sum, c) => sum + getRecencyScore(c), 0) /
    activeCards.length /
    100

  const score = deckCoverage * 0.3 + masteryScore * 0.5 + recencyScore * 0.2

  return {
    fach,
    score: Math.round(score * 100),
    deckCoverage: Math.round(deckCoverage * 100),
    masteryScore: Math.round(masteryScore * 100),
    recencyScore: Math.round(recencyScore * 100),
    totalCards: activeCards.length,
    reviewedCards: reviewedCards.length,
  }
}

export function calculateAllScores(cards: Card[]): {
  overall: number
  fachScores: FachScore[]
  topicScores: Map<string, TopicScore[]>
} {
  const activeCards = cards.filter((c) => !c.deleted)

  // Group by fach
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

  // Overall = weighted average by card count
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

  // Topic scores per fach
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
    for (const [topic, cards] of topicGroups) {
      const s = calculateFachScore(cards)
      if (s) {
        topics.push({
          topic: topic.split('::').pop() ?? topic,
          score: s.score,
          totalCards: s.totalCards,
        })
      }
    }
    topics.sort((a, b) => a.score - b.score)
    topicScores.set(fach, topics)
  }

  return { overall, fachScores, topicScores }
}
