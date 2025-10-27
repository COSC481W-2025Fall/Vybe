import { Suspense } from 'react';

export default function SettingsLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-[#0f0f0f]">
      {children}
    </div>
  );
}

