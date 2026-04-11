import { ProgressGraph } from '@/components/ProgressGraph'
import { useWeakTopics } from '@/hooks/useWeakTopics'
import { sanitizeHTML } from '@/lib/sanitize'

export function Progress() {
  const { weakCards, weakTopics } = useWeakTopics()

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-bold text-white">Fortschritt</h2>

      {/* Progress Graph */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-zinc-500 text-xs mb-3">Lernfortschritt pro Fach</p>
        <ProgressGraph />
      </div>

      {/* Weak Topics */}
      {weakTopics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Schwächen</h3>
          <p className="text-zinc-500 text-xs mb-3">
            Beim ersten Mal falsch — hier nochmal Videos schauen.
          </p>
          <div className="space-y-2">
            {weakTopics.map((t) => {
              const ratio = Math.round((t.wrongCards / t.totalCards) * 100)
              return (
                <div
                  key={t.topic}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      ratio >= 50
                        ? 'bg-red-500/15 text-red-400'
                        : ratio >= 25
                          ? 'bg-orange-500/15 text-orange-400'
                          : 'bg-yellow-500/15 text-yellow-400'
                    }`}
                  >
                    {ratio}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white capitalize">
                      {t.topicLabel}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {t.fachLabel} · {t.wrongCards}/{t.totalCards} falsch beim ersten Mal
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Individual weak cards */}
          {weakCards.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-zinc-400 mb-3">
                Karten im Detail ({weakCards.length})
              </h3>
              <div className="space-y-2">
                {weakCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
                  >
                    <div
                      className="text-sm text-white"
                      dangerouslySetInnerHTML={{ __html: sanitizeHTML(card.front) }}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 capitalize">
                        {card.topic.split('::').pop()}
                      </span>
                      <span className="text-[9px] text-zinc-600">
                        {card.wrongAttempts}x falsch / {card.totalAttempts} Versuche
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
