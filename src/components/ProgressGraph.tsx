import { useLiveQuery } from 'dexie-react-hooks'
import { db, type SessionSnapshot } from '@/lib/db'
import { getFachLabel } from '@/lib/scoreCalculator'

const FACH_COLORS: Record<string, string> = {
  bio: '#22c55e',
  geschichte: '#f59e0b',
  sport: '#3b82f6',
  deutsch: '#a855f7',
  englisch: '#ef4444',
}

export function ProgressGraph() {
  const snapshots = useLiveQuery(() =>
    db.sessionSnapshots.orderBy('sessionNumber').toArray()
  )

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-500 text-sm">
          Noch keine Sessions abgeschlossen. Starte eine Session um deinen Fortschritt zu tracken.
        </p>
      </div>
    )
  }

  // Collect all fächer that appear in any snapshot
  const allFaecher = new Set<string>()
  for (const s of snapshots) {
    for (const fach of Object.keys(s.topicScores)) {
      allFaecher.add(fach)
    }
  }

  // Build data points: for each fach, carry forward last known value
  const fachLines = new Map<string, number[]>()
  for (const fach of allFaecher) {
    const points: number[] = []
    let lastValue = 0
    for (const s of snapshots) {
      if (s.topicScores[fach] !== undefined) {
        lastValue = s.topicScores[fach]
      }
      points.push(lastValue)
    }
    fachLines.set(fach, points)
  }

  const maxSessions = snapshots.length
  const graphWidth = 300
  const graphHeight = 160
  const paddingLeft = 30
  const paddingRight = 10
  const paddingTop = 10
  const paddingBottom = 20
  const plotWidth = graphWidth - paddingLeft - paddingRight
  const plotHeight = graphHeight - paddingTop - paddingBottom

  const xStep = maxSessions > 1 ? plotWidth / (maxSessions - 1) : plotWidth

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        className="w-full"
        style={{ maxHeight: '200px' }}
      >
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = paddingTop + plotHeight - (v / 100) * plotHeight
          return (
            <g key={v}>
              <line
                x1={paddingLeft}
                x2={graphWidth - paddingRight}
                y1={y}
                y2={y}
                stroke="#27272a"
                strokeWidth="0.5"
              />
              <text x={paddingLeft - 4} y={y + 3} textAnchor="end" fill="#52525b" fontSize="7">
                {v}%
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {snapshots.map((s, i) => {
          const x = paddingLeft + (maxSessions > 1 ? i * xStep : plotWidth / 2)
          return (
            <text
              key={s.id}
              x={x}
              y={graphHeight - 4}
              textAnchor="middle"
              fill="#52525b"
              fontSize="6"
            >
              {s.sessionNumber}
            </text>
          )
        })}

        {/* Lines per fach */}
        {Array.from(fachLines.entries()).map(([fach, points]) => {
          const color = FACH_COLORS[fach] ?? '#71717a'

          if (points.length === 1) {
            const x = paddingLeft + plotWidth / 2
            const y = paddingTop + plotHeight - (points[0] / 100) * plotHeight
            return (
              <circle key={fach} cx={x} cy={y} r="3" fill={color} />
            )
          }

          const pathData = points
            .map((v, i) => {
              const x = paddingLeft + i * xStep
              const y = paddingTop + plotHeight - (v / 100) * plotHeight
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            })
            .join(' ')

          return (
            <g key={fach}>
              <path d={pathData} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
              {points.map((v, i) => {
                const x = paddingLeft + i * xStep
                const y = paddingTop + plotHeight - (v / 100) * plotHeight
                return <circle key={i} cx={x} cy={y} r="2" fill={color} />
              })}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {Array.from(fachLines.entries()).map(([fach, points]) => {
          const color = FACH_COLORS[fach] ?? '#71717a'
          const current = points[points.length - 1]
          return (
            <div key={fach} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-zinc-400">
                {getFachLabel(fach)} {current}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
