import './globals.css';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/Navbar';


import { supabaseServer } from '@/lib/supabase/server';

export default async function RootLayout({ children }) {
  const supabase = createServerComponentClient({cookies});
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        {user && <Navbar />}
        <main className="flex justify-center">{children}</main>
      </body>
    </html>
  );
}
