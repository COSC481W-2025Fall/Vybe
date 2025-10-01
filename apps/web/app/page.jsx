'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = supabaseBrowser();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is signed in, redirect to library
        router.push('/library');
      } else {
        // User is not signed in, redirect to sign-in
        router.push('/sign-in');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl mb-4">Loading...</h1>
        <p className="text-gray-500">Redirecting you to the right page</p>
      </div>
    </div>
  );
}