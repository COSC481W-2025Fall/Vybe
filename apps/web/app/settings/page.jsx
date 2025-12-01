import { redirect } from 'next/navigation';

// Settings page now redirects directly to profile
// since Profile is the only settings section
export default function SettingsPage() {
  redirect('/settings/profile');
}
