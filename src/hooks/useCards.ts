import { useLiveQuery } from 'dexie-react-hooks'
import { v4 as uuidv4 } from 'uuid'
import { db, type Card } from '@/lib/db'

export function useCards(filterTags?: string[]) {
  const cards = useLiveQuery(async () => {
    const all = await db.cards.filter((c) => !c.deleted).toArray()

    if (filterTags && filterTags.length > 0) {
      return all.filter((card) =>
        filterTags.some((ft) =>
          card.tags.some((t) => t.toLowerCase().startsWith(ft.toLowerCase()))
        )
      )
    }
    return all
  }, [filterTags])

  const addCard = async (
    front: string,
    back: string,
    tags: string[]
  ): Promise<Card> => {
    const now = Date.now()
    const card: Card = {
      id: uuidv4(),
      front,
      back,
      tags,
      created_at: now,
      updated_at: now,
      deleted: false,
      ease_factor: 2.5,
      interval: 0,
      repetitions: 0,
      next_review: now,
      sync_status: 'pending',
    }
    await db.cards.put(card)
    return card
  }

  const updateCard = async (
    id: string,
    updates: Partial<Pick<Card, 'front' | 'back' | 'tags'>>
  ) => {
    await db.cards.update(id, {
      ...updates,
      updated_at: Date.now(),
      sync_status: 'pending',
    })
  }

  const deleteCard = async (id: string) => {
    await db.cards.update(id, {
      deleted: true,
      updated_at: Date.now(),
      sync_status: 'pending',
    })
  }

  const importCards = async (cards: Card[]) => {
    // Deduplicate: if front matches existing card, update instead
    for (const card of cards) {
      const existing = await db.cards
        .filter((c) => c.front === card.front && !c.deleted)
        .first()

      if (existing) {
        await db.cards.update(existing.id, {
          back: card.back,
          tags: card.tags,
          updated_at: Date.now(),
          sync_status: 'pending',
        })
      } else {
        await db.cards.put(card)
      }
    }
  }

  return { cards: cards ?? [], addCard, updateCard, deleteCard, importCards }
}

export function useAllCards() {
  const cards = useLiveQuery(() =>
    db.cards.filter((c) => !c.deleted).toArray()
  )
  return cards ?? []
}

export function useAllTags() {
  const tags = useLiveQuery(async () => {
    const cards = await db.cards.filter((c) => !c.deleted).toArray()
    const tagSet = new Set<string>()
    for (const card of cards) {
      for (const tag of card.tags) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  })
  return tags ?? []
}
