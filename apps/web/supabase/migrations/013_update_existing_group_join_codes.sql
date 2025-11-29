-- Update existing groups with new 6-character join codes
-- This ensures all groups have properly formatted 6-character codes

-- First, ensure the generate_join_code function exists
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed similar looking chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a unique 6-character join code
CREATE OR REPLACE FUNCTION generate_unique_join_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := generate_join_code();
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM groups WHERE join_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update all groups with new 6-character join codes
-- This will regenerate codes for all groups to ensure consistency
UPDATE groups
SET join_code = generate_unique_join_code()
WHERE join_code IS NULL 
   OR length(join_code) != 6;

-- Clean up the temporary function (optional, can keep it for future use)
-- DROP FUNCTION IF EXISTS generate_unique_join_code();

