import type { TopicScore } from '@/lib/scoreCalculator'

interface TopicBreakdownProps {
  topics: TopicScore[]
  fachLabel: string
}

function getBarColor(score: number): string {
  if (score >= 90) return 'bg-emerald-400'
  if (score >= 70) return 'bg-green-400'
  if (score >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

export function TopicBreakdown({ topics, fachLabel }: TopicBreakdownProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">{fachLabel}</h3>
      {topics.map((topic) => (
        <div key={topic.topic} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 capitalize">
              {topic.topic}
            </span>
            <span className="text-xs text-zinc-500">
              {topic.score}% · {topic.masteredCards}/{topic.totalCards}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getBarColor(topic.score)} transition-all duration-500`}
              style={{ width: `${topic.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
