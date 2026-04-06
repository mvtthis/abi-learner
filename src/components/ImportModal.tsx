import { useState, useCallback } from 'react'
import { parseAnkiFile, parsedCardsToCards } from '@/lib/importParser'
import { useCards } from '@/hooks/useCards'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const [preview, setPreview] = useState<{
    count: number
    tags: string[]
    fileName: string
  } | null>(null)
  const [parsedContent, setParsedContent] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const { importCards } = useCards()

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setParsedContent(content)
      const parsed = parseAnkiFile(content)
      const allTags = new Set<string>()
      for (const card of parsed.cards) {
        for (const tag of card.tags) allTags.add(tag)
      }
      setPreview({
        count: parsed.cards.length,
        tags: Array.from(allTags),
        fileName: file.name,
      })
      setResult(null)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleImport = async () => {
    if (!parsedContent) return
    setImporting(true)
    const parsed = parseAnkiFile(parsedContent)
    const cards = parsedCardsToCards(parsed.cards)
    const { added, updated } = await importCards(cards)
    const parts: string[] = []
    if (added > 0) parts.push(`${added} neu`)
    if (updated > 0) parts.push(`${updated} aktualisiert`)
    setResult(parts.length > 0 ? parts.join(', ') : 'Keine Änderungen')
    setImporting(false)
    setPreview(null)
    setParsedContent(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Karten importieren</h2>
          <button
            onClick={() => {
              onClose()
              setPreview(null)
              setParsedContent(null)
              setResult(null)
            }}
            className="text-zinc-500 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {result ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">✓</div>
            <p className="text-emerald-400 font-medium">{result}</p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-zinc-800 rounded-lg text-sm text-white hover:bg-zinc-700"
            >
              Schließen
            </button>
          </div>
        ) : preview ? (
          <div>
            <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-zinc-400 mb-1">{preview.fileName}</p>
              <p className="text-2xl font-bold text-white">
                {preview.count} Karten
              </p>
              {preview.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {preview.tags.slice(0, 10).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPreview(null)
                  setParsedContent(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm hover:bg-zinc-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
              >
                {importing ? 'Importiere...' : 'Importieren'}
              </button>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-zinc-500 transition-colors"
          >
            <p className="text-zinc-400 mb-2">
              .txt Datei hierher ziehen
            </p>
            <p className="text-zinc-600 text-sm mb-4">
              Tab-separiert: Frage → Antwort → Tags
            </p>
            <label className="inline-block px-4 py-2 bg-zinc-800 rounded-lg text-sm text-white cursor-pointer hover:bg-zinc-700">
              Datei auswählen
              <input
                type="file"
                accept=".txt,.tsv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFile(file)
                }}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
