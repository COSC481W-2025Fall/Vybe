-- Add slug column to groups table for clean URLs
ALTER TABLE groups ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Function to generate a URL-friendly slug from a name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := lower(trim(name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\s-]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  -- Limit length
  base_slug := left(base_slug, 50);
  
  -- If empty, use a default
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'group';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append number if needed
  WHILE EXISTS (SELECT 1 FROM groups WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Update existing groups to have slugs based on their names
UPDATE groups 
SET slug = generate_slug(name) 
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing rows
ALTER TABLE groups ALTER COLUMN slug SET NOT NULL;

-- Create trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION set_group_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_group_slug ON groups;
CREATE TRIGGER trigger_set_group_slug
  BEFORE INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_group_slug();

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);

