'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { HomePage } from '@/components/HomePage';

export default function Dashboard() {
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
    if (screen === 'groups' && params?.groupSlug) {
      router.push(`/groups/${params.groupSlug}`);
    } else {
      router.push(`/${screen}`);
    }
  };

  return <HomePage onNavigate={handleNavigate} />;
}

