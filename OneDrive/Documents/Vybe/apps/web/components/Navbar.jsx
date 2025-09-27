'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Music2, Library, User as UserIcon } from 'lucide-react';
import SignOutButton from './SignOutButton'; 
const links = [
  { href: '/',        label: 'Home',     Icon: Home },
  { href: '/groups',  label: 'Groups',   Icon: Users },
  { href: '/playlist',label: 'Playlist', Icon: Music2 },
  { href: '/library', label: 'Library',  Icon: Library },
  { href: '/profile', label: 'Profile',  Icon: UserIcon },
];

function NavPill({ href, label, Icon, active }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition',
        active
          ? 'bg-white text-black shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
      ].join(' ')}
    >
      <Icon className={`h-4 w-4 ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-6 px-4">
        {/* brand */}
        <Link href="/" className="text-xl font-extrabold">
          <span className="text-yellow-400">Vybe</span>
        </Link>

        {/* links */}
        <div className="flex items-center gap-2">
          {links.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return <NavPill key={href} href={href} label={label} Icon={Icon} active={isActive} />;
          })}
        </div>

        {/* right-side actions */}
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
