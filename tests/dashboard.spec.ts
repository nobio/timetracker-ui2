import { test, expect } from '@playwright/test';

test.describe('Timetracker E2E Dashboard Tests', () => {

    test('should login and view the dashboard', async ({ page }) => {
        // Navigate to the app (the dev server is set as baseURL in config)
        await page.goto('/');

        // Next.js will likely push us to /login if we are not authenticated
        // Wait for the login form to appear
        const loginHeading = page.locator('h2', { hasText: 'Timetracker 2.0' });
        await expect(loginHeading).toBeVisible({ timeout: 10000 });

        // Fill in the login credentials
        await page.fill('input[placeholder="Enter your username"]', 'nobio');
        await page.fill('input[placeholder="••••••••"]', 'schernoo');

        // Click the Sign in button
        await page.click('button:has-text("Sign in")');

        // Check for explicit UI errors that might be blocking routing immediately
        try {
            const errorBlock = page.locator('.text-red-600');
            await errorBlock.waitFor({ state: 'visible', timeout: 3000 });
            console.log('Login Error Message:', await errorBlock.innerText());
        } catch (e) {
            // No error shown, continue to wait for routing
            console.log('No immediate error, waiting for dashboard...');
        }

        // Wait for redirect to dashboard, with an explicit await block
        try {
            await page.waitForURL(/\/dashboard/, { timeout: 10000 });
        } catch (e) {
            await page.screenshot({ path: 'login-failure.png' });
            throw e;
        }

        // Verify dashboard elements loaded successfully. The initial render may show a loading spinner.
        // We use a relaxed assertion and increase the wait time to allow React Query to settle.
        await expect(page.locator('text=Time Entries').first()).toBeVisible({ timeout: 15000 });
        await expect(page.locator('button:has-text("Clock")')).toBeVisible();
    });
});
