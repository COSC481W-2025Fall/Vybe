'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
<<<<<<< HEAD
import { HomePage } from '@/components/HomePage';
=======
>>>>>>> 2cf79ae775545c31935108f06979a795fe08bdad

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
<<<<<<< HEAD
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
=======
    } else {
      router.push('/dashboard');
    }
  };

  return null; // Will redirect immediately
>>>>>>> 2cf79ae775545c31935108f06979a795fe08bdad
}
