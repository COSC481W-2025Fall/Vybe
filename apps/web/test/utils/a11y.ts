import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

export async function expectA11y(container: HTMLElement) {
  const results = await axe(container, {
    rules: {
      // relax color-contrast for dev theme if needed; keep enabled by default
    },
  });
  expect(results).toHaveNoViolations();
}



