-- Create Daily Notes Table for Contextual Poet
-- Stores one AI-generated note per couple per day to avoid re-generation
CREATE TABLE IF NOT EXISTS daily_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  note_date DATE DEFAULT CURRENT_DATE NOT NULL,
  content TEXT NOT NULL,
  weather_context TEXT,
  mood_context TEXT,
  memory_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(couple_id, note_date) -- Ensure only one note per day per couple
);

-- Enable RLS
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- Allow read access to partners
CREATE POLICY "Partners can view their couple's daily notes"
ON daily_notes FOR SELECT
USING (
  auth.uid() IN (
    SELECT partner_a FROM couples WHERE id = daily_notes.couple_id
    UNION
    SELECT partner_b FROM couples WHERE id = daily_notes.couple_id
  )
);

-- Allow insert access to partners (lazy generation)
CREATE POLICY "Partners can insert daily notes"
ON daily_notes FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT partner_a FROM couples WHERE id = daily_notes.couple_id
    UNION
    SELECT partner_b FROM couples WHERE id = daily_notes.couple_id
  )
);
