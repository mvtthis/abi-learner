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
  const [selectedSession, setSelectedSession] = useState<number | null>(null)

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
    lineKeys = Array.from(availableFaecher).sort((a, b) =>
      FACH_ORDER.indexOf(a) - FACH_ORDER.indexOf(b)
    )
    lineLabels = new Map(lineKeys.map((k) => [k, getFachLabel(k)]))
  } else {
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
  const paddingBottom = 25
  const plotWidth = graphWidth - paddingLeft - paddingRight
  const plotHeight = graphHeight - paddingTop - paddingBottom
  const xStep = maxSessions > 1 ? plotWidth / (maxSessions - 1) : plotWidth

  // Get scores for selected session
  const selectedIdx = selectedSession !== null
    ? snapshots.findIndex((s) => s.sessionNumber === selectedSession)
    : null

  return (
    <div className="space-y-4">
      {/* Fach Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => { setSelectedFach('_all'); setSelectedSession(null) }}
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
            onClick={() => { setSelectedFach(f); setSelectedSession(null) }}
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
        className="w-full select-none"
        style={{ maxHeight: '220px', WebkitUserSelect: 'none', userSelect: 'none' }}
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

        {/* Selected session highlight */}
        {selectedIdx !== null && selectedIdx >= 0 && (
          <line
            x1={paddingLeft + (maxSessions > 1 ? selectedIdx * xStep : plotWidth / 2)}
            x2={paddingLeft + (maxSessions > 1 ? selectedIdx * xStep : plotWidth / 2)}
            y1={paddingTop}
            y2={paddingTop + plotHeight}
            stroke="#3b82f6"
            strokeWidth="0.8"
            strokeDasharray="3,2"
          />
        )}

        {/* X-axis labels (clickable, not selectable) */}
        {snapshots.map((s, i) => {
          const x = paddingLeft + (maxSessions > 1 ? i * xStep : plotWidth / 2)
          const isSelected = selectedSession === s.sessionNumber
          return (
            <g
              key={s.id}
              onClick={() => setSelectedSession(isSelected ? null : s.sessionNumber)}
              style={{ cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {/* Larger invisible hit area for mobile */}
              <rect
                x={x - 10} y={graphHeight - paddingBottom - 2}
                width={20} height={paddingBottom + 4}
                fill="transparent"
              />
              {/* Background pill for selected state */}
              {isSelected && (
                <rect
                  x={x - 7} y={graphHeight - 15}
                  width={14} height={12} rx={3}
                  fill="#3b82f6" opacity={0.2}
                />
              )}
              <text
                x={x} y={graphHeight - 6}
                textAnchor="middle"
                fill={isSelected ? '#3b82f6' : '#71717a'}
                fontSize="7"
                fontWeight={isSelected ? 'bold' : 'normal'}
                style={{ pointerEvents: 'none' }}
              >
                {s.sessionNumber}
              </text>
            </g>
          )
        })}

        {/* Lines */}
        {lineKeys.map((key, lineIdx) => {
          const points = lineData.get(key)!
          const color = TOPIC_COLORS[lineIdx % TOPIC_COLORS.length]

          if (points.length === 1) {
            const x = paddingLeft + plotWidth / 2
            const y = paddingTop + plotHeight - (points[0] / 100) * plotHeight
            return <circle key={key} cx={x} cy={y} r="3" fill={color} opacity={0.9} />
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
                strokeWidth={1.5} strokeLinejoin="round" opacity={0.9}
              />
              {points.map((v, i) => {
                const x = paddingLeft + i * xStep
                const y = paddingTop + plotHeight - (v / 100) * plotHeight
                const isHighlighted = selectedIdx === i
                return (
                  <circle
                    key={i} cx={x} cy={y}
                    r={isHighlighted ? 3.5 : 2}
                    fill={color}
                    opacity={isHighlighted ? 1 : 0.9}
                  />
                )
              })}
            </g>
          )
        })}
      </svg>

      {/* Session detail or Legend */}
      {selectedIdx !== null && selectedIdx >= 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400 font-medium">
              Session {snapshots[selectedIdx].sessionNumber}
            </p>
            <button
              onClick={() => setSelectedSession(null)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              Schließen
            </button>
          </div>
          {lineKeys.map((key, lineIdx) => {
            const color = TOPIC_COLORS[lineIdx % TOPIC_COLORS.length]
            const points = lineData.get(key)!
            const value = points[selectedIdx]
            const prevValue = selectedIdx > 0 ? points[selectedIdx - 1] : 0
            const delta = value - prevValue
            const label = lineLabels.get(key) ?? key

            return (
              <div key={key} className="flex items-center gap-2 py-0.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-zinc-400 flex-1">{label}</span>
                <span className="text-[11px] text-zinc-300 font-medium">{value}%</span>
                {delta !== 0 && (
                  <span className={`text-[10px] font-medium ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {lineKeys.map((key, lineIdx) => {
            const color = TOPIC_COLORS[lineIdx % TOPIC_COLORS.length]
            const points = lineData.get(key)!
            const current = points[points.length - 1]
            const label = lineLabels.get(key) ?? key
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-zinc-500">{label} {current}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
