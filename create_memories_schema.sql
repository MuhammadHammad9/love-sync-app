-- Drop table to ensure clean schema (fixes column name mismatches)
DROP TABLE IF EXISTS memories CASCADE;

-- Create Memories Table
CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  taken_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Allow read access to partners in the same couple
CREATE POLICY "Partners can view their couple's memories"
ON memories FOR SELECT
USING (
  auth.uid() IN (
    SELECT partner_a FROM couples WHERE id = memories.couple_id
    UNION
    SELECT partner_b FROM couples WHERE id = memories.couple_id
  )
);

-- Allow insert access to partners in the same couple
CREATE POLICY "Partners can insert memories for their couple"
ON memories FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT partner_a FROM couples WHERE id = memories.couple_id
    UNION
    SELECT partner_b FROM couples WHERE id = memories.couple_id
  )
);

-- Allow delete access to the uploader
CREATE POLICY "Users can delete their own memories"
ON memories FOR DELETE
USING (auth.uid() = uploaded_by);
