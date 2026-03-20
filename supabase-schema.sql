-- ============================================
-- Abi-Learner: Supabase Schema
-- Einmal im Supabase SQL Editor ausführen
-- ============================================

-- User-Karten
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted BOOLEAN DEFAULT FALSE,
    ease_factor REAL DEFAULT 2.5,
    interval INTEGER DEFAULT 0,
    repetitions INTEGER DEFAULT 0,
    next_review TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Review-History
CREATE TABLE review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    card_id UUID REFERENCES cards(id) NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    interval INTEGER NOT NULL,
    ease_factor REAL NOT NULL
);

-- Indexes für Sync-Performance
CREATE INDEX idx_cards_updated ON cards(user_id, updated_at);
CREATE INDEX idx_cards_next_review ON cards(user_id, next_review) WHERE deleted = FALSE;
CREATE INDEX idx_reviews_reviewed ON review_logs(user_id, reviewed_at);

-- RLS für User-Daten
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own cards"
    ON cards FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own reviews"
    ON review_logs FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Öffentliche Decks (read-only für User)
-- ============================================

CREATE TABLE public_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    subject TEXT NOT NULL,
    emoji TEXT DEFAULT '📚',
    card_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public_decks(id) NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_public_cards_deck ON public_cards(deck_id);

-- Tracking welche Decks ein User importiert hat
CREATE TABLE user_deck_imports (
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    deck_id UUID REFERENCES public_decks(id) NOT NULL,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, deck_id)
);

-- RLS für öffentliche Decks
ALTER TABLE public_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_deck_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public decks are readable by everyone"
    ON public_decks FOR SELECT USING (true);

CREATE POLICY "Public cards are readable by everyone"
    ON public_cards FOR SELECT USING (true);

CREATE POLICY "Users can manage own deck imports"
    ON user_deck_imports FOR ALL USING (auth.uid() = user_id);
