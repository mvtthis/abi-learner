import type { DayStat } from '@/hooks/useStats'

interface StatsChartProps {
  days: DayStat[]
}

export function StatsChart({ days }: StatsChartProps) {
  const maxTotal = Math.max(...days.map((d) => d.total), 1)

  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {days.map((day) => {
        const height = (day.total / maxTotal) * 100
        const againPct = day.total > 0 ? (day.again / day.total) * 100 : 0
        const hardPct = day.total > 0 ? (day.hard / day.total) * 100 : 0
        const goodPct = day.total > 0 ? (day.good / day.total) * 100 : 0
        const easyPct = day.total > 0 ? (day.easy / day.total) * 100 : 0

        const isToday =
          day.date === new Date().toISOString().slice(0, 10)

        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className="w-full rounded-t-sm overflow-hidden flex flex-col-reverse"
              style={{ height: `${Math.max(height, 2)}%` }}
            >
              {day.total > 0 ? (
                <>
                  <div
                    className="bg-red-500"
                    style={{ height: `${againPct}%` }}
                  />
                  <div
                    className="bg-orange-500"
                    style={{ height: `${hardPct}%` }}
                  />
                  <div
                    className="bg-emerald-500"
                    style={{ height: `${goodPct}%` }}
                  />
                  <div
                    className="bg-blue-500"
                    style={{ height: `${easyPct}%` }}
                  />
                </>
              ) : (
                <div className="bg-zinc-800 w-full h-full" />
              )}
            </div>
            <span
              className={`text-[9px] ${
                isToday ? 'text-blue-400 font-medium' : 'text-zinc-600'
              }`}
            >
              {new Date(day.date).getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
