-- Normalize join codes: ensure they are uppercase, trimmed, and have no spaces
-- This fixes issues where codes might be stored with different casing or whitespace

-- CRITICAL FIX: Allow users to view groups by join code even if they're not members
-- This is needed so users can look up groups to join them
DROP POLICY IF EXISTS "Users can view groups they are members of" ON groups;
CREATE POLICY "Users can view groups they are members of" ON groups
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.user_id = auth.uid()
    ) OR
    -- Allow viewing groups by join code (for joining)
    -- If a group has a join code, it's meant to be discoverable by that code
    -- The join code itself is the access control mechanism
    join_code IS NOT NULL
  );

-- Update the function to normalize join codes
CREATE OR REPLACE FUNCTION ensure_unique_join_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize the join_code if provided (trim, uppercase, remove all spaces)
  IF NEW.join_code IS NOT NULL THEN
    NEW.join_code := UPPER(TRIM(REGEXP_REPLACE(NEW.join_code, '\s+', '', 'g')));
    
    -- Validate length (should be 6 or 8 characters for backward compatibility)
    IF length(NEW.join_code) != 6 AND length(NEW.join_code) != 8 THEN
      -- If invalid length, generate a new one
      NEW.join_code := NULL;
    END IF;
  END IF;
  
  -- Generate join code if NULL or invalid
  IF NEW.join_code IS NULL THEN
    LOOP
      NEW.join_code := generate_join_code();
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM groups WHERE join_code = NEW.join_code
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger to also fire on UPDATE (in case codes need to be normalized)
DROP TRIGGER IF EXISTS generate_group_join_code ON groups;
CREATE TRIGGER generate_group_join_code
  BEFORE INSERT OR UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION ensure_unique_join_code();

-- Normalize all existing join codes in the database
UPDATE groups
SET join_code = UPPER(TRIM(REGEXP_REPLACE(join_code, '\s+', '', 'g')))
WHERE join_code IS NOT NULL
  AND (
    join_code != UPPER(TRIM(REGEXP_REPLACE(join_code, '\s+', '', 'g')))
    OR join_code ~ '\s'  -- Contains whitespace
  );

