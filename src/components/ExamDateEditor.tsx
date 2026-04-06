import { useState, useEffect } from 'react'
import { db, getExamDates, setExamDate, type ExamDate } from '@/lib/db'
import { getFachLabel } from '@/lib/scoreCalculator'

const FACH_ORDER = ['geschichte', 'sport', 'bio', 'deutsch', 'englisch']

export function ExamDateEditor() {
  const [examDates, setExamDates] = useState<Map<string, ExamDate>>(new Map())
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    getExamDates().then(setExamDates)
  }, [])

  const handleChange = async (fach: string, date: string) => {
    await setExamDate(fach, date)
    const updated = await getExamDates()
    setExamDates(updated)
  }

  const handleDelete = async (fach: string) => {
    await db.examDates.delete(fach)
    const updated = await getExamDates()
    setExamDates(updated)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-[10px] text-zinc-600 hover:text-zinc-400"
      >
        Prüfungsdaten bearbeiten
      </button>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Prüfungsdaten</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-zinc-500 hover:text-white text-sm"
        >
          ✕
        </button>
      </div>

      {FACH_ORDER.map((fach) => {
        const exam = examDates.get(fach)
        return (
          <div key={fach} className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 w-24">
              {getFachLabel(fach)}
            </span>
            <input
              type="date"
              value={exam?.date ?? ''}
              onChange={(e) => handleChange(fach, e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
            />
            {exam && (
              <button
                onClick={() => handleDelete(fach)}
                className="text-zinc-600 hover:text-red-400 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
