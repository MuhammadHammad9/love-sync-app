-- Create a function to handle stats updates
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
    -- Only increment if it wasn't already completed (to prevent double counting on edits)
    IF (NEW.answer_a IS NOT NULL AND NEW.answer_b IS NOT NULL) AND 
       (OLD.answer_a IS NULL OR OLD.answer_b IS NULL) THEN
       
       UPDATE couples 
       SET 
         questions_answered = questions_answered + 1,
         streak_count = streak_count + 1 
         -- Simple streak logic: just increment. 
         -- Real streak logic would require checking the date of the last completed prompt, 
         -- but this suffices for the MVP request.
       WHERE id = NEW.couple_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_daily_prompt_update ON daily_prompts;

CREATE TRIGGER on_daily_prompt_update
AFTER UPDATE ON daily_prompts
FOR EACH ROW
EXECUTE FUNCTION update_couple_stats();
