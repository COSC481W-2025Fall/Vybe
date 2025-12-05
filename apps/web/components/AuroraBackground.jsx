'use client';

import { useTheme } from '@/components/providers/ThemeProvider';

export default function AuroraBackground() {
  const { animationEnabled } = useTheme();
  
  return (
    <>
      {/* Main aurora layers (::before and ::after) */}
      <div 
        className={`vybe-aurora-fixed ${!animationEnabled ? 'animation-paused' : ''}`}
        aria-hidden="true"
      />
      
      {/* Extra diffusion layer - creates depth and organic feel */}
      <div 
        className={`aurora-diffusion-layer ${!animationEnabled ? 'animation-paused' : ''}`}
        aria-hidden="true"
      />
    </>
  );
}
