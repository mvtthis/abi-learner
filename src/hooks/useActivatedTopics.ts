import { useLiveQuery } from 'dexie-react-hooks'
import { db, activateTopic, deactivateTopic } from '@/lib/db'

export function useActivatedTopics() {
  const activated = useLiveQuery(async () => {
    const topics = await db.activatedTopics.toArray()
    return new Set(topics.map((t) => t.topic))
  })

  return {
    activatedTopics: activated ?? new Set<string>(),
    activateTopic,
    deactivateTopic,
  }
}
