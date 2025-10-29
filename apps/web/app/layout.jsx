import './globals.css';
import { cookies } from 'next/headers';
import Navbar from '@/components/Navbar';

// Helper: only create the Supabase client if env vars exist
async function maybeCreateSupabase(cookieStore) {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) return null;

  // Dynamic import so it only loads when we actually have keys
  const { createServerComponentClient } = await import('@supabase/auth-helpers-nextjs');
  return createServerComponentClient({
    cookies: () => cookieStore,
  });
}

export default async function RootLayout({ children }) {
  // Note: cookies() is sync
  const cookieStore = cookies();

  const supabase = await maybeCreateSupabase(cookieStore);

  let user = null;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  }

  return (
    <html lang="en">
      <body>
        {user && <Navbar />}
        <main className="flex justify-center">{children}</main>
      </body>
    </html>
  );
}
