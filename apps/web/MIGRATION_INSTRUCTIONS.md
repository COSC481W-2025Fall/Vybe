# Database Migration Instructions

## Communities Table Migration

To fix the "Error fetching communities" error, you need to run the database migration to create the `communities` table.

### Option 1: Run in Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `apps/web/supabase/migrations/009_create_communities_table.sql`
5. Click **Run** (or press Ctrl+Enter)
6. Verify the table was created by checking the **Table Editor** - you should see a `communities` table

### Option 2: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
cd apps/web
supabase db push
```

Or run the specific migration:

```bash
supabase migration up --file supabase/migrations/009_create_communities_table.sql
```

### Option 3: Run Curated Songs Migration (Optional)

If you want to use the song curation feature, also run:

1. Copy contents of `apps/web/supabase/migrations/010_create_curated_songs_table.sql`
2. Run in Supabase SQL Editor

### Verify Migration

After running the migration, you can verify it worked by:

1. Check the **Table Editor** in Supabase - you should see:
   - `communities` table
   - `curated_songs` table (if you ran that migration too)

2. The error should disappear and communities should load (even if empty)

3. You can now access the admin console and create communities

### Troubleshooting

If you still see errors:

1. **Check RLS Policies**: Make sure the Row Level Security policies were created correctly
2. **Check Permissions**: Verify your Supabase user has the necessary permissions
3. **Check Console**: Look at the browser console for more detailed error messages

### Next Steps

After running the migration:

1. Access the admin console (click bottom-right corner 10 times quickly on homepage)
2. Create your first community
3. Add playlist links
4. Curate songs if needed

