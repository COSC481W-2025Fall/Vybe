'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { HomePage } from '@/components/HomePage';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/sign-in');
    }
  };

  const handleNavigate = (screen, params) => {
    if (screen === 'groups' && params?.groupId) {
      router.push(`/groups/${params.groupId}`);
    } else {
      router.push(`/${screen}`);
    }
  };

  return <HomePage onNavigate={handleNavigate} />;
}
