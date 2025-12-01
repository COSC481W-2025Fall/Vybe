'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function Home() {
  const router = useRouter();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    const supabase = supabaseBrowser();
    const { data: { session } } = await supabase.auth.getSession();
    
    // Let the animation play, then fade out before redirect
    await new Promise(resolve => setTimeout(resolve, 1200));
    setFadeOut(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    if (session) {
      router.replace('/dashboard');
    } else {
      router.replace('/sign-in');
    }
  };

  return (
    <div 
      className={`min-h-screen flex items-center justify-center bg-[var(--background)] transition-opacity duration-400 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Subtle radial glow behind logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)'
          }}
        />
      </div>
      
      {/* Logo container */}
      <div className="relative flex flex-col items-center">
        {/* Main logo with entrance animation */}
        <span 
          className="vybe-logo-text text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter animate-[fadeInScale_0.8s_ease-out_forwards]"
          style={{
            opacity: 0,
            animationDelay: '0.1s'
          }}
        >
          Vybe
        </span>
        
        {/* Subtle loading dots */}
        <div className="flex gap-1.5 mt-8 animate-[fadeIn_0.5s_ease-out_0.6s_forwards]" style={{ opacity: 0 }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted-foreground)] animate-[bounce_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
