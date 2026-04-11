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
  const chartHeight = 80
  const barWidth = 8
  const gap = 14
  const totalWidth = days.length * (barWidth + gap)

  return (
    <svg viewBox={`0 0 ${totalWidth} ${chartHeight + 18}`} className="w-full" style={{ maxHeight: '120px' }}>
      {days.map((day, i) => {
        const barHeight = day.total > 0
          ? Math.max((day.total / maxTotal) * chartHeight, 4)
          : 0
        const correctRatio = day.total > 0 ? (day.good + day.easy) / day.total : 0
        const correctHeight = barHeight * correctRatio
        const wrongHeight = barHeight - correctHeight
        const x = i * (barWidth + gap) + gap / 2
        const isToday = day.date === today

        return (
          <g key={day.date}>
            {/* Empty day dot */}
            {day.total === 0 && (
              <rect
                x={x + barWidth / 2 - 1.5} y={chartHeight - 1.5}
                width={3} height={3}
                rx={1.5} fill="#3f3f46"
              />
            )}
            {/* Correct (green) bottom portion */}
            {correctHeight > 0 && (
              <rect
                x={x} y={chartHeight - correctHeight}
                width={barWidth} height={correctHeight}
                rx={barWidth / 2}
                fill="#22c55e" opacity={0.8}
              />
            )}
            {/* Wrong (red) stacked on top */}
            {wrongHeight > 0 && (
              <rect
                x={x} y={chartHeight - barHeight}
                width={barWidth} height={wrongHeight}
                rx={barWidth / 2}
                fill="#ef4444" opacity={0.7}
              />
            )}
            {/* Day label */}
            <text
              x={x + barWidth / 2} y={chartHeight + 13}
              textAnchor="middle"
              fill={isToday ? '#3b82f6' : '#52525b'}
              fontSize="7"
              fontWeight={isToday ? 'bold' : 'normal'}
            >
              {new Date(day.date + 'T12:00:00').getDate()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
