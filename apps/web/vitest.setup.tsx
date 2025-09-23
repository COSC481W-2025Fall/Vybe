import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import 'whatwg-fetch';

afterEach(() => {
  cleanup();
});

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual<any>('next/navigation');
  return {
    ...actual,
    usePathname: () => '/',
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => {
    return (
      <a href={typeof href === 'string' ? href : '#'} {...props}>
        {children}
      </a>
    );
  },
}));



