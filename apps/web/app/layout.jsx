import './globals.css';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/contexts/ThemeContext';

import { supabaseServer } from '@/lib/supabase/server';

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's theme preference from database if authenticated
  let initialTheme = 'system';
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('theme_preference')
      .eq('id', user.id)
      .single();
    
    if (data?.theme_preference) {
      initialTheme = data.theme_preference;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (theme && ['light', 'dark', 'system'].includes(theme)) {
      if (theme === 'system') {
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        theme = prefersDark ? 'dark' : 'light';
      }
      document.documentElement.classList.add(theme);
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var defaultTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.classList.add(defaultTheme);
      document.documentElement.setAttribute('data-theme', defaultTheme);
    }
  } catch (e) {
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
            `.trim(),
          }}
        />
      </head>
      <body>
        <ThemeProvider initialTheme={initialTheme}>
          {user && <Navbar />}
          <main className="flex justify-center">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
