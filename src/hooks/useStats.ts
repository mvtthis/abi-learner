import { useLiveQuery } from 'dexie-react-hooks'
import { db, INACTIVE_NEXT_REVIEW } from '@/lib/db'

export interface DayStat {
  date: string
  total: number
  again: number
  hard: number
  good: number
  easy: number
}

function toLocalDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

    // Group by day (local timezone)
    const dayMap = new Map<string, DayStat>()
    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo)
      d.setDate(d.getDate() + i)
      const key = toLocalDateKey(d.getTime())
      dayMap.set(key, { date: key, total: 0, again: 0, hard: 0, good: 0, easy: 0 })
    }

    for (const r of reviews) {
      const key = toLocalDateKey(r.reviewed_at)
      const day = dayMap.get(key)
      if (!day) continue
      day.total++
      if (r.quality <= 1) day.again++
      else if (r.quality <= 3) day.hard++
      else if (r.quality === 4) day.good++
      else day.easy++
    }

    // Today count
    const todayKey = toLocalDateKey(Date.now())
    const todayDay = dayMap.get(todayKey)
    const todayCount = todayDay?.total ?? 0

    // Streak — fetch all review logs for proper count
    const allReviews = await db.reviewLogs.toArray()
    const reviewDays = new Set(allReviews.map((r) => toLocalDateKey(r.reviewed_at)))

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // If today has reviews, count it and start checking yesterday
    // If today has no reviews yet, start checking from yesterday
    const hasTodayReviews = reviewDays.has(todayKey)
    if (hasTodayReviews) streak = 1

    const startOffset = hasTodayReviews ? 1 : 1
    for (let i = startOffset; i <= 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = toLocalDateKey(d.getTime())
      if (reviewDays.has(key)) {
        streak++
      } else {
        break
      }
    }

    // Forecast: due cards per day for next 7 days (local timezone)
    const allCards = await db.cards.filter((c) => !c.deleted && c.next_review < INACTIVE_NEXT_REVIEW).toArray()
    const forecast: { date: string; count: number }[] = []
    for (let i = 0; i < 7; i++) {
      const dayEnd = new Date()
      dayEnd.setDate(dayEnd.getDate() + i)
      dayEnd.setHours(23, 59, 59, 999)

      const dayStart = new Date(dayEnd)
      dayStart.setHours(0, 0, 0, 0)

      const count = allCards.filter((c) => {
        if (i === 0) return c.next_review <= dayEnd.getTime()
        return c.next_review > dayStart.getTime() && c.next_review <= dayEnd.getTime()
      }).length

      forecast.push({ date: toLocalDateKey(dayEnd.getTime()), count })
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
