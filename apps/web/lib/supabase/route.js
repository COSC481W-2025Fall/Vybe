import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// For Next.js 15+, cookies() is async and must be awaited
export const supabaseRoute = async () => {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
};
