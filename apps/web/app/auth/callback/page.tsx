import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function Callback({
  searchParams,
}: { searchParams: { code?: string } }) {
  const code = searchParams.code;
  if (code) {
    const supabase = createServerComponentClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
  }
  redirect('/');
}
