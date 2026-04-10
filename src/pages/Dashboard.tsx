import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDueCount } from '@/hooks/useReviewSession'
import { useStats } from '@/hooks/useStats'
import { useReadinessScore } from '@/hooks/useReadinessScore'
import { useAllCards } from '@/hooks/useCards'
import { StatsChart } from '@/components/StatsChart'
import { ReadinessScore, OverallScore } from '@/components/ReadinessScore'
import { TopicBreakdown } from '@/components/TopicBreakdown'
import { TopicManager } from '@/components/TopicManager'
import { getFachLabel } from '@/lib/scoreCalculator'
import { getExamDates, type ExamDate } from '@/lib/db'
import { ExamDateEditor } from '@/components/ExamDateEditor'

function ExamCountdown({ examDates }: { examDates: Map<string, ExamDate> }) {
  const now = new Date()

  const upcoming = Array.from(examDates.values())
    .map((e) => {
      const examDate = new Date(e.date)
      // Exam is "done" at 13:00 on exam day
      examDate.setHours(13, 0, 0, 0)
      const diffMs = examDate.getTime() - now.getTime()
      const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
      return { ...e, days, isToday: days === 0 || (days === 1 && diffMs < 24 * 60 * 60 * 1000 && diffMs > 0) }
    })
    .filter((e) => e.days > 0 || (e.days === 0 && new Date().getHours() < 13))
    .sort((a, b) => a.days - b.days)

  if (upcoming.length === 0) return null

  const next = upcoming[0]
  const urgencyColor =
    next.days <= 3
      ? 'from-red-600 to-red-500'
      : next.days <= 7
        ? 'from-orange-600 to-orange-500'
        : 'from-zinc-700 to-zinc-600'

  return (
    <div className={`bg-gradient-to-r ${urgencyColor} rounded-2xl p-4`}>
      <p className="text-white/70 text-xs mb-1">Nächste Prüfung</p>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">
          {getFachLabel(next.fach)}
        </span>
        <span className="text-white/80 text-sm">
          {next.days <= 0 ? 'heute' : next.days === 1 ? 'morgen' : `in ${next.days} Tagen`}
        </span>
      </div>
      {upcoming.length > 1 && (
        <div className="flex gap-3 mt-2">
          {upcoming.slice(1, 4).map((e) => (
            <span key={e.fach} className="text-[10px] text-white/50">
              {getFachLabel(e.fach)} · {e.days}d
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { reviewCount, newCount, totalCount } = useDueCount()
  const stats = useStats()
  const { overall, fachScores, topicScores } = useReadinessScore()
  const allCards = useAllCards()
  const [expandedFach, setExpandedFach] = useState<string | null>(null)
  const [examDates, setExamDates] = useState<Map<string, ExamDate>>(new Map())

  useEffect(() => {
    getExamDates().then(setExamDates)
  }, [])

  // Filter out fachScores for past exams (done after 13:00 on exam day)
  const now = new Date()
  const activeFachScores = fachScores.filter((fs) => {
    const exam = examDates.get(fs.fach)
    if (!exam) return true
    const examDate = new Date(exam.date)
    examDate.setHours(13, 0, 0, 0)
    return now.getTime() < examDate.getTime()
  })

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      {/* Exam Countdown */}
      {examDates.size > 0 && <ExamCountdown examDates={examDates} />}
      <ExamDateEditor />

      {/* Session CTA */}
      <button
        onClick={() => navigate('/review')}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-5 text-left active:scale-[0.98] transition-transform"
      >
        {totalCount > 0 ? (
          <>
            <p className="text-3xl font-bold text-white">Session starten</p>
            <p className="text-blue-200 text-sm mt-2">
              {Math.min(totalCount, 20)} Karten
              {totalCount > 20 && (
                <span className="text-blue-300/60"> · {Math.ceil(totalCount / 20)} Sessions insgesamt</span>
              )}
            </p>
          </>
        ) : totalCount === 0 && allCards.length > 0 ? (
          <>
            <p className="text-blue-100 text-sm">Alles erledigt</p>
            <p className="text-xl font-bold text-white mt-1">Keine Karten fällig</p>
          </>
        ) : allCards.length > 0 ? (
          <>
            <p className="text-blue-100 text-sm">Keine Themen aktiv</p>
            <p className="text-lg font-bold text-white mt-1">Wähle unten Themen aus um zu starten</p>
          </>
        ) : (
          <>
            <p className="text-blue-100 text-sm">Noch keine Karten</p>
            <p className="text-lg font-bold text-white mt-1">Importiere Decks um loszulegen</p>
          </>
        )}
      </button>

      {/* Overall Readiness */}
      {allCards.length > 0 && activeFachScores.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <OverallScore score={overall} />

          <div className="mt-6 space-y-2">
            {activeFachScores
              .sort((a, b) => a.score - b.score)
              .map((fs) => {
                const exam = examDates.get(fs.fach)
                const daysLeft = exam
                  ? Math.ceil(
                      (new Date(exam.date).getTime() - now.getTime()) /
                        (24 * 60 * 60 * 1000)
                    )
                  : null

                return (
                  <div key={fs.fach}>
                    <ReadinessScore
                      score={fs}
                      daysUntilExam={daysLeft}
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
                )
              })}
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

      {/* Topic Manager */}
      {allCards.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <TopicManager />
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
