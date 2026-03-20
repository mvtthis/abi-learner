import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

export interface DayStat {
  date: string
  total: number
  again: number
  hard: number
  good: number
  easy: number
}

export function useStats() {
  const stats = useLiveQuery(async () => {
    const now = new Date()
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    const reviews = await db.reviewLogs
      .where('reviewed_at')
      .aboveOrEqual(fourteenDaysAgo.getTime())
      .toArray()

    // Group by day
    const dayMap = new Map<string, DayStat>()
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      dayMap.set(key, { date: key, total: 0, again: 0, hard: 0, good: 0, easy: 0 })
    }

    for (const r of reviews) {
      const key = new Date(r.reviewed_at).toISOString().slice(0, 10)
      const day = dayMap.get(key)
      if (!day) continue
      day.total++
      if (r.quality <= 1) day.again++
      else if (r.quality <= 3) day.hard++
      else if (r.quality === 4) day.good++
      else day.easy++
    }

    // Today count
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayCount = reviews.filter(
      (r) => r.reviewed_at >= todayStart.getTime()
    ).length

    // Streak
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const day = dayMap.get(key)
      if (i === 0 && (!day || day.total === 0)) continue // Today might not be done yet
      if (day && day.total > 0) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    // Check if today also has reviews for accurate streak
    const todayKey = today.toISOString().slice(0, 10)
    const todayDay = dayMap.get(todayKey)
    if (todayDay && todayDay.total > 0) {
      // Today counts, streak already incremented
    }

    // Forecast: due cards per day for next 7 days
    const allCards = await db.cards.filter((c) => !c.deleted).toArray()
    const forecast: { date: string; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      d.setHours(23, 59, 59, 999)
      const dayStart = new Date(d)
      dayStart.setHours(0, 0, 0, 0)

      const count = allCards.filter((c) => {
        if (i === 0) return c.next_review <= d.getTime()
        return (
          c.next_review > dayStart.getTime() && c.next_review <= d.getTime()
        )
      }).length
      forecast.push({ date: d.toISOString().slice(0, 10), count })
    }

    return {
      days: Array.from(dayMap.values()),
      todayCount,
      streak,
      forecast,
    }
  })

  return stats ?? { days: [], todayCount: 0, streak: 0, forecast: [] }
}
