import './globals.css';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/components/QueryProvider';
import UrlTokenCleanup from '@/components/UrlTokenCleanup';

export const metadata = {
  title: 'Vybe',
  description: 'Music collaboration platform',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

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
      <body className="chroma-bg" suppressHydrationWarning>
        <QueryProvider>
          <Suspense fallback={null}>
            <UrlTokenCleanup />
          </Suspense>
          <div className="vybe-aurora-fixed" />
          {user && <Navbar />}
          <main className="flex justify-center w-full px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
            <div className="w-full max-w-6xl">
              {children}
            </div>
          </main>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
