import type { DayStat } from '@/hooks/useStats'

interface StatsChartProps {
  days: DayStat[]
}

function toLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function StatsChart({ days }: StatsChartProps) {
  const maxTotal = Math.max(...days.map((d) => d.total), 1)
  const today = toLocalDateKey(new Date())

  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {days.map((day) => {
        const heightPct = (day.total / maxTotal) * 100
        const correctPct = day.total > 0 ? ((day.good + day.easy) / day.total) * 100 : 0
        const wrongPct = day.total > 0 ? 100 - correctPct : 0
        const isToday = day.date === today

        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full rounded-t-sm overflow-hidden"
              style={{ height: `${Math.max(heightPct, day.total > 0 ? 10 : 2)}%` }}
            >
              {day.total > 0 ? (
                <div className="w-full h-full flex flex-col">
                  <div className="w-full bg-emerald-500" style={{ height: `${correctPct}%` }} />
                  <div className="w-full bg-red-500 flex-1" />
                </div>
              ) : (
                <div className="bg-zinc-800 w-full h-full" />
              )}
            </div>
            <span
              className={`text-[9px] ${
                isToday ? 'text-blue-400 font-medium' : 'text-zinc-600'
              }`}
            >
              {new Date(day.date + 'T12:00:00').getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
