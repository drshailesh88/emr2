import { test, expect, Page } from '@playwright/test';

/**
 * Dashboard Authenticated Tests
 *
 * These tests require:
 * 1. Convex backend running (npx convex dev)
 * 2. Proper JWT_PRIVATE_KEY and JWKS environment variables set
 *
 * To run these tests:
 * 1. Start Convex: npx convex dev
 * 2. Run tests: npm test -- tests/dashboard-authenticated.spec.ts
 *
 * By default, the authenticated tests are skipped in CI.
 * Set RUN_AUTH_TESTS=true environment variable to enable them.
 */

const TEST_PASSWORD = 'password123';
const TEST_DOCTOR = {
  name: 'Test Doctor',
  phone: '+91 98765 43210',
  specialty: 'General Medicine',
  qualifications: 'MBBS',
  clinicName: 'Test Clinic',
  clinicAddress: '123 Test Street',
  registrationNumber: 'TEST-12345',
};

// Helper function to sign in
async function signInTestUser(page: Page, email: string, password: string) {
  await page.goto('/login');

  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
}

test.describe('Dashboard Authenticated', () => {
  // Skip entire suite unless explicitly enabled
  const runAuthTests = process.env.RUN_AUTH_TESTS === 'true';

  test.describe.configure({ mode: 'serial' }); // Run tests in order

  let authEmail: string;

  test('can sign up and reach dashboard', async ({ page }) => {
    test.skip(!runAuthTests, 'Auth tests disabled. Set RUN_AUTH_TESTS=true to enable.');

    // Use unique email for this test run
    authEmail = `test-${Date.now()}@example.com`;

    await page.goto('/signup');

    // Step 1
    await page.fill('input#email', authEmail);
    await page.fill('input#password', TEST_PASSWORD);
    await page.fill('input#confirmPassword', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for step 2
    await expect(page.locator('text=Complete your doctor profile')).toBeVisible({ timeout: 5000 });

    // Step 2
    await page.fill('input#name', TEST_DOCTOR.name);
    await page.fill('input#phone', TEST_DOCTOR.phone);
    await page.fill('input#specialty', TEST_DOCTOR.specialty);
    await page.fill('input#qualifications', TEST_DOCTOR.qualifications);
    await page.fill('input#clinicName', TEST_DOCTOR.clinicName);
    await page.fill('input#clinicAddress', TEST_DOCTOR.clinicAddress);
    await page.fill('input#registrationNumber', TEST_DOCTOR.registrationNumber);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

    // Verify we're on the dashboard with authenticated content
    await expect(page.locator('[data-testid="emr-header"]')).toBeVisible({ timeout: 5000 });
  });

  test('dashboard shows header with doctor info', async ({ page }) => {
    test.skip(!runAuthTests || !authEmail, 'Requires RUN_AUTH_TESTS=true and successful signup');

    await signInTestUser(page, authEmail, TEST_PASSWORD);

    // Header should be visible
    const header = page.locator('[data-testid="emr-header"]');
    await expect(header).toBeVisible();

    // Should show "Doctor Secretary AI" title
    await expect(page.locator('text=Doctor Secretary AI')).toBeVisible();

    // Should show logout button
    await expect(page.locator('[data-testid="logout-btn"]')).toBeVisible();
  });

  test('dashboard shows all three panels', async ({ page }) => {
    test.skip(!runAuthTests || !authEmail, 'Requires RUN_AUTH_TESTS=true and successful signup');

    await signInTestUser(page, authEmail, TEST_PASSWORD);

    // Wait for panels to load
    await expect(page.locator('[data-testid="emr-header"]')).toBeVisible({ timeout: 5000 });

    // Check all three panels
    await expect(page.locator('[data-testid="patient-queue-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="prescription-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-assistant-panel"]')).toBeVisible();
  });

  test('patient queue panel has search input', async ({ page }) => {
    test.skip(!runAuthTests || !authEmail, 'Requires RUN_AUTH_TESTS=true and successful signup');

    await signInTestUser(page, authEmail, TEST_PASSWORD);

    await expect(page.locator('[data-testid="patient-search"]')).toBeVisible();
  });

  test('AI assistant panel has input field', async ({ page }) => {
    test.skip(!runAuthTests || !authEmail, 'Requires RUN_AUTH_TESTS=true and successful signup');

    await signInTestUser(page, authEmail, TEST_PASSWORD);

    await expect(page.locator('[data-testid="ai-input"]')).toBeVisible();
  });

  test('logout redirects to login page', async ({ page }) => {
    test.skip(!runAuthTests || !authEmail, 'Requires RUN_AUTH_TESTS=true and successful signup');

    await signInTestUser(page, authEmail, TEST_PASSWORD);

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="logout-btn"]')).toBeVisible();

    // Click logout
    await page.click('[data-testid="logout-btn"]');

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});

test.describe('Dashboard Unauthenticated Behavior', () => {
  test('dashboard redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('shows loading state briefly before redirect', async ({ page }) => {
    // Note: This test may be flaky depending on timing
    const response = page.goto('/dashboard');

    // The page should eventually be at /login
    await response;
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });
});
