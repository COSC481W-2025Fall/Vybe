'use client';

export default function VybeLogo({ className = '' }) {
  return (
    <span className={[
      'vybe-logo-text text-2xl font-extrabold tracking-tight select-none',
      className,
    ].join(' ')}>
      Vybe
    </span>
  );
}


