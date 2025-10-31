import './globals.css';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/Navbar';
import ClientProviders from '@/components/ClientProviders';

import { supabaseServer } from '@/lib/supabase/server';

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {user && <Navbar />}
          <main className="flex justify-center">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}
