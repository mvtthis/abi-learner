import { useState } from 'react'
import { useCards, useAllTags } from '@/hooks/useCards'
import { TagTree } from '@/components/TagTree'
import { CardEditor } from '@/components/CardEditor'
import { sanitizeHTML } from '@/lib/sanitize'

export function Browse() {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const tags = useAllTags()
  const { cards, addCard, updateCard, deleteCard } = useCards(
    selectedTags.length > 0 ? selectedTags : undefined
  )

  const filteredCards = search
    ? cards.filter(
        (c) =>
          c.front.toLowerCase().includes(search.toLowerCase()) ||
          c.back.toLowerCase().includes(search.toLowerCase())
      )
    : cards

  const handleToggleTag = (tag: string) => {
    if (tag === '') {
      setSelectedTags([])
    } else {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      )
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Karten{' '}
          <span className="text-zinc-500 text-sm font-normal">
            ({filteredCards.length})
          </span>
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs text-white font-medium hover:bg-blue-500"
        >
          + Neue Karte
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Karten durchsuchen..."
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
      />

      {/* Filter Toggle */}
      <button
        onClick={() => setShowFilter(!showFilter)}
        className="text-xs text-zinc-500 hover:text-zinc-300"
      >
        Tags filtern {selectedTags.length > 0 && `(${selectedTags.length})`}{' '}
        {showFilter ? '▴' : '▾'}
      </button>

      {showFilter && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 max-h-48 overflow-y-auto">
          <TagTree
            tags={tags}
            selectedTags={selectedTags}
            onToggle={handleToggleTag}
          />
        </div>
      )}

      {/* Create Card */}
      {showCreate && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <CardEditor
            onSave={async (front, back, tags) => {
              await addCard(front, back, tags)
              setShowCreate(false)
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Card List */}
      <div className="space-y-2">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-3"
          >
            {editingCard === card.id ? (
              <CardEditor
                title="Karte bearbeiten"
                initialFront={card.front}
                initialBack={card.back}
                initialTags={card.tags}
                onSave={async (front, back, tags) => {
                  await updateCard(card.id, { front, back, tags })
                  setEditingCard(null)
                }}
                onCancel={() => setEditingCard(null)}
              />
            ) : (
              <div>
                <div
                  className="text-sm text-white mb-1"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(card.front) }}
                />
                <div
                  className="text-xs text-zinc-500 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(card.back) }}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-wrap gap-1">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500"
                      >
                        {tag.split('::').pop()}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingCard(card.id)}
                      className="text-xs text-zinc-600 hover:text-zinc-300 px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCard(card.id)}
                      className="text-xs text-zinc-600 hover:text-red-400 px-2 py-1"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <p className="text-center text-zinc-600 text-sm py-8">
          Keine Karten gefunden.
        </p>
      )}
    </div>
  )
}
