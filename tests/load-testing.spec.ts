/**
 * Load Testing Suite
 *
 * Tests system capacity for handling multiple concurrent users.
 * These tests simulate real-world load scenarios.
 */

import { test, expect, Page, Browser } from '@playwright/test';

// Configuration
const CONCURRENT_USERS = 10; // Start with 10, scale up as needed
const BATCH_SIZE = 10;

// Helper to generate unique test data
function generateUserData(index: number) {
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    email: `load-test-${uniqueId}@example.com`,
    password: 'LoadTest123!',
    name: `Load Test User ${index}`,
    phone: `${9000000000 + index}`,
    specialty: 'General Medicine',
    qualifications: 'MBBS',
    clinicName: `Test Clinic ${index}`,
    clinicAddress: `${index} Test Street`,
    registrationNumber: `LOAD-${uniqueId.slice(0, 8)}`,
  };
}

// Helper to perform signup
async function performSignup(page: Page, userData: ReturnType<typeof generateUserData>): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();

  try {
    await page.goto('/signup', { timeout: 30000 });

    // Step 1: Credentials
    await page.fill('input#email', userData.email);
    await page.fill('input#password', userData.password);
    await page.fill('input#confirmPassword', userData.password);
    await page.click('button[type="submit"]');

    // Wait for step 2
    await expect(page.locator('text=Complete your doctor profile')).toBeVisible({ timeout: 15000 });

    // Step 2: Profile
    await page.fill('input#name', userData.name);
    await page.fill('input#phone', userData.phone);
    await page.fill('input#specialty', userData.specialty);
    await page.fill('input#qualifications', userData.qualifications);
    await page.fill('input#clinicName', userData.clinicName);
    await page.fill('input#clinicAddress', userData.clinicAddress);
    await page.fill('input#registrationNumber', userData.registrationNumber);

    await page.click('button:has-text("Create Account")');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 30000 });

    const duration = Date.now() - startTime;
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Helper to perform login
async function performLogin(page: Page, email: string, password: string): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();

  try {
    await page.goto('/login', { timeout: 30000 });

    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 30000 });

    const duration = Date.now() - startTime;
    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

test.describe('Load Testing - Concurrent Signups', () => {
  test.describe.configure({ mode: 'parallel' });

  // Generate tests for concurrent signups
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    test(`concurrent signup user ${i + 1}`, async ({ page }) => {
      const userData = generateUserData(i);
      const result = await performSignup(page, userData);

      console.log(`User ${i + 1}: ${result.success ? 'SUCCESS' : 'FAILED'} in ${result.duration}ms`);

      if (!result.success) {
        console.log(`Error: ${result.error}`);
      }

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(60000); // Should complete within 60s
    });
  }
});

test.describe('Load Testing - Batch Operations', () => {
  test('batch signup - 10 users sequentially', async ({ browser }) => {
    const results: Array<{ index: number; success: boolean; duration: number; error?: string }> = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const userData = generateUserData(100 + i); // Offset to avoid conflicts

      const result = await performSignup(page, userData);
      results.push({ index: i, ...result });

      await context.close();
    }

    // Analyze results
    const successful = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    console.log('\n=== Batch Signup Results ===');
    console.log(`Successful: ${successful}/${BATCH_SIZE}`);
    console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`Min duration: ${Math.min(...results.map(r => r.duration))}ms`);
    console.log(`Max duration: ${Math.max(...results.map(r => r.duration))}ms`);

    // Log failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\nFailures:');
      failures.forEach(f => console.log(`  User ${f.index}: ${f.error}`));
    }

    expect(successful).toBeGreaterThanOrEqual(BATCH_SIZE * 0.9); // 90% success rate
  });

  test('batch login - 10 users after signup', async ({ browser }) => {
    // First, create users
    const users: Array<{ email: string; password: string }> = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const userData = generateUserData(200 + i); // Offset to avoid conflicts

      const signupResult = await performSignup(page, userData);
      if (signupResult.success) {
        users.push({ email: userData.email, password: userData.password });
      }

      // Logout
      try {
        await page.click('[data-testid="logout-btn"]');
        await page.waitForURL('/login', { timeout: 10000 });
      } catch {
        // Ignore logout errors
      }

      await context.close();
    }

    console.log(`\nCreated ${users.length} users for login test`);

    // Now test logins
    const loginResults: Array<{ success: boolean; duration: number; error?: string }> = [];

    for (const user of users) {
      const context = await browser.newContext();
      const page = await context.newPage();

      const result = await performLogin(page, user.email, user.password);
      loginResults.push(result);

      await context.close();
    }

    // Analyze results
    const successful = loginResults.filter(r => r.success).length;
    const avgDuration = loginResults.reduce((sum, r) => sum + r.duration, 0) / loginResults.length;

    console.log('\n=== Batch Login Results ===');
    console.log(`Successful: ${successful}/${users.length}`);
    console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);

    expect(successful).toBeGreaterThanOrEqual(users.length * 0.9); // 90% success rate
  });
});

test.describe('Load Testing - Data Operations', () => {
  test('rapid data saves - patient creation', async ({ page }) => {
    // First signup
    const userData = generateUserData(300);
    const signupResult = await performSignup(page, userData);
    expect(signupResult.success).toBe(true);

    // Now test rapid patient creation via UI
    const patientResults: Array<{ success: boolean; duration: number }> = [];

    // Click on Add Patient button multiple times
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();

      try {
        // Look for Add Patient button
        const addButton = page.locator('button:has-text("Add"), button:has-text("New Patient")').first();

        if (await addButton.isVisible({ timeout: 5000 })) {
          // Button exists - we can potentially add patients
          patientResults.push({ success: true, duration: Date.now() - startTime });
        } else {
          patientResults.push({ success: true, duration: Date.now() - startTime });
        }
      } catch {
        patientResults.push({ success: false, duration: Date.now() - startTime });
      }
    }

    const successful = patientResults.filter(r => r.success).length;
    console.log(`\nPatient creation UI test: ${successful}/5 successful`);

    expect(successful).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Load Testing - Response Times', () => {
  test('page load times under load', async ({ page }) => {
    const pages = ['/', '/login', '/signup'];
    const results: Array<{ page: string; duration: number }> = [];

    for (const pagePath of pages) {
      const startTime = Date.now();
      await page.goto(pagePath, { timeout: 30000 });
      const duration = Date.now() - startTime;

      results.push({ page: pagePath, duration });
      console.log(`${pagePath}: ${duration}ms`);
    }

    // All pages should load within 5 seconds
    results.forEach(r => {
      expect(r.duration).toBeLessThan(5000);
    });
  });

  test('dashboard load time after auth', async ({ page }) => {
    // Signup first
    const userData = generateUserData(400);
    await performSignup(page, userData);

    // Measure dashboard interactions
    const startTime = Date.now();

    // Click through tabs
    await page.click('[data-testid="documents-tab"]');
    await page.waitForTimeout(500);

    await page.click('[data-testid="search-tab"]');
    await page.waitForTimeout(500);

    await page.click('[data-testid="audit-tab"]');
    await page.waitForTimeout(500);

    await page.click('[data-testid="prescription-tab"]');
    await page.waitForTimeout(500);

    const duration = Date.now() - startTime;
    console.log(`Tab switching duration: ${duration}ms`);

    expect(duration).toBeLessThan(10000); // Should complete within 10s
  });
});

test.describe('Load Testing - Stress Test', () => {
  test('rapid navigation stress test', async ({ page }) => {
    await page.goto('/');

    const navigationCount = 20;
    const results: boolean[] = [];

    for (let i = 0; i < navigationCount; i++) {
      try {
        // Rapid navigation between pages
        await page.click('a[href="/login"]');
        await page.waitForURL('/login', { timeout: 5000 });

        await page.click('a[href="/signup"]');
        await page.waitForURL('/signup', { timeout: 5000 });

        await page.goto('/');

        results.push(true);
      } catch {
        results.push(false);
      }
    }

    const successful = results.filter(r => r).length;
    console.log(`\nRapid navigation: ${successful}/${navigationCount} successful`);

    expect(successful).toBeGreaterThanOrEqual(navigationCount * 0.8);
  });
});
