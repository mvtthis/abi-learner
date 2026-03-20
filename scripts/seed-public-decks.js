/**
 * Seed Public Decks into Supabase
 *
 * Usage:
 *   1. Erstelle scripts/.env.seed mit:
 *      SUPABASE_URL=https://xxx.supabase.co
 *      SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 *   2. node scripts/seed-public-decks.js
 *
 * Reads all .txt files from anki-decks/ and creates public_decks + public_cards in Supabase.
 * Uses the Service Role Key to bypass RLS.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ANKI_DIR = join(__dirname, '..', 'anki-decks')

// Load env from scripts/.env.seed
const envPath = join(__dirname, '.env.seed')
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim()
      const value = trimmed.slice(eqIndex + 1).trim()
      process.env[key] = value
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Fehlende Credentials!')
  console.error('')
  console.error('Erstelle die Datei scripts/.env.seed mit:')
  console.error('  SUPABASE_URL=https://xxx.supabase.co')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJ...')
  console.error('')
  console.error('Den Service Role Key findest du in:')
  console.error('  Supabase Dashboard → Settings → API → service_role (secret)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Deck metadata mapping: filename → deck info
const DECK_META = {
  'Bio_Stoffwechsel_Anki.txt': {
    name: 'Bio: Stoffwechsel',
    subject: 'bio',
    emoji: '🧬',
    description: 'Enzymatik, Fotosynthese, Zellatmung — Karten auf eA-Niveau',
  },
  'Bio_Genetik_Anki.txt': {
    name: 'Bio: Genetik & Molekularbiologie',
    subject: 'bio',
    emoji: '🧬',
    description: 'DNA-Replikation, Proteinbiosynthese, Genregulation, Gentechnik',
  },
  'Bio_Neurobiologie_Anki.txt': {
    name: 'Bio: Neurobiologie',
    subject: 'bio',
    emoji: '🧬',
    description: 'Ruhepotenzial, Aktionspotenzial, Synapse, Synapsengifte',
  },
  'Bio_Oekologie_Anki.txt': {
    name: 'Bio: Ökologie',
    subject: 'bio',
    emoji: '🧬',
    description: 'Toleranzkurve, Lotka-Volterra, Stoffkreisläufe, Sukzession',
  },
  'Bio_Evolution_Anki.txt': {
    name: 'Bio: Evolution',
    subject: 'bio',
    emoji: '🧬',
    description: 'Selektion, Artbildung, Hardy-Weinberg, Coevolution',
  },
  'Geschichte_Methodik_Wahlmodule_Anki.txt': {
    name: 'Geschichte: Methodik & Wahlmodule 2026',
    subject: 'geschichte',
    emoji: '🏛️',
    description: 'Quellenanalyse, Operatoren, alle 4 Wahlmodule NDS 2026',
  },
  'Sport_Theorie_Anki.txt': {
    name: 'Sport: Theorie eA',
    subject: 'sport',
    emoji: '⚽',
    description: 'Trainingslehre, Bewegungsanalyse, Sportmedizin, Psychologie',
  },
  'Deutsch_Stilmittel_Epochen_Anki.txt': {
    name: 'Deutsch: Stilmittel, Epochen & Lektüren',
    subject: 'deutsch',
    emoji: '📖',
    description: 'Stilmittel, Epochen, Pflichtlektüren NDS 2026, Gedichtinterpretation',
  },
  'Englisch_Muendlich_Anki.txt': {
    name: 'Englisch: Mündliche Prüfung',
    subject: 'englisch',
    emoji: '🇬🇧',
    description: 'Useful Phrases, Bildbeschreibung, Abi-relevante Topics',
  },
}

function parseAnkiFile(content) {
  const lines = content.split('\n')
  let separator = '\t'
  let tagsColumn = null
  const cards = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('#')) {
      const lower = trimmed.toLowerCase()
      if (lower.includes('separator:tab')) separator = '\t'
      else if (lower.includes('separator:semicolon')) separator = ';'
      const tagsMatch = lower.match(/tags column:(\d+)/)
      if (tagsMatch) tagsColumn = parseInt(tagsMatch[1])
      continue
    }

    const parts = line.split(separator)
    if (parts.length < 2) continue

    const front = parts[0].trim()
    const back = parts[1].trim()
    let tags = []

    if (tagsColumn !== null && parts.length >= tagsColumn) {
      const tagStr = parts[tagsColumn - 1].trim()
      if (tagStr) tags = tagStr.split(/\s+/).filter(Boolean)
    }

    if (front && back) {
      cards.push({ front, back, tags })
    }
  }

  return cards
}

async function main() {
  console.log('🗑️  Clearing existing public decks and cards...')

  // Delete in correct order (foreign keys)
  await supabase.from('user_deck_imports').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('public_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('public_decks').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  const files = readdirSync(ANKI_DIR).filter((f) => f.endsWith('.txt'))
  let totalDecks = 0
  let totalCards = 0

  for (const filename of files) {
    const meta = DECK_META[filename]
    if (!meta) {
      console.log(`⚠️  Skipping ${filename} — no metadata defined`)
      continue
    }

    const content = readFileSync(join(ANKI_DIR, filename), 'utf-8')
    const cards = parseAnkiFile(content)

    console.log(`📦 ${meta.name}: ${cards.length} Karten`)

    // Insert deck
    const { data: deck, error: deckError } = await supabase
      .from('public_decks')
      .insert({
        name: meta.name,
        description: meta.description,
        subject: meta.subject,
        emoji: meta.emoji,
        card_count: cards.length,
      })
      .select()
      .single()

    if (deckError) {
      console.error(`❌ Error creating deck ${meta.name}:`, deckError.message)
      continue
    }

    // Insert cards in batches of 50
    const cardRows = cards.map((c) => ({
      deck_id: deck.id,
      front: c.front,
      back: c.back,
      tags: c.tags,
    }))

    for (let i = 0; i < cardRows.length; i += 50) {
      const batch = cardRows.slice(i, i + 50)
      const { error: cardError } = await supabase
        .from('public_cards')
        .insert(batch)

      if (cardError) {
        console.error(`❌ Error inserting cards for ${meta.name}:`, cardError.message)
      }
    }

    totalDecks++
    totalCards += cards.length
  }

  console.log(`\n✅ Done! ${totalDecks} Decks, ${totalCards} Karten seeded.`)
}

main().catch(console.error)
