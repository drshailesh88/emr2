import { test, expect } from '@playwright/test';

test.describe('EMR Layout', () => {
  test('unauthenticated users are redirected to login from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  // Note: Tests below require authentication.
  // For now, we test the structural presence of elements when rendered.
  // Full auth flow testing will be added after auth is fully working.

  test.describe('Layout Structure (requires auth mock)', () => {
    test.skip('dashboard has 3-panel layout with all sections', async ({ page }) => {
      // This test is skipped until we have proper auth mocking
      // It documents what we expect to test
      await page.goto('/dashboard');

      // Header
      await expect(page.locator('[data-testid="emr-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="logout-btn"]')).toBeVisible();

      // Left Panel - Patient Queue
      await expect(page.locator('[data-testid="patient-queue-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="patient-search"]')).toBeVisible();

      // Middle Panel - Prescription Editor
      await expect(page.locator('[data-testid="prescription-panel"]')).toBeVisible();

      // Right Panel - AI Assistant
      await expect(page.locator('[data-testid="ai-assistant-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-input"]')).toBeVisible();
    });
  });
});
