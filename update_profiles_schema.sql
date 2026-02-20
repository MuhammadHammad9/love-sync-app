-- Update Profiles Schema for Username and Avatar Upload
-- Run this in Supabase SQL Editor

-- 1. Ensure username has constraints (if needed)
-- Note: username already exists in schema.sql, this adds NOT NULL if missing
DO $$ 
BEGIN
    -- Add NOT NULL constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'username' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;
    END IF;
END $$;

-- 2. Create avatars storage bucket (if not exists)
-- Run this in Supabase Dashboard > Storage > Create Bucket
-- OR via SQL (requires storage extension)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS on storage.objects for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Note about passwords:
-- Passwords are securely stored in auth.users table (managed by Supabase Auth)
-- They are NOT stored in the profiles table
-- This is the recommended security practice
