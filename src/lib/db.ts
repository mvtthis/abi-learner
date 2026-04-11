import Dexie, { type Table } from 'dexie'

export interface Card {
  id: string
  front: string
  back: string
  tags: string[]
  created_at: number
  updated_at: number
  deleted: boolean
  ease_factor: number
  interval: number
  repetitions: number // used as "level" in Leitner (0-5)
  next_review: number
  sync_status: 'pending' | 'synced'
}

export interface ReviewLog {
  id: string
  card_id: string
  reviewed_at: number
  quality: number
  interval: number
  ease_factor: number
  sync_status: 'pending' | 'synced'
}

export interface SyncMeta {
  id: string
  last_sync_timestamp: string
}

export interface AppSettings {
  id: string
  new_cards_per_day: number
  theme: 'dark' | 'light'
  onboarding_complete: boolean
}

export interface ActivatedTopic {
  topic: string
  activated_at: number
}

export interface ExamDate {
  fach: string // e.g. "bio", "geschichte"
  date: string // ISO date string e.g. "2026-04-10"
}

export interface SessionSnapshot {
  id: string // auto-generated
  timestamp: number
  sessionNumber: number
  /** Topic scores at end of session: topic key → percentage */
  topicScores: Record<string, number>
}

// Far-future timestamp for inactive cards (year 2100)
export const INACTIVE_NEXT_REVIEW = new Date('2100-01-01').getTime()

class AbiLearnerDB extends Dexie {
  cards!: Table<Card>
  reviewLogs!: Table<ReviewLog>
  syncMeta!: Table<SyncMeta>
  appSettings!: Table<AppSettings>
  activatedTopics!: Table<ActivatedTopic>
  examDates!: Table<ExamDate>
  sessionSnapshots!: Table<SessionSnapshot>

  constructor() {
    super('abi-learner')
    this.version(1).stores({
      cards: 'id, next_review, sync_status, *tags, updated_at, deleted',
      reviewLogs: 'id, card_id, reviewed_at, sync_status',
      syncMeta: 'id',
      appSettings: 'id',
    })
    this.version(2).stores({
      cards: 'id, next_review, sync_status, *tags, updated_at, deleted',
      reviewLogs: 'id, card_id, reviewed_at, sync_status',
      syncMeta: 'id',
      appSettings: 'id',
      activatedTopics: 'topic',
    }).upgrade(async (tx) => {
      const cards = tx.table('cards')
      await cards.toCollection().modify((card: Card) => {
        if (card.repetitions === 0 && !card.deleted) {
          card.next_review = INACTIVE_NEXT_REVIEW
        }
      })
    })
    this.version(3).stores({
      cards: 'id, next_review, sync_status, *tags, updated_at, deleted',
      reviewLogs: 'id, card_id, reviewed_at, sync_status',
      syncMeta: 'id',
      appSettings: 'id',
      activatedTopics: 'topic',
      examDates: 'fach',
    })
    this.version(4).stores({
      cards: 'id, next_review, sync_status, *tags, updated_at, deleted',
      reviewLogs: 'id, card_id, reviewed_at, sync_status',
      syncMeta: 'id',
      appSettings: 'id',
      activatedTopics: 'topic',
      examDates: 'fach',
      sessionSnapshots: 'id, timestamp, sessionNumber',
    })
  }
}

export const db = new AbiLearnerDB()

// Seed default exam dates on first load
async function seedExamDates() {
  const count = await db.examDates.count()
  if (count > 0) return

  const defaults: ExamDate[] = [
    { fach: 'geschichte', date: '2026-04-10' },
    { fach: 'sport', date: '2026-04-14' },
    { fach: 'bio', date: '2026-04-22' },
    { fach: 'deutsch', date: '2026-04-28' },
    { fach: 'englisch', date: '2026-05-20' },
  ]
  await db.examDates.bulkPut(defaults)
}
seedExamDates()

export async function getExamDates(): Promise<Map<string, ExamDate>> {
  const dates = await db.examDates.toArray()
  return new Map(dates.map((d) => [d.fach, d]))
}

export async function getExamDateForFach(fach: string): Promise<ExamDate | undefined> {
  return db.examDates.get(fach)
}

export async function setExamDate(fach: string, date: string): Promise<void> {
  await db.examDates.put({ fach, date })
}

export async function getDaysUntilExam(fach: string): Promise<number | null> {
  const exam = await db.examDates.get(fach)
  if (!exam) return null
  const examDate = new Date(exam.date)
  examDate.setHours(23, 59, 59, 999)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((examDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await db.appSettings.get('main')
  return settings ?? {
    id: 'main',
    new_cards_per_day: 20,
    theme: 'dark',
    onboarding_complete: false,
  }
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const settings = await getSettings()
  settings[key] = value
  await db.appSettings.put(settings)
}

/**
 * Get the topic key (first 2 levels) for a card, e.g. "Bio::Genetik"
 */
export function getCardTopic(card: Card): string {
  for (const tag of card.tags) {
    const parts = tag.split('::')
    if (parts.length >= 2) return parts.slice(0, 2).join('::')
    return parts[0]
  }
  return ''
}

/**
 * Get the fach (subject) from a card's tags, e.g. "bio"
 */
export function getCardFach(card: Card): string {
  for (const tag of card.tags) {
    return tag.split('::')[0].toLowerCase()
  }
  return ''
}

export async function getActivatedTopics(): Promise<Set<string>> {
  const topics = await db.activatedTopics.toArray()
  return new Set(topics.map((t) => t.topic))
}

export async function activateTopic(topic: string): Promise<void> {
  await db.activatedTopics.put({ topic, activated_at: Date.now() })
}

export async function deactivateTopic(topic: string): Promise<void> {
  await db.activatedTopics.delete(topic)

  const topicLower = topic.toLowerCase()
  const cards = await db.cards
    .filter(
      (c) =>
        !c.deleted &&
        c.repetitions === 0 &&
        c.tags.some((t) => t.toLowerCase().startsWith(topicLower))
    )
    .toArray()

  const now = Date.now()
  await db.cards.bulkUpdate(
    cards.map((c) => ({
      key: c.id,
      changes: { next_review: INACTIVE_NEXT_REVIEW, updated_at: now, sync_status: 'pending' as const },
    }))
  )
}

export async function isTopicActivated(topic: string): Promise<boolean> {
  const entry = await db.activatedTopics.get(topic)
  return !!entry
}

export async function saveSessionSnapshot(topicScores: Record<string, number>): Promise<void> {
  const lastSnapshot = await db.sessionSnapshots.orderBy('sessionNumber').last()
  const sessionNumber = (lastSnapshot?.sessionNumber ?? 0) + 1

  await db.sessionSnapshots.put({
    id: `session-${sessionNumber}`,
    timestamp: Date.now(),
    sessionNumber,
    topicScores,
  })
}

export async function getSessionSnapshots(): Promise<SessionSnapshot[]> {
  return db.sessionSnapshots.orderBy('sessionNumber').toArray()
}

/** If snapshots are empty or missing topic-level data, reseed from current state */
export async function seedInitialSnapshot(): Promise<void> {
  try {
    const snapshots = await db.sessionSnapshots.toArray()

    const hasTopicData = snapshots.some((s) =>
      Object.keys(s.topicScores).some((k) => k.includes('::'))
    )

    if (snapshots.length > 0 && hasTopicData) return

    // Clear old fach-only snapshots
    if (snapshots.length > 0) {
      await db.sessionSnapshots.clear()
    }

    const reviewCount = await db.reviewLogs.count()
    if (reviewCount === 0) return

    const { calculateAllScores } = await import('./scoreCalculator')
    const allCards = await db.cards.filter((c) => !c.deleted).toArray()
    if (allCards.length === 0) return

    const scores = calculateAllScores(allCards)

    const topicScores: Record<string, number> = {}
    for (const fs of scores.fachScores) {
      topicScores[fs.fach] = fs.score
    }
    for (const [fach, topics] of scores.topicScores) {
      for (const t of topics) {
        topicScores[`${fach}::${t.topic.toLowerCase()}`] = t.score
      }
    }

    if (Object.keys(topicScores).length > 0) {
      await saveSessionSnapshot(topicScores)
      console.log('Seeded initial snapshot with', Object.keys(topicScores).length, 'scores')
    }
  } catch (err) {
    console.error('Failed to seed initial snapshot:', err)
  }
}
