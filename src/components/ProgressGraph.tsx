import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { getFachLabel } from '@/lib/scoreCalculator'

const FACH_ORDER = ['sport', 'bio', 'geschichte', 'deutsch', 'englisch']

const TOPIC_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#8b5cf6',
  '#84cc16', '#e11d48',
]

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function ProgressGraph() {
  const [selectedFach, setSelectedFach] = useState<string | null>(null)

  const snapshots = useLiveQuery(() =>
    db.sessionSnapshots.orderBy('sessionNumber').toArray()
  )

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-500 text-sm">
          Noch keine Sessions abgeschlossen.
        </p>
      </div>
    )
  }

  // Find available fächer
  const availableFaecher = new Set<string>()
  for (const s of snapshots) {
    for (const key of Object.keys(s.topicScores)) {
      if (!key.includes('::')) availableFaecher.add(key)
    }
  }

  const fach = selectedFach ?? Array.from(availableFaecher)[0] ?? null
  if (!fach) return null

  // Determine what lines to show
  let lineKeys: string[]
  let lineLabels: Map<string, string>

  if (fach === '_all') {
    // All fächer as lines
    lineKeys = Array.from(availableFaecher).sort((a, b) =>
      FACH_ORDER.indexOf(a) - FACH_ORDER.indexOf(b)
    )
    lineLabels = new Map(lineKeys.map((k) => [k, getFachLabel(k)]))
  } else {
    // Topics within selected fach as lines
    const topicKeys = new Set<string>()
    for (const s of snapshots) {
      for (const key of Object.keys(s.topicScores)) {
        if (key.startsWith(fach + '::')) topicKeys.add(key)
      }
    }
    lineKeys = Array.from(topicKeys).sort()
    lineLabels = new Map(lineKeys.map((k) => {
      const parts = k.split('::')
      return [k, capitalize(parts[parts.length - 1])]
    }))

    // Also add fach total line
    lineKeys.unshift(fach)
    lineLabels.set(fach, `${getFachLabel(fach)} (Gesamt)`)
  }

  // Build data points per line, carry forward last value
  const lineData = new Map<string, number[]>()
  for (const key of lineKeys) {
    const points: number[] = []
    let lastValue = 0
    for (const s of snapshots) {
      if (s.topicScores[key] !== undefined) {
        lastValue = s.topicScores[key]
      }
      points.push(lastValue)
    }
    lineData.set(key, points)
  }

  const maxSessions = snapshots.length
  const graphWidth = 300
  const graphHeight = 180
  const paddingLeft = 30
  const paddingRight = 10
  const paddingTop = 10
  const paddingBottom = 20
  const plotWidth = graphWidth - paddingLeft - paddingRight
  const plotHeight = graphHeight - paddingTop - paddingBottom
  const xStep = maxSessions > 1 ? plotWidth / (maxSessions - 1) : plotWidth

  return (
    <div className="space-y-4">
      {/* Fach Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedFach('_all')}
          className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
            fach === '_all'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          Alle Fächer
        </button>
        {FACH_ORDER.filter((f) => availableFaecher.has(f)).map((f) => (
          <button
            key={f}
            onClick={() => setSelectedFach(f)}
            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
              fach === f
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {getFachLabel(f)}
          </button>
        ))}
      </div>

      {/* Graph */}
      <svg
        viewBox={`0 0 ${graphWidth} ${graphHeight}`}
        className="w-full"
        style={{ maxHeight: '220px' }}
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = paddingTop + plotHeight - (v / 100) * plotHeight
          return (
            <g key={v}>
              <line
                x1={paddingLeft} x2={graphWidth - paddingRight}
                y1={y} y2={y}
                stroke="#27272a" strokeWidth="0.5"
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
              key={s.id} x={x} y={graphHeight - 4}
              textAnchor="middle" fill="#52525b" fontSize="6"
            >
              {s.sessionNumber}
            </text>
          )
        })}

        {/* Lines */}
        {lineKeys.map((key, lineIdx) => {
          const points = lineData.get(key)!
          const color = TOPIC_COLORS[lineIdx % TOPIC_COLORS.length]
          const isFachTotal = !key.includes('::') && fach !== '_all'
          const strokeWidth = isFachTotal ? 2 : 1.5
          const opacity = isFachTotal ? 1 : 0.8

          if (points.length === 1) {
            const x = paddingLeft + plotWidth / 2
            const y = paddingTop + plotHeight - (points[0] / 100) * plotHeight
            return <circle key={key} cx={x} cy={y} r="3" fill={color} opacity={opacity} />
          }

          const pathData = points
            .map((v, i) => {
              const x = paddingLeft + i * xStep
              const y = paddingTop + plotHeight - (v / 100) * plotHeight
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
            })
            .join(' ')

          return (
            <g key={key}>
              <path
                d={pathData} fill="none" stroke={color}
                strokeWidth={strokeWidth} strokeLinejoin="round"
                opacity={opacity}
              />
              {points.map((v, i) => {
                const x = paddingLeft + i * xStep
                const y = paddingTop + plotHeight - (v / 100) * plotHeight
                return <circle key={i} cx={x} cy={y} r={isFachTotal ? 2.5 : 2} fill={color} opacity={opacity} />
              })}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {lineKeys.map((key, lineIdx) => {
          const color = TOPIC_COLORS[lineIdx % TOPIC_COLORS.length]
          const points = lineData.get(key)!
          const current = points[points.length - 1]
          const label = lineLabels.get(key) ?? key
          const isFachTotal = !key.includes('::') && fach !== '_all'

          return (
            <div key={key} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className={`text-[10px] ${isFachTotal ? 'text-zinc-300 font-medium' : 'text-zinc-500'}`}>
                {label} {current}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
