/**
 * Leitner-style session-based algorithm for short-term exam prep.
 *
 * Card level (stored in `repetitions`):
 *   0 = new or failed — always due, comes back within session
 *   1 = got right once — due every session
 *   2 = got right twice — may skip a session depending on exam proximity
 *   3 = got right 3x — can skip 1-2 sessions
 *   4+ = solid — only returns as exam approaches
 *
 * Within a session:
 *   - Right → level++, exits session queue
 *   - Wrong → level = 0, reinserted after REAPPEAR_GAP cards
 *
 * Between sessions:
 *   - next_review is set based on level + days until exam
 */

/** How many cards until a failed card reappears in the same session */
export const REAPPEAR_GAP = 5

export interface LeitnerResult {
  level: number
  next_review: number
  staysInSession: boolean
}

/**
 * Process a card answer within a session.
 *
 * @param correct - whether the user got it right
 * @param currentLevel - current card level (repetitions field)
 * @param daysUntilExam - days until this subject's exam (null = no exam set)
 */
export function leitnerAnswer(
  correct: boolean,
  currentLevel: number,
  daysUntilExam: number | null
): LeitnerResult {
  if (!correct) {
    return {
      level: 0,
      next_review: Date.now(), // available immediately
      staysInSession: true,
    }
  }

  const newLevel = Math.min(currentLevel + 1, 5)
  const next_review = getNextReview(newLevel, daysUntilExam)

  return {
    level: newLevel,
    next_review,
    staysInSession: false,
  }
}

/**
 * Calculate when a card should next appear based on its level
 * and how close the exam is.
 */
function getNextReview(level: number, daysUntilExam: number | null): number {
  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  // Base spacing in days per level
  const baseSpacing = [0, 0, 1, 2, 4, 7]
  let spacing = baseSpacing[level] ?? 7

  // Compress spacing based on exam proximity
  if (daysUntilExam !== null) {
    if (daysUntilExam <= 3) {
      spacing = 0 // everything every session
    } else if (daysUntilExam <= 7) {
      spacing = Math.min(spacing, 1)
    } else if (daysUntilExam <= 14) {
      spacing = Math.min(spacing, 2)
    }
    // 14+ days: use base spacing
  }

  return now + spacing * DAY
}

/**
 * Check if a card is due for today's session.
 */
export function isDueForSession(
  card: { repetitions: number; next_review: number; deleted: boolean },
  now: number
): boolean {
  if (card.deleted) return false
  return card.next_review <= now
}

/**
 * Sort cards for a session: lowest level first, shuffle within levels.
 */
export function sortForSession<T extends { repetitions: number }>(cards: T[]): T[] {
  // Group by level
  const groups = new Map<number, T[]>()
  for (const card of cards) {
    const level = card.repetitions
    if (!groups.has(level)) groups.set(level, [])
    groups.get(level)!.push(card)
  }

  // Shuffle within each level, then concat in level order
  const result: T[] = []
  const levels = Array.from(groups.keys()).sort((a, b) => a - b)
  for (const level of levels) {
    result.push(...shuffle(groups.get(level)!))
  }
  return result
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
