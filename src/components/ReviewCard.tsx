import { useState } from 'react'
import type { Card } from '@/lib/db'

interface ReviewCardProps {
  card: Card
  isFlipped: boolean
  onFlip: () => void
}

export function ReviewCard({ card, isFlipped, onFlip }: ReviewCardProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  const handleFlip = () => {
    if (isFlipped) return
    setIsAnimating(true)
    onFlip()
    setTimeout(() => setIsAnimating(false), 300)
  }

  return (
    <div
      className="w-full max-w-lg mx-auto perspective-1000"
      onClick={handleFlip}
    >
      <div
        className={`relative w-full min-h-[280px] transition-transform duration-300 transform-style-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        } ${isAnimating ? 'scale-[0.98]' : ''}`}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-center items-center">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">
            Frage
          </p>
          <div
            className="text-lg text-center leading-relaxed text-white"
            dangerouslySetInnerHTML={{ __html: card.front }}
          />
          <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400"
              >
                {tag.split('::').pop()}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-6">Tippe zum Aufdecken</p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-center overflow-y-auto">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4 text-center">
            Antwort
          </p>
          <div
            className="text-base leading-relaxed text-zinc-200 card-content"
            dangerouslySetInnerHTML={{ __html: card.back }}
          />
        </div>
      </div>
    </div>
  )
}
