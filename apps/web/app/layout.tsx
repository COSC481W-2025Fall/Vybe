import './globals.css';
import { supabaseServer } from '@/lib/supabase/server';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  return (
    <html lang="en">
      <body>
        <nav className="flex items-center gap-4 p-4 border-b">
          <a href="/">Vybe</a>
          <div className="ml-auto">
            {user ? (
              <form action="/sign-out" method="post">
                <button className="px-3 py-1 rounded border">Sign out</button>
              </form>
            ) : (
              <a className="px-3 py-1 rounded border" href="/sign-in">Sign in</a>
            )}
          </div>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
