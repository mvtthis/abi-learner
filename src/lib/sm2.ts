export interface SM2Result {
  ease_factor: number
  interval: number
  repetitions: number
  next_review: number
}

export function sm2(
  quality: number,
  prevEaseFactor: number,
  prevInterval: number,
  prevRepetitions: number
): SM2Result {
  let easeFactor = prevEaseFactor
  let interval: number
  let repetitions: number

  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (prevRepetitions === 0) {
      interval = 1
    } else if (prevRepetitions === 1) {
      interval = 3
    } else {
      interval = Math.round(prevInterval * easeFactor)
    }
    repetitions = prevRepetitions + 1
  }

  // SM-2 ease factor adjustment
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  // For "Again" (quality 0-1), show again in 1 minute (stored as fraction of a day)
  if (quality <= 1) {
    interval = 0 // Will be shown again this session
  }

  // For "Hard" (quality 2-3), reduce interval growth
  if (quality === 2 || quality === 3) {
    interval = Math.max(1, Math.round(prevInterval * 1.2))
    if (prevRepetitions === 0) interval = 1
  }

  const now = Date.now()
  const next_review = now + interval * 24 * 60 * 60 * 1000

  return { ease_factor: easeFactor, interval, repetitions, next_review }
}
