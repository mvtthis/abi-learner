import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSetting, db, activateTopic, INACTIVE_NEXT_REVIEW } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import { usePublicDecks } from '@/hooks/usePublicDecks'

const FACH_META: Record<string, { label: string; emoji: string }> = {
  bio: { label: 'Biologie', emoji: '🧬' },
  geschichte: { label: 'Geschichte', emoji: '🏛️' },
  sport: { label: 'Sport', emoji: '⚽' },
  deutsch: { label: 'Deutsch', emoji: '📖' },
  englisch: { label: 'Englisch', emoji: '🇬🇧' },
}

interface OnboardingProps {
  onComplete?: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'intro' | 'topics'>('intro')
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set())
  const [activating, setActivating] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { decks, importedDeckIds, loading, importAllDecks } = usePublicDecks(user?.id ?? null)

  // Build topic structure from imported cards
  const [topicGroups, setTopicGroups] = useState<
    { fach: string; topics: { key: string; name: string; count: number }[] }[]
  >([])

  useEffect(() => {
    if (!imported) return
    // Read cards from DB to build topic tree
    const loadTopics = async () => {
      const cards = await db.cards.filter((c) => !c.deleted).toArray()
      const fachMap = new Map<string, Map<string, number>>()

      for (const card of cards) {
        for (const tag of card.tags) {
          const parts = tag.split('::')
          if (parts.length < 2) continue
          const fach = parts[0].toLowerCase()
          const topicKey = parts.slice(0, 2).join('::')
          if (!fachMap.has(fach)) fachMap.set(fach, new Map())
          const topics = fachMap.get(fach)!
          topics.set(topicKey, (topics.get(topicKey) ?? 0) + 1)
          break
        }
      }

      const groups = Array.from(fachMap.entries())
        .map(([fach, topics]) => ({
          fach,
          topics: Array.from(topics.entries())
            .map(([key, count]) => ({
              key,
              name: key.split('::')[1] ?? key,
              count,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => {
          const order = Object.keys(FACH_META)
          return order.indexOf(a.fach) - order.indexOf(b.fach)
        })

      setTopicGroups(groups)
    }
    loadTopics()
  }, [imported])

  const handleImportAndContinue = async () => {
    setImporting(true)
    // Import all decks if not yet imported
    const allImported = decks.every((d) => importedDeckIds.includes(d.id))
    if (!allImported) {
      await importAllDecks()
    }
    setImported(true)
    setImporting(false)
    setStep('topics')
  }

  const toggleFach = (fach: string) => {
    const fachTopics = topicGroups.find((g) => g.fach === fach)?.topics ?? []
    const allSelected = fachTopics.every((t) => selectedTopics.has(t.key))

    setSelectedTopics((prev) => {
      const next = new Set(prev)
      for (const t of fachTopics) {
        if (allSelected) {
          next.delete(t.key)
        } else {
          next.add(t.key)
        }
      }
      return next
    })
  }

  const toggleTopic = (key: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const finish = async () => {
    setActivating(true)
    // Activate all selected topics
    for (const topicKey of selectedTopics) {
      await activateTopic(topicKey)
    }
    await saveSetting('onboarding_complete', true)
    onComplete?.()
    navigate('/', { replace: true })
  }

  // Intro step
  if (step === 'intro') {
    return (
      <div className="min-h-dvh bg-black flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <span className="text-6xl mb-6">🧠</span>
          <h2 className="text-2xl font-bold text-white mb-3">
            Willkommen bei Abi-Learner
          </h2>
          <p className="text-zinc-400 text-base max-w-sm leading-relaxed mb-2">
            Lerne smarter für dein Abitur mit Spaced Repetition.
          </p>
          <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
            Im nächsten Schritt wählst du deine Fächer und Themen aus — dann
            kann's sofort losgehen.
          </p>
        </div>

        <div className="p-6 pb-8">
          <button
            onClick={handleImportAndContinue}
            disabled={importing || loading}
            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-500 disabled:opacity-50"
          >
            {loading
              ? 'Lade Decks...'
              : importing
                ? 'Importiere Karten...'
                : 'Weiter'}
          </button>
        </div>
      </div>
    )
  }

  // Topic picker step
  const isFachFullySelected = (fach: string) => {
    const fachTopics = topicGroups.find((g) => g.fach === fach)?.topics ?? []
    return fachTopics.length > 0 && fachTopics.every((t) => selectedTopics.has(t.key))
  }

  const isFachPartiallySelected = (fach: string) => {
    const fachTopics = topicGroups.find((g) => g.fach === fach)?.topics ?? []
    return fachTopics.some((t) => selectedTopics.has(t.key)) && !isFachFullySelected(fach)
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      <div className="px-6 pt-8 pb-4">
        <h2 className="text-xl font-bold text-white mb-1">
          Womit willst du starten?
        </h2>
        <p className="text-zinc-500 text-sm">
          Wähle deine Fächer und Themen. Du kannst jederzeit weitere
          aktivieren.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
        {topicGroups.map((group) => {
          const meta = FACH_META[group.fach]
          const fullySelected = isFachFullySelected(group.fach)
          const partiallySelected = isFachPartiallySelected(group.fach)

          return (
            <div key={group.fach}>
              {/* Fach header — toggles all subtopics */}
              <button
                onClick={() => toggleFach(group.fach)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors mb-2 ${
                  fullySelected
                    ? 'bg-blue-600/15 border border-blue-500/30'
                    : partiallySelected
                      ? 'bg-blue-600/8 border border-blue-500/15'
                      : 'bg-zinc-900 border border-zinc-800'
                }`}
              >
                <span className="text-xl">{meta?.emoji ?? '📘'}</span>
                <span className="text-base font-semibold text-white flex-1">
                  {meta?.label ?? group.fach}
                </span>
                <span className="text-xs text-zinc-500">
                  {group.topics.reduce((s, t) => s + t.count, 0)} Karten
                </span>
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                    fullySelected
                      ? 'bg-blue-600 text-white'
                      : partiallySelected
                        ? 'bg-blue-600/50 text-white'
                        : 'bg-zinc-800 text-zinc-600'
                  }`}
                >
                  {fullySelected ? '✓' : partiallySelected ? '−' : ''}
                </div>
              </button>

              {/* Subtopics */}
              <div className="space-y-1 ml-4">
                {group.topics.map((topic) => {
                  const isSelected = selectedTopics.has(topic.key)
                  return (
                    <button
                      key={topic.key}
                      onClick={() => toggleTopic(topic.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-blue-600/10 text-white'
                          : 'text-zinc-500 hover:bg-zinc-900'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-zinc-700'
                        }`}
                      >
                        {isSelected && '✓'}
                      </div>
                      <span className="text-sm flex-1 capitalize">
                        {topic.name}
                      </span>
                      <span className="text-[11px] text-zinc-600">
                        {topic.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-6 pb-8 border-t border-zinc-900">
        <button
          onClick={finish}
          disabled={selectedTopics.size === 0 || activating}
          className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-500 disabled:opacity-40"
        >
          {activating
            ? 'Aktiviere...'
            : selectedTopics.size === 0
              ? 'Wähle mindestens ein Thema'
              : `${selectedTopics.size} Themen starten`}
        </button>
      </div>
    </div>
  )
}
