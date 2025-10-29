import './globals.css';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner';

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="chroma-bg">
        <div className="vybe-aurora-fixed" />
        {user && <Navbar />}
        <main className="flex justify-center w-full px-4 sm:px-6">
          <div className="w-full max-w-6xl">
            {children}
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
