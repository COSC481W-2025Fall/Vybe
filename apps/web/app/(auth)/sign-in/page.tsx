'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const sendLink = async () => {
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) alert(error.message);
    else setSent(true);
  };

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {sent ? (
        <p>Check your email for the magic link.</p>
      ) : (
        <div className="space-y-3">
          <input
            className="w-full border rounded p-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="rounded bg-black text-white px-4 py-2" onClick={sendLink}>
            Send link
          </button>
        </div>
      )}
    </div>
  );
}
