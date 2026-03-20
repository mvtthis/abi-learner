import { useState } from 'react'

interface CardEditorProps {
  initialFront?: string
  initialBack?: string
  initialTags?: string[]
  onSave: (front: string, back: string, tags: string[]) => void
  onCancel: () => void
  title?: string
}

export function CardEditor({
  initialFront = '',
  initialBack = '',
  initialTags = [],
  onSave,
  onCancel,
  title = 'Neue Karte',
}: CardEditorProps) {
  const [front, setFront] = useState(initialFront)
  const [back, setBack] = useState(initialBack)
  const [tagInput, setTagInput] = useState(initialTags.join(' '))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    const tags = tagInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    onSave(front, back, tags)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          Vorderseite (Frage)
        </label>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
          placeholder="Frage eingeben..."
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          Rückseite (Antwort) — HTML erlaubt
        </label>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          rows={5}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
          placeholder="Antwort eingeben... <b>fett</b>, <i>kursiv</i>, <sub>tiefgestellt</sub>"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">
          Tags (Leerzeichen-getrennt)
        </label>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
          placeholder="bio::genetik::replikation"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={!front.trim() || !back.trim()}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
        >
          Speichern
        </button>
      </div>
    </form>
  )
}
