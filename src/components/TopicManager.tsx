import { useMemo } from 'react'
import { useAllCards } from '@/hooks/useCards'
import { useActivatedTopics } from '@/hooks/useActivatedTopics'

interface TopicGroup {
  fach: string
  topics: {
    key: string
    name: string
    totalCards: number
    reviewedCards: number
  }[]
}

const FACH_LABELS: Record<string, string> = {
  bio: 'Biologie',
  geschichte: 'Geschichte',
  sport: 'Sport',
  deutsch: 'Deutsch',
  englisch: 'Englisch',
}

export function TopicManager() {
  const allCards = useAllCards()
  const { activatedTopics, activateTopic, deactivateTopic } =
    useActivatedTopics()

  const groups = useMemo(() => {
    const fachMap = new Map<string, Map<string, { total: number; reviewed: number }>>()

    for (const card of allCards) {
      for (const tag of card.tags) {
        const parts = tag.split('::')
        if (parts.length < 2) continue
        const fach = parts[0].toLowerCase()
        const topicKey = parts.slice(0, 2).join('::')

        if (!fachMap.has(fach)) fachMap.set(fach, new Map())
        const topics = fachMap.get(fach)!
        if (!topics.has(topicKey)) topics.set(topicKey, { total: 0, reviewed: 0 })
        const t = topics.get(topicKey)!
        t.total++
        if (card.repetitions > 0) t.reviewed++
        break
      }
    }

    const result: TopicGroup[] = []
    for (const [fach, topics] of fachMap) {
      const topicList = Array.from(topics.entries()).map(([key, stats]) => ({
        key,
        name: key.split('::')[1] ?? key,
        totalCards: stats.total,
        reviewedCards: stats.reviewed,
      }))
      topicList.sort((a, b) => a.name.localeCompare(b.name))
      result.push({ fach, topics: topicList })
    }
    result.sort((a, b) => a.fach.localeCompare(b.fach))
    return result
  }, [allCards])

  const toggleFach = async (group: TopicGroup) => {
    const allActive = group.topics.every((t) => activatedTopics.has(t.key))
    for (const topic of group.topics) {
      if (allActive) {
        await deactivateTopic(topic.key)
      } else if (!activatedTopics.has(topic.key)) {
        await activateTopic(topic.key)
      }
    }
  }

  if (groups.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Themen</h3>
        <span className="text-[10px] text-zinc-600">
          {activatedTopics.size} aktiv
        </span>
      </div>

      {groups.map((group) => {
        const allActive = group.topics.every((t) => activatedTopics.has(t.key))
        const someActive = group.topics.some((t) => activatedTopics.has(t.key))
        const fachCards = group.topics.reduce((s, t) => s + t.totalCards, 0)

        return (
          <div key={group.fach}>
            {/* Fach header — toggle all subtopics */}
            <button
              onClick={() => toggleFach(group)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg mb-1.5 transition-colors ${
                allActive
                  ? 'bg-blue-600/10'
                  : someActive
                    ? 'bg-blue-600/5'
                    : 'hover:bg-zinc-800/50'
              }`}
            >
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium flex-1 text-left">
                {FACH_LABELS[group.fach] ?? group.fach}
              </p>
              <span className="text-[10px] text-zinc-600">{fachCards}</span>
              <div
                className={`w-4 h-4 rounded flex items-center justify-center text-[9px] ${
                  allActive
                    ? 'bg-blue-600 text-white'
                    : someActive
                      ? 'bg-blue-600/50 text-white'
                      : 'bg-zinc-800 text-zinc-600'
                }`}
              >
                {allActive ? '✓' : someActive ? '−' : ''}
              </div>
            </button>

            <div className="space-y-1.5">
              {group.topics.map((topic) => {
                const isActive = activatedTopics.has(topic.key)
                const progress =
                  topic.totalCards > 0
                    ? Math.round(
                        (topic.reviewedCards / topic.totalCards) * 100
                      )
                    : 0

                return (
                  <button
                    key={topic.key}
                    onClick={() =>
                      isActive
                        ? deactivateTopic(topic.key)
                        : activateTopic(topic.key)
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isActive
                        ? 'bg-blue-600/10 border border-blue-500/20'
                        : 'bg-zinc-900 border border-zinc-800 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-blue-500' : 'bg-zinc-700'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          isActive ? 'text-white' : 'text-zinc-500'
                        }`}
                      >
                        {topic.name}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {topic.totalCards} Karten
                        {isActive && topic.reviewedCards > 0 && (
                          <> · {progress}% gelernt</>
                        )}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'bg-zinc-800 text-zinc-600'
                      }`}
                    >
                      {isActive ? 'aktiv' : 'starten'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
