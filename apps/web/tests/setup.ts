// Basic test setup for Vitest
import '@testing-library/jest-dom';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock Supabase
vi.mock('@supabase/auth-helpers-react', () => ({
  useUser: () => ({
    user: null,
    isLoading: false,
  }),
}));
