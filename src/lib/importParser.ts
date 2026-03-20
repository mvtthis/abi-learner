import { v4 as uuidv4 } from 'uuid'
import type { Card } from './db'

interface ParsedCard {
  front: string
  back: string
  tags: string[]
}

interface ImportResult {
  cards: ParsedCard[]
  meta: {
    separator: string
    html: boolean
    tagsColumn: number | null
  }
}

export function parseAnkiFile(content: string): ImportResult {
  const lines = content.split('\n')
  let separator = '\t'
  let html = false
  let tagsColumn: number | null = null
  const cards: ParsedCard[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Parse metadata lines
    if (trimmed.startsWith('#')) {
      const lower = trimmed.toLowerCase()
      if (lower.includes('separator:tab')) separator = '\t'
      else if (lower.includes('separator:semicolon')) separator = ';'
      else if (lower.includes('separator:comma')) separator = ','
      if (lower.includes('html:true')) html = true
      const tagsMatch = lower.match(/tags column:(\d+)/)
      if (tagsMatch) tagsColumn = parseInt(tagsMatch[1])
      continue
    }

    // Parse card lines
    const parts = line.split(separator)
    if (parts.length < 2) continue

    const front = parts[0].trim()
    const back = parts[1].trim()
    let tags: string[] = []

    if (tagsColumn !== null && parts.length >= tagsColumn) {
      const tagStr = parts[tagsColumn - 1].trim()
      if (tagStr) {
        tags = tagStr.split(/\s+/).filter(Boolean)
      }
    }

    if (front && back) {
      cards.push({ front, back, tags })
    }
  }

  return { cards, meta: { separator, html, tagsColumn } }
}

export function parsedCardsToCards(parsed: ParsedCard[]): Card[] {
  const now = Date.now()
  return parsed.map((p) => ({
    id: uuidv4(),
    front: p.front,
    back: p.back,
    tags: p.tags,
    created_at: now,
    updated_at: now,
    deleted: false,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: now,
    sync_status: 'pending' as const,
  }))
}
