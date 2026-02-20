-- Create Game History Table
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  winner_id UUID REFERENCES public.profiles(id), -- NULL if draw
  played_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  game_type TEXT DEFAULT 'tictactoe'
);

-- Enable RLS
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Couples can view their own games"
    ON public.game_history FOR SELECT
    USING (couple_id IN (
        SELECT couple_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Partners can insert games"
    ON public.game_history FOR INSERT
    WITH CHECK (couple_id IN (
        SELECT couple_id FROM public.profiles WHERE id = auth.uid()
    ));
