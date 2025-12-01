import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// For Next.js 15+, cookies() is async and must be awaited
export const supabaseRoute = async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method may fail in certain contexts (Server Components)
            // This is expected behavior
          }
        },
      },
    }
  );
};
