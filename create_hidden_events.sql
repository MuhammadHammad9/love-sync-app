-- 1. Create table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS public.hidden_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    location TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'Heart',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Schema Migration: Ensure 'unlock_date' and 'title' exist and 'location' is correct
DO $$
BEGIN
    -- Add unlock_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hidden_events' AND column_name = 'unlock_date') THEN
        ALTER TABLE public.hidden_events ADD COLUMN unlock_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add title if missing (original schema might have missed it or different version)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hidden_events' AND column_name = 'title') THEN
        ALTER TABLE public.hidden_events ADD COLUMN title TEXT;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.hidden_events ENABLE ROW LEVEL SECURITY;

-- 4. Clean up old policies (Fixes "policy already exists" error)
DROP POLICY IF EXISTS "Couples can view their own events" ON public.hidden_events;
DROP POLICY IF EXISTS "Partners can insert events" ON public.hidden_events;
DROP POLICY IF EXISTS "Partners can update their own events" ON public.hidden_events;
DROP POLICY IF EXISTS "Partners can delete their own events" ON public.hidden_events;

-- 5. Re-create Policies
CREATE POLICY "Couples can view their own events"
    ON public.hidden_events FOR SELECT
    USING (couple_id IN (
        SELECT couple_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Partners can insert events"
    ON public.hidden_events FOR INSERT
    WITH CHECK (couple_id IN (
        SELECT couple_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Partners can update their own events"
    ON public.hidden_events FOR UPDATE
    USING (couple_id IN (
        SELECT couple_id FROM public.profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Partners can delete their own events"
    ON public.hidden_events FOR DELETE
    USING (couple_id IN (
        SELECT couple_id FROM public.profiles WHERE id = auth.uid()
    ));
