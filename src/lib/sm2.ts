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
  // Step 1: Update ease factor FIRST so interval uses current value
  const easeFactor = Math.max(
    1.3,
    prevEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  let interval: number
  let repetitions: number

  if (quality <= 1) {
    // "Again" — show again in 10 minutes, reset repetitions
    repetitions = 0
    const now = Date.now()
    const next_review = now + 10 * 60 * 1000 // 10 minutes
    return { ease_factor: easeFactor, interval: 0, repetitions, next_review }
  }

  if (quality === 2) {
    // "Hard" — keep current interval, don't advance repetitions much
    repetitions = Math.max(1, prevRepetitions)
    interval = Math.max(1, Math.round(prevInterval * 1.2))
    if (prevRepetitions === 0) interval = 1
  } else if (quality === 3) {
    // "Good" — standard SM-2 progression
    if (prevRepetitions === 0) {
      interval = 1
    } else if (prevRepetitions === 1) {
      interval = 3
    } else {
      interval = Math.round(prevInterval * easeFactor)
    }
    repetitions = prevRepetitions + 1
  } else {
    // "Easy" (quality 4-5) — boosted interval
    if (prevRepetitions === 0) {
      interval = 2
    } else if (prevRepetitions === 1) {
      interval = 4
    } else {
      interval = Math.round(prevInterval * easeFactor * 1.3)
    }
    repetitions = prevRepetitions + 1
  }

  const now = Date.now()
  const next_review = now + interval * 24 * 60 * 60 * 1000

  return { ease_factor: easeFactor, interval, repetitions, next_review }
}
