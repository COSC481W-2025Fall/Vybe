import { test, expect } from '@playwright/test';

test.describe('Sign-Out Button E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Supabase auth endpoints
    await page.route('**/auth/v1/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              user: {
                id: 'test-user-id',
                email: 'test@example.com',
                app_metadata: { provider: 'spotify' }
              }
            }
          })
        });
      } else if (url.includes('/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              session: {
                user: {
                  id: 'test-user-id',
                  email: 'test@example.com',
                  app_metadata: { provider: 'spotify' }
                },
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });
    
    // Mock the sign-out endpoint
    await page.route('**/sign-out', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
  });

  // TODO: Fix authentication mocking for E2E tests
  // test('sign-out button is visible when user is authenticated', async ({ page }) => {
  //   await page.goto('/library');
  //   
  //   // Wait for the navbar to load
  //   await page.waitForSelector('nav');
  //   
  //   // Check that the sign-out button is visible
  //   const signOutButton = page.getByRole('button', { name: /sign out/i });
  //   await expect(signOutButton).toBeVisible();
  //   
  //   // Check that it has the correct styling
  //   await expect(signOutButton).toHaveClass(/hover:text-red-400/);
  // });

  // TODO: Fix authentication mocking for E2E tests
  // test('clicking sign-out button triggers sign-out process', async ({ page }) => {
  //   await page.goto('/library');
  //   
  //   // Intercept the sign-out request
  //   const signOutRequest = page.waitForRequest('**/sign-out');
  //   
  //   const signOutButton = page.getByRole('button', { name: /sign out/i });
  //   await signOutButton.click();
  //   
  //   // Wait for the request to be made
  //   const request = await signOutRequest;
  //   expect(request.method()).toBe('POST');
  //   expect(request.url()).toContain('/sign-out');
  // });

  // TODO: Fix authentication mocking for E2E tests
  // test('sign-out button shows loading state during sign-out', async ({ page }) => {
  //   await page.goto('/library');
  //   
  //   // Mock a delayed response for sign-out
  //   await page.route('**/sign-out', async route => {
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //     await route.fulfill({
  //       status: 200,
  //       contentType: 'application/json',
  //       body: JSON.stringify({ success: true })
  //     });
  //   });
  //   
  //   const signOutButton = page.getByRole('button', { name: /sign out/i });
  //   await signOutButton.click();
  //   
  //   // Check that loading state is shown
  //   await expect(page.getByText('Logging out...')).toBeVisible();
  //   await expect(signOutButton).toBeDisabled();
  //   
  //   // Wait for the process to complete
  //   await page.waitForTimeout(1200);
  //   await expect(page.getByText('Log out')).toBeVisible();
  // });

  // TODO: Fix authentication mocking for E2E tests
  // test('successful sign-out redirects to sign-in page', async ({ page }) => {
  //   await page.goto('/library');
  //   
  //   // Mock successful sign-out response
  //   await page.route('**/sign-out', async route => {
  //     await route.fulfill({
  //       status: 200,
  //       contentType: 'application/json',
  //       body: JSON.stringify({ success: true })
  //     });
  //   });
  //   
  //   const signOutButton = page.getByRole('button', { name: /sign out/i });
  //   await signOutButton.click();
  //   
  //   // Wait for redirect to sign-in page
  //   await page.waitForURL('**/sign-in');
  //   await expect(page).toHaveURL(/sign-in/);
  // });

  // TODO: Fix authentication mocking for E2E tests
  // test('sign-out button is accessible with keyboard navigation', async ({ page }) => {
  //   await page.goto('/library');
  //   
  //   const signOutButton = page.getByRole('button', { name: /sign out/i });
  //   
  //   // Tab to the sign-out button
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Tab');
  //   await page.keyboard.press('Tab');
  //   
  //   // Check that the button is focused
  //   await expect(signOutButton).toBeFocused();
  //   
  //   // Press Enter to activate
  //   await page.keyboard.press('Enter');
  //   
  //   // Should trigger sign-out
  //   await page.waitForURL('**/sign-in');
  // });

  // TODO: Fix authentication mocking for E2E tests
  // test('sign-out button has proper ARIA attributes', async ({ page }) => {
  //   await page.goto('/library');
  //   
  //   const signOutButton = page.getByRole('button', { name: /sign out/i });
  //   
  //   // Check ARIA attributes
  //   await expect(signOutButton).toHaveAttribute('aria-label', 'Sign out');
  //   await expect(signOutButton).toHaveAttribute('title', 'Sign out');
  // });

});
