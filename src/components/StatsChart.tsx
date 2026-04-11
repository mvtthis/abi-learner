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
  const chartHeight = 100
  const barWidth = 18
  const gap = 4
  const totalWidth = days.length * (barWidth + gap)

  return (
    <svg viewBox={`0 0 ${totalWidth} ${chartHeight + 16}`} className="w-full" style={{ maxHeight: '140px' }}>
      {days.map((day, i) => {
        const barHeight = day.total > 0
          ? Math.max((day.total / maxTotal) * chartHeight, 6)
          : 0
        const correctRatio = day.total > 0 ? (day.good + day.easy) / day.total : 0
        const correctHeight = barHeight * correctRatio
        const wrongHeight = barHeight - correctHeight
        const x = i * (barWidth + gap) + gap / 2
        const isToday = day.date === today

        return (
          <g key={day.date}>
            {/* Empty day placeholder */}
            {day.total === 0 && (
              <rect
                x={x} y={chartHeight - 2}
                width={barWidth} height={2}
                rx={1} fill="#27272a"
              />
            )}
            {/* Correct (green) bottom portion */}
            {correctHeight > 0 && (
              <rect
                x={x} y={chartHeight - correctHeight}
                width={barWidth} height={correctHeight}
                rx={2}
                fill="#22c55e" opacity={0.8}
              />
            )}
            {/* Wrong (red) stacked on top */}
            {wrongHeight > 0 && (
              <rect
                x={x} y={chartHeight - barHeight}
                width={barWidth} height={wrongHeight}
                rx={2}
                fill="#ef4444" opacity={0.7}
              />
            )}
            {/* Day label */}
            <text
              x={x + barWidth / 2} y={chartHeight + 12}
              textAnchor="middle"
              fill={isToday ? '#3b82f6' : '#52525b'}
              fontSize="8"
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
