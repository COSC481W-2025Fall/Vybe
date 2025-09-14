import './globals.css';
import Navbar from '@/components/Navbar';


import { supabaseServer } from '@/lib/supabase/server';

export default async function RootLayout({ children }) {
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <html lang="en">
      <body>
        <Navbar id="navigation"/>
        <main className="p-6 flex justify-center">{children}</main>
      </body>
    </html>
  );
}
