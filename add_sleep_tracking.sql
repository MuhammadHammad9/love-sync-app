-- Add last_slept_at column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_slept_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_slept_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
