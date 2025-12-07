import './globals.css';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { Analytics } from "@vercel/analytics/next"
import Navbar from '@/components/Navbar';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/components/QueryProvider';
import UrlTokenCleanup from '@/components/UrlTokenCleanup';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { RealtimeProvider } from '@/lib/realtime/RealtimeProvider';
import { GlobalStateProvider } from '@/lib/context/GlobalStateContext';
import GlobalProgressBar from '@/components/shared/GlobalProgressBar';
import GlobalMiniplayer from '@/components/shared/GlobalMiniplayer';
import AuroraBackground from '@/components/AuroraBackground';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var cookies = document.cookie.split('; ').reduce(function(acc, current) {
                    var parts = current.split('=');
                    acc[parts[0]] = parts[1];
                    return acc;
                  }, {});
                  var theme = cookies.theme || 'system';
                  var effectiveTheme = theme;
                  
                  if (theme === 'system') {
                    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } else if (theme === 'custom') {
                    effectiveTheme = 'custom';
                  }
                  
                  document.documentElement.setAttribute('data-theme', effectiveTheme);
                  
                  if (theme === 'custom') {
                    var customTheme = localStorage.getItem('customTheme');
                    if (customTheme) {
                      var colors = JSON.parse(customTheme);
                      if (colors.background) document.documentElement.style.setProperty('--background', colors.background);
                      if (colors.foreground) document.documentElement.style.setProperty('--foreground', colors.foreground);
                      if (colors.accent) document.documentElement.style.setProperty('--accent', colors.accent);
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="chroma-bg" suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <RealtimeProvider>
              <GlobalStateProvider>
                <Suspense fallback={null}>
                  <UrlTokenCleanup />
                </Suspense>
                <AuroraBackground />
                {user && <Navbar />}
                <main className="flex justify-center w-full px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
                  <div className="w-full max-w-6xl">
                    {children}
                  </div>
                </main>
                <Toaster />
                <GlobalProgressBar />
                <GlobalMiniplayer />
              </GlobalStateProvider>
            </RealtimeProvider>
          </QueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
