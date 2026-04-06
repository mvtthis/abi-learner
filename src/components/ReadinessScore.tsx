import { getFachLabel } from '@/lib/scoreCalculator'
import type { FachScore } from '@/lib/scoreCalculator'

interface ReadinessScoreProps {
  score: FachScore
  daysUntilExam?: number | null
  onClick?: () => void
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function getScoreRingColor(score: number): string {
  if (score >= 90) return 'stroke-emerald-400'
  if (score >= 70) return 'stroke-green-400'
  if (score >= 40) return 'stroke-orange-400'
  return 'stroke-red-400'
}

export function ReadinessScore({ score, daysUntilExam, onClick }: ReadinessScoreProps) {
  const circumference = 2 * Math.PI * 36
  const offset = circumference - (score.score / 100) * circumference

  return (
    <button
      onClick={onClick}
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4 w-full hover:bg-zinc-800/50 transition-colors text-left"
    >
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80" role="img" aria-label={`${getFachLabel(score.fach)}: ${score.score}%`}>
          <circle cx="40" cy="40" r="36" fill="none" strokeWidth="5" className="stroke-zinc-800" />
          <circle
            cx="40" cy="40" r="36" fill="none" strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getScoreRingColor(score.score)} transition-all duration-500`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(score.score)}`}>
          {score.score}%
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white">
          {getFachLabel(score.fach)}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {score.masteredCards}/{score.totalCards} gekonnt
          {daysUntilExam != null && daysUntilExam > 0 && (
            <span className={daysUntilExam <= 3 ? ' text-red-400' : daysUntilExam <= 7 ? ' text-orange-400' : ''}>
              {' '}· {daysUntilExam}d
            </span>
          )}
        </p>
      </div>
      {score.score === 100 && (
        <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 bg-emerald-400/10 rounded-full">
          Bereit
        </span>
      )}
    </button>
  )
}

export function OverallScore({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120" role="img" aria-label={`Gesamtbereitschaft: ${score}%`}>
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="6" className="stroke-zinc-800" />
          <circle
            cx="60" cy="60" r="54" fill="none" strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getScoreRingColor(score)} transition-all duration-700`}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${getScoreColor(score)}`}>
          {score}%
        </span>
      </div>
      <p className="text-zinc-500 text-sm mt-2">
        {score === 100 ? 'Prüfungsbereit!' : 'Gesamtbereitschaft'}
      </p>
    </div>
  )
}
