-- Reapply Triggers for Streak Logic
-- Run this in Supabase SQL Editor to fix the streak tracking

-- 1. Create or Replace the Function
CREATE OR REPLACE FUNCTION update_couple_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Check for new Photos
    -- If photo_a was added
    IF (NEW.photo_a IS NOT NULL AND OLD.photo_a IS NULL) THEN
        UPDATE couples SET photos_shared = photos_shared + 1 WHERE id = NEW.couple_id;
    END IF;

    -- If photo_b was added
    IF (NEW.photo_b IS NOT NULL AND OLD.photo_b IS NULL) THEN
        UPDATE couples SET photos_shared = photos_shared + 1 WHERE id = NEW.couple_id;
    END IF;

    -- 2. Check for Completed Question (Both Answered)
    -- Logic: Both answers must be present in NEW, and at least one was missing in OLD.
    IF (NEW.answer_a IS NOT NULL AND NEW.answer_b IS NOT NULL) AND 
       (OLD.answer_a IS NULL OR OLD.answer_b IS NULL) THEN
       
       UPDATE couples 
       SET 
         questions_answered = questions_answered + 1,
         streak_count = streak_count + 1,
         last_streak_date = CURRENT_DATE
       WHERE id = NEW.couple_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-create the Trigger
DROP TRIGGER IF EXISTS on_daily_prompt_update ON daily_prompts;

CREATE TRIGGER on_daily_prompt_update
AFTER UPDATE ON daily_prompts
FOR EACH ROW
EXECUTE FUNCTION update_couple_stats();

-- 3. Verify Columns Exist (Just in case)
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE couples ADD COLUMN photos_shared integer default 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    BEGIN
        ALTER TABLE couples ADD COLUMN questions_answered integer default 0;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;
