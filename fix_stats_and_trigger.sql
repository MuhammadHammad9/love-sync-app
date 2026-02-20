-- 1. UPDATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_couple_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Check for new Photos (Count independently)
    -- If photo_a was added
    IF (NEW.photo_a IS NOT NULL AND OLD.photo_a IS NULL) THEN
        UPDATE couples SET photos_shared = photos_shared + 1 WHERE id = NEW.couple_id;
    END IF;

    -- If photo_b was added
    IF (NEW.photo_b IS NOT NULL AND OLD.photo_b IS NULL) THEN
        UPDATE couples SET photos_shared = photos_shared + 1 WHERE id = NEW.couple_id;
    END IF;

    -- 2. Check for FULL COMPLETION (Both Answered AND Both Photos) for Streak & Question Stats
    -- Condition: All 4 fields must be present in NEW, and they weren't all present in OLD.
    IF (NEW.answer_a IS NOT NULL AND NEW.answer_b IS NOT NULL AND NEW.photo_a IS NOT NULL AND NEW.photo_b IS NOT NULL) AND 
       (OLD.answer_a IS NULL OR OLD.answer_b IS NULL OR OLD.photo_a IS NULL OR OLD.photo_b IS NULL) THEN
       
       UPDATE couples 
       SET 
         questions_answered = questions_answered + 1,
         streak_count = streak_count + 1 
       WHERE id = NEW.couple_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RECALCULATE EXISTING STATS
-- This ensures the dashboard numbers match the actual data in daily_prompts
WITH stats AS (
  SELECT 
    couple_id,
    -- Count rows where both answered and both photos exist for "questions_answered" (completed days)
    COUNT(*) FILTER (WHERE answer_a IS NOT NULL AND answer_b IS NOT NULL AND photo_a IS NOT NULL AND photo_b IS NOT NULL) as completed_days,
    -- Count total photos shared
    (COUNT(photo_a) + COUNT(photo_b)) as total_photos
  FROM daily_prompts
  GROUP BY couple_id
)
UPDATE couples
SET 
  questions_answered = stats.completed_days,
  streak_count = stats.completed_days, -- Reset streak to total completed days for accuracy
  photos_shared = stats.total_photos
FROM stats
WHERE couples.id = stats.couple_id;
