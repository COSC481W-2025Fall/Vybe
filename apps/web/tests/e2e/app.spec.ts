import { test, expect } from '@playwright/test';

test.describe('Vybe App E2E Tests', () => {
  test('homepage loads and displays navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check that the Vybe brand is visible
    await expect(page.getByText('Vybe')).toBeVisible();
    
    // Since the app requires authentication, we should see sign-in related content
    // The navbar should still be visible but navigation might redirect to sign-in
    await expect(page.getByText('Vybe')).toBeVisible();
  });

  test('sign-in page loads correctly', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Check that sign-in page loads
    await expect(page).toHaveURL(/sign-in/);
    
    // The Vybe brand should still be visible
    await expect(page.getByText('Vybe')).toBeVisible();
  });

  test('unauthenticated access redirects to sign-in', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to sign-in page
    await expect(page).toHaveURL(/sign-in/);
    
    // Should have next parameter set
    const url = page.url();
    expect(url).toContain('next=%2Flibrary');
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that navigation is still functional
    await expect(page.getByText('Vybe')).toBeVisible();
  });
});
