import type { Card } from '@/lib/db'

interface ReviewCardProps {
  card: Card
  isFlipped: boolean
  onFlip: () => void
}

export function ReviewCard({ card, isFlipped, onFlip }: ReviewCardProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {!isFlipped ? (
        /* Front — Question */
        <div
          onClick={onFlip}
          className="rounded-2xl bg-[#111] border border-zinc-800 p-6 min-h-[260px] flex flex-col justify-center items-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-5">
            Frage
          </p>
          <div
            className="text-lg text-center leading-relaxed text-white font-medium"
            dangerouslySetInnerHTML={{ __html: card.front }}
          />
          <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-500"
              >
                {tag.split('::').pop()}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-zinc-700 mt-6">Tippe zum Aufdecken</p>
        </div>
      ) : (
        /* Back — Answer (scrollable) */
        <div className="rounded-2xl bg-[#111] border border-zinc-800 flex flex-col max-h-[calc(100dvh-260px)]">
          <div className="px-6 pt-5 pb-2 flex-shrink-0">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center">
              Antwort
            </p>
          </div>
          <div className="px-6 pb-6 card-scroll flex-1 min-h-0">
            <div
              className="card-content"
              dangerouslySetInnerHTML={{ __html: card.back }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
