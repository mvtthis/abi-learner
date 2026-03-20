import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDueCount } from '@/hooks/useReviewSession'
import { useStats } from '@/hooks/useStats'
import { useReadinessScore } from '@/hooks/useReadinessScore'
import { useAllCards } from '@/hooks/useCards'
import { StatsChart } from '@/components/StatsChart'
import { ReadinessScore, OverallScore } from '@/components/ReadinessScore'
import { TopicBreakdown } from '@/components/TopicBreakdown'
import { getFachLabel } from '@/lib/scoreCalculator'

export function Dashboard() {
  const navigate = useNavigate()
  const dueCount = useDueCount()
  const stats = useStats()
  const { overall, fachScores, topicScores } = useReadinessScore()
  const allCards = useAllCards()
  const [expandedFach, setExpandedFach] = useState<string | null>(null)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Due Cards CTA */}
      <button
        onClick={() => navigate('/review')}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform"
      >
        <p className="text-blue-100 text-sm">Heute fällig</p>
        <p className="text-4xl font-bold text-white mt-1">
          {dueCount} <span className="text-lg font-normal">Karten</span>
        </p>
        {dueCount > 0 && (
          <p className="text-blue-200 text-sm mt-2">Jetzt lernen →</p>
        )}
      </button>

      {/* Overall Readiness */}
      {allCards.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <OverallScore score={overall} />

          {/* Fach Scores */}
          <div className="mt-6 space-y-2">
            {fachScores
              .sort((a, b) => a.score - b.score)
              .map((fs) => (
                <div key={fs.fach}>
                  <ReadinessScore
                    score={fs}
                    onClick={() =>
                      setExpandedFach(
                        expandedFach === fs.fach ? null : fs.fach
                      )
                    }
                  />
                  {expandedFach === fs.fach &&
                    topicScores.get(fs.fach) && (
                      <div className="mt-2 ml-4 mr-2 mb-3 bg-zinc-800/50 rounded-xl p-4">
                        <TopicBreakdown
                          topics={topicScores.get(fs.fach)!}
                          fachLabel={getFachLabel(fs.fach)}
                        />
                      </div>
                    )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs">Heute gelernt</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats.todayCount}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs">Streak</p>
          <p className="text-2xl font-bold text-white mt-1">
            {stats.streak} <span className="text-sm text-zinc-500">Tage</span>
          </p>
        </div>
      </div>

      {/* 14-Day Chart */}
      {stats.days.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-3">Letzte 14 Tage</p>
          <StatsChart days={stats.days} />
        </div>
      )}

      {/* Forecast */}
      {stats.forecast.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs mb-3">Nächste 7 Tage</p>
          <div className="flex items-end gap-2">
            {stats.forecast.map((f, i) => (
              <div key={f.date} className="flex-1 text-center">
                <div
                  className="bg-blue-600/30 rounded-t mx-auto"
                  style={{
                    height: `${Math.max(
                      (f.count /
                        Math.max(...stats.forecast.map((x) => x.count), 1)) *
                        60,
                      4
                    )}px`,
                    width: '100%',
                  }}
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  {i === 0
                    ? 'Heute'
                    : new Date(f.date).toLocaleDateString('de', {
                        weekday: 'short',
                      })}
                </p>
                <p className="text-[10px] text-zinc-400 font-medium">
                  {f.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allCards.length === 0 && (
        <div className="text-center py-8">
          <p className="text-zinc-500 text-sm">Noch keine Karten vorhanden.</p>
          <button
            onClick={() => navigate('/import')}
            className="mt-3 px-4 py-2 bg-zinc-800 rounded-lg text-sm text-white hover:bg-zinc-700"
          >
            Karten importieren
          </button>
        </div>
      )}
    </div>
  )
}
