import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run the migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'last_used_provider'
          ) THEN
            ALTER TABLE users ADD COLUMN last_used_provider TEXT;
          END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS idx_users_last_used_provider ON users(last_used_provider);
      `
    });

    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({
        error: 'Migration failed',
        details: error.message,
        hint: 'Please run the migration manually in Supabase SQL Editor'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({
      error: 'Unexpected error',
      details: err.message
    }, { status: 500 });
  }
}
