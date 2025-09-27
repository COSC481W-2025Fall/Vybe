'use client';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    // TODO: add Supabase or auth signOut call if needed
    router.push('/login'); // change this if your login route is different
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-3 py-2 rounded-xl shadow text-sm hover:bg-gray-200"
    >
      Sign out
    </button>
  );
}
