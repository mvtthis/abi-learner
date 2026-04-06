import type { Card } from '@/lib/db'
import { sanitizeHTML } from '@/lib/sanitize'

interface ReviewCardProps {
  card: Card
  isFlipped: boolean
  onFlip: () => void
}

/**
 * Pre-process card HTML to add typographic hierarchy:
 * - Only NUMBERED labels become section headers (e.g. "<b>1. Regel:</b>")
 * - Standalone section words at line start (after <br> or start of string)
 *   that end with ":" also become labels (e.g. "<b>Voraussetzungen:</b>")
 * - Inline labels in bullet points (e.g. "<b>DNA-Methylierung:</b>") stay as-is
 */
function processCardHTML(html: string): string {
  // Numbered labels: <b>1. Regel:</b>, <b>2. ...</b>
  let result = html.replace(
    /<b>(\d+\.?\s*[^<]*?:)<\/b>/g,
    '<span class="card-label">$1</span>'
  )
  // Standalone section labels at line start (after <br> or start of string)
  // but NOT after bullet markers (•, -, *)
  result = result.replace(
    /(?:^|<br\s*\/?>)\s*(?![•\-\*])<b>([^<]*?:)<\/b>/g,
    (match, label) => {
      const prefix = match.slice(0, match.indexOf('<b>'))
      return `${prefix}<span class="card-label">${label}</span>`
    }
  )
  return result
}

/**
 * Extract Fach (subject) and Unterthema (subtopic) from tags.
 * Tags follow "Fach::Unterthema::Detail" pattern.
 */
function getTopicInfo(tags: string[]): { fach: string; topic: string } | null {
  for (const tag of tags) {
    const parts = tag.split('::')
    if (parts.length >= 2) {
      return { fach: parts[0], topic: parts[1] }
    }
    if (parts.length === 1 && parts[0]) {
      return { fach: parts[0], topic: '' }
    }
  }
  return null
}

export function ReviewCard({ card, isFlipped, onFlip }: ReviewCardProps) {
  const processedBack = processCardHTML(sanitizeHTML(card.back))
  const sanitizedFront = sanitizeHTML(card.front)
  const topicInfo = getTopicInfo(card.tags)

  return (
    <div className="w-full max-w-lg mx-auto">
      {!isFlipped ? (
        /* Front — Question */
        <div
          onClick={onFlip}
          className="rounded-2xl bg-[#111] border border-zinc-800 p-6 min-h-[260px] max-h-[calc(100dvh-260px)] overflow-y-auto flex flex-col justify-center items-center cursor-pointer active:scale-[0.98] transition-transform"
        >
          {topicInfo && (
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-400 uppercase tracking-wider font-medium">
                {topicInfo.fach}
              </span>
              {topicInfo.topic && (
                <>
                  <span className="text-zinc-700 text-[10px]">›</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400">
                    {topicInfo.topic}
                  </span>
                </>
              )}
            </div>
          )}
          <div
            className="text-lg text-center leading-relaxed text-white font-medium"
            dangerouslySetInnerHTML={{ __html: sanitizedFront }}
          />
          <p className="text-[11px] text-zinc-700 mt-6">Tippe zum Aufdecken</p>
        </div>
      ) : (
        /* Back — Answer (scrollable, tap to flip back) */
        <div className="rounded-2xl bg-[#111] border border-zinc-800 flex flex-col max-h-[calc(100dvh-260px)]">
          <div
            onClick={onFlip}
            className="px-6 pt-5 pb-2 flex-shrink-0 cursor-pointer"
          >
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest text-center">
              Antwort <span className="text-zinc-700">· Tippe für Frage</span>
            </p>
          </div>
          <div className="px-6 pb-6 card-scroll flex-1 min-h-0">
            <div
              className="card-content"
              dangerouslySetInnerHTML={{ __html: processedBack }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
