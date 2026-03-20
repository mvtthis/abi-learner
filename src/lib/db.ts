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
  repetitions: number
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

class AbiLearnerDB extends Dexie {
  cards!: Table<Card>
  reviewLogs!: Table<ReviewLog>
  syncMeta!: Table<SyncMeta>
  appSettings!: Table<AppSettings>

  constructor() {
    super('abi-learner')
    this.version(1).stores({
      cards: 'id, next_review, sync_status, *tags, updated_at, deleted',
      reviewLogs: 'id, card_id, reviewed_at, sync_status',
      syncMeta: 'id',
      appSettings: 'id',
    })
  }
}

export const db = new AbiLearnerDB()

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
