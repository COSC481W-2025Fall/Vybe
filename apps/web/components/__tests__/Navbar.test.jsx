'use client';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '@/components/Navbar.jsx';
import { vi } from 'vitest';
import { expectA11y } from '@/test/utils/a11y';

vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation');
  return { ...actual, usePathname: () => '/library' };
});

describe('Navbar', () => {
  it('renders brand and nav links', async () => {
    const { container } = render(<Navbar />);
    expect(screen.getByText('Vybe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Library/i })).toBeInTheDocument();
    await expectA11y(container);
  });

  it('marks the current route as active via aria-current', () => {
    render(<Navbar />);
    const libraryLink = screen.getByRole('link', { name: /Library/i });
    expect(libraryLink).toHaveAttribute('aria-current', 'page');
  });
});



