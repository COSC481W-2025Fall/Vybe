import { test, expect } from '@playwright/test';

test.describe('Vybe App E2E Tests', () => {
  test('homepage redirects to sign-in when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/sign-in/);
    
    // Check that sign-in page loads (use more specific selector to avoid route announcer)
    await expect(page.getByRole('heading', { name: 'Welcome to Vybe' })).toBeVisible();
  });

  test('sign-in page loads correctly', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Check that sign-in page loads
    await expect(page).toHaveURL(/sign-in/);
    
    // Check sign-in content
    await expect(page.getByText('Welcome to Vybe')).toBeVisible();
    await expect(page.getByText('Continue with Spotify')).toBeVisible();
    await expect(page.getByText('Continue with YouTube')).toBeVisible();
  });

  test('protected pages redirect to sign-in when not authenticated', async ({ page }) => {
    const protectedPages = ['/library', '/groups', '/playlist', '/profile'];
    
    for (const path of protectedPages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to sign-in page
      await expect(page).toHaveURL(/sign-in/);
      
      // Should have next parameter set
      const url = page.url();
      expect(url).toContain(`next=${encodeURIComponent(path)}`);
    }
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Check that sign-in page is still functional
    await expect(page.getByRole('heading', { name: 'Welcome to Vybe' })).toBeVisible();
  });
});
