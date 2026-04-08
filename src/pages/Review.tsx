import { useState } from 'react'
import { useReviewSession } from '@/hooks/useReviewSession'
import { useAllTags } from '@/hooks/useCards'
import { ReviewCard } from '@/components/ReviewCard'
import { ReviewButtons } from '@/components/ReviewButtons'
import { TagTree } from '@/components/TagTree'

export function Review() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showFilter, setShowFilter] = useState(false)
  const tags = useAllTags()
  const { session, loading, flip, answer, reload } = useReviewSession(
    selectedTags.length > 0 ? selectedTags : undefined
  )

  const handleToggleTag = (tag: string) => {
    if (tag === '') {
      setSelectedTags([])
    } else {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session.isComplete) {
    const accuracy = session.reviewedCount > 0
      ? Math.round((session.correctCount / session.reviewedCount) * 100)
      : 0

    const wrongCount = session.reviewedCount - session.correctCount
    const emoji = accuracy >= 90 ? '🔥' : accuracy >= 70 ? '💪' : accuracy >= 50 ? '📈' : '🧠'

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <span className="text-5xl mb-4">{emoji}</span>
        <h2 className="text-xl font-bold text-white mb-4">Session geschafft!</h2>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{accuracy}%</p>
            <p className="text-[10px] text-zinc-500">Richtig</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-emerald-400">{session.correctCount}</p>
            <p className="text-[10px] text-zinc-500">Gewusst</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-red-400">{wrongCount}</p>
            <p className="text-[10px] text-zinc-500">Nochmal</p>
          </div>
        </div>

        {/* Progress message */}
        {accuracy >= 80 ? (
          <p className="text-emerald-400 text-sm mb-1">Starke Session!</p>
        ) : accuracy >= 50 ? (
          <p className="text-orange-400 text-sm mb-1">Wird besser — dranbleiben!</p>
        ) : (
          <p className="text-zinc-400 text-sm mb-1">Übung macht den Meister.</p>
        )}

        {session.sessionsLeft > 0 && (
          <p className="text-zinc-600 text-xs mb-6">
            Noch {session.sessionsLeft} {session.sessionsLeft === 1 ? 'Session' : 'Sessions'} übrig
          </p>
        )}

        <div className="flex gap-3 w-full max-w-xs">
          {session.sessionsLeft > 0 ? (
            <button
              onClick={reload}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-500"
            >
              Nächste Session
            </button>
          ) : (
            <button
              onClick={reload}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-white text-sm hover:bg-zinc-700"
            >
              Nochmal prüfen
            </button>
          )}
        </div>
      </div>
    )
  }

  const remaining = session.queue.length + 1

  return (
    <div className="flex flex-col h-[calc(100dvh-110px)] max-w-lg mx-auto">
      {/* Progress bar + filter */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400">
            {session.reviewedCount + 1} / {session.totalCards}
          </span>
          <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${(session.reviewedCount / session.totalCards) * 100}%`,
              }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="text-xs text-zinc-500 px-2 py-1 rounded-lg hover:bg-zinc-800"
        >
          Filter {selectedTags.length > 0 && `(${selectedTags.length})`}
        </button>
      </div>

      {/* Tag Filter */}
      {showFilter && (
        <div className="mx-4 mb-2 bg-zinc-900 border border-zinc-800 rounded-xl p-3 max-h-48 overflow-y-auto flex-shrink-0">
          <TagTree
            tags={tags}
            selectedTags={selectedTags}
            onToggle={handleToggleTag}
          />
        </div>
      )}

      {/* Card — takes remaining space, scrollable */}
      <div className="flex-1 min-h-0 flex items-start px-4 py-2 overflow-y-auto">
        {session.currentCard && (
          <ReviewCard
            card={session.currentCard}
            isFlipped={session.isFlipped}
            onFlip={flip}
          />
        )}
      </div>

      {/* Buttons — always fixed at bottom */}
      <div className="px-4 pb-4 pt-2 flex-shrink-0">
        {session.isFlipped ? (
          <ReviewButtons onAnswer={answer} />
        ) : (
          <button
            onClick={flip}
            className="w-full py-4 rounded-xl bg-zinc-800 text-white font-medium text-sm active:bg-zinc-700 transition-colors"
          >
            Antwort zeigen
          </button>
        )}
      </div>
    </div>
  )
}
