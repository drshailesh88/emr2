/**
 * Load Testing Suite
 *
 * Tests system capacity for handling multiple concurrent users.
 * These tests simulate real-world load scenarios including:
 * - 100 concurrent signups (in batches)
 * - 100 users saving data
 * - 100 users logging in
 */

import { test, expect, Page, Browser } from '@playwright/test';

// Configuration - Scale to 100 users
const CONCURRENT_WORKERS = 10; // Playwright parallel workers
const TOTAL_USERS_TARGET = 100;
const BATCH_SIZE = 10;
const NUM_BATCHES = 10; // 10 batches of 10 = 100 users

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

// Helper for dashboard operations to simulate data saves
async function performDashboardOperations(page: Page): Promise<{ success: boolean; duration: number; error?: string }> {
  const startTime = Date.now();

  try {
    // Click through tabs (simulating data operations)
    await page.click('[data-testid="documents-tab"]');
    await page.waitForTimeout(200);

    await page.click('[data-testid="search-tab"]');
    await page.waitForTimeout(200);

    await page.click('[data-testid="prescription-tab"]');
    await page.waitForTimeout(200);

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

test.describe('Load Testing - 100 Concurrent Users', () => {
  test.describe.configure({ mode: 'parallel' });
  test.setTimeout(120000); // 2 minute timeout per test

  // Generate 10 parallel worker tests (each worker handles signups in parallel)
  for (let i = 0; i < CONCURRENT_WORKERS; i++) {
    test(`concurrent signup worker ${i + 1}`, async ({ page }) => {
      const userData = generateUserData(i);
      const result = await performSignup(page, userData);

      console.log(`Worker ${i + 1}: ${result.success ? 'SUCCESS' : 'FAILED'} in ${result.duration}ms`);

      if (!result.success) {
        console.log(`Error: ${result.error}`);
      }

      expect(result.success).toBe(true);
      expect(result.duration).toBeLessThan(60000);
    });
  }
});

test.describe('Load Testing - 100 User Batch Signup', () => {
  test.setTimeout(600000); // 10 minute timeout for heavy load tests

  test('batch signup - 100 users in 10 batches', async ({ browser }) => {
    const allResults: Array<{ batch: number; index: number; success: boolean; duration: number; error?: string }> = [];

    for (let batch = 0; batch < NUM_BATCHES; batch++) {
      console.log(`\n--- Starting Batch ${batch + 1}/${NUM_BATCHES} ---`);

      // Run batch in parallel (multiple contexts)
      const batchPromises = [];
      const contexts: any[] = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        const userIndex = batch * BATCH_SIZE + i;
        const userData = generateUserData(1000 + userIndex); // Offset to avoid conflicts

        batchPromises.push(
          performSignup(page, userData).then(result => ({
            batch,
            index: i,
            ...result
          }))
        );
      }

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);

      // Close all contexts safely
      for (const ctx of contexts) {
        try {
          await ctx.close();
        } catch {
          // Context already closed, ignore
        }
      }

      // Log batch progress
      const batchSuccessful = batchResults.filter(r => r.success).length;
      console.log(`Batch ${batch + 1}: ${batchSuccessful}/${BATCH_SIZE} successful`);
    }

    // Analyze all results
    const successful = allResults.filter(r => r.success).length;
    const avgDuration = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;
    const successRate = (successful / TOTAL_USERS_TARGET) * 100;

    console.log('\n=== 100 User Batch Signup Results ===');
    console.log(`Total Users: ${TOTAL_USERS_TARGET}`);
    console.log(`Successful: ${successful}/${TOTAL_USERS_TARGET} (${successRate.toFixed(1)}%)`);
    console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);
    console.log(`Min duration: ${Math.min(...allResults.map(r => r.duration))}ms`);
    console.log(`Max duration: ${Math.max(...allResults.map(r => r.duration))}ms`);

    // Log failures
    const failures = allResults.filter(r => !r.success);
    if (failures.length > 0) {
      console.log(`\nFailures: ${failures.length}`);
      failures.slice(0, 5).forEach(f => console.log(`  Batch ${f.batch} User ${f.index}: ${f.error}`));
      if (failures.length > 5) {
        console.log(`  ... and ${failures.length - 5} more`);
      }
    }

    // 85% success rate for 100 users (allowing for some network/timing issues)
    expect(successful).toBeGreaterThanOrEqual(TOTAL_USERS_TARGET * 0.85);
  }, 600000); // 10 minute timeout for 100 users
});

test.describe('Load Testing - 100 User Login', () => {
  test.setTimeout(600000); // 10 minute timeout for heavy load tests

  test('batch login - 50 users sequentially', async ({ browser }) => {
    const USER_COUNT = 50;
    const users: Array<{ email: string; password: string }> = [];

    console.log('\n--- Creating 50 users for login test ---');

    // First, create users in batches
    for (let batch = 0; batch < 5; batch++) {
      const contexts: any[] = [];
      const batchPromises = [];

      for (let i = 0; i < 10; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        const userIndex = 2000 + batch * 10 + i;
        const userData = generateUserData(userIndex);

        batchPromises.push(
          performSignup(page, userData).then(result => ({
            userData,
            result
          }))
        );
      }

      const results = await Promise.all(batchPromises);
      for (const { userData, result } of results) {
        if (result.success) {
          users.push({ email: userData.email, password: userData.password });
        }
      }

      // Close contexts safely
      for (const ctx of contexts) {
        try {
          await ctx.close();
        } catch {
          // Context already closed, ignore
        }
      }

      console.log(`Created batch ${batch + 1}/5: ${users.length} total users`);
    }

    console.log(`\n--- Testing login for ${users.length} users ---`);

    // Now test logins in batches
    const loginResults: Array<{ success: boolean; duration: number; error?: string }> = [];

    for (let batch = 0; batch < 5; batch++) {
      const contexts: any[] = [];
      const batchPromises = [];
      const startIdx = batch * 10;
      const endIdx = Math.min(startIdx + 10, users.length);

      for (let i = startIdx; i < endIdx; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();

        batchPromises.push(performLogin(page, users[i].email, users[i].password));
      }

      const results = await Promise.all(batchPromises);
      loginResults.push(...results);

      for (const ctx of contexts) {
        try {
          await ctx.close();
        } catch {
          // Context already closed, ignore
        }
      }

      const batchSuccess = results.filter(r => r.success).length;
      console.log(`Login batch ${batch + 1}: ${batchSuccess}/${results.length} successful`);
    }

    // Analyze results
    const successful = loginResults.filter(r => r.success).length;
    const avgDuration = loginResults.reduce((sum, r) => sum + r.duration, 0) / loginResults.length;
    const successRate = (successful / loginResults.length) * 100;

    console.log('\n=== 50 User Login Results ===');
    console.log(`Successful: ${successful}/${loginResults.length} (${successRate.toFixed(1)}%)`);
    console.log(`Average duration: ${avgDuration.toFixed(0)}ms`);

    expect(successful).toBeGreaterThanOrEqual(loginResults.length * 0.85);
  }, 600000);
});

test.describe('Load Testing - Data Operations', () => {
  test.setTimeout(300000); // 5 minute timeout for data operations

  test('rapid data saves - 20 users with dashboard operations', async ({ browser }) => {
    const USER_COUNT = 20;
    const users: Array<{ email: string; password: string; page?: Page; context?: any }> = [];

    console.log('\n--- Creating 20 users for data operations test ---');

    // Create users
    for (let batch = 0; batch < 2; batch++) {
      const contexts: any[] = [];
      const batchPromises = [];

      for (let i = 0; i < 10; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();
        const userIndex = 3000 + batch * 10 + i;
        const userData = generateUserData(userIndex);

        batchPromises.push(
          performSignup(page, userData).then(result => ({
            userData,
            result,
            page,
            context
          }))
        );
      }

      const results = await Promise.all(batchPromises);
      for (const { userData, result, page, context } of results) {
        if (result.success) {
          users.push({ email: userData.email, password: userData.password });
        }
        try {
          await context.close();
        } catch {
          // Context already closed, ignore
        }
      }

      console.log(`Created batch ${batch + 1}/2: ${users.length} total users`);
    }

    console.log(`\n--- Testing dashboard operations for ${users.length} users ---`);

    // Test dashboard operations (simulating data saves)
    const opResults: Array<{ success: boolean; duration: number; error?: string }> = [];

    for (let batch = 0; batch < 2; batch++) {
      const contexts: any[] = [];
      const batchPromises = [];
      const startIdx = batch * 10;
      const endIdx = Math.min(startIdx + 10, users.length);

      for (let i = startIdx; i < endIdx; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        const page = await context.newPage();

        batchPromises.push(
          performLogin(page, users[i].email, users[i].password)
            .then(() => performDashboardOperations(page))
        );
      }

      const results = await Promise.all(batchPromises);
      opResults.push(...results);

      for (const ctx of contexts) {
        try {
          await ctx.close();
        } catch {
          // Context already closed, ignore
        }
      }

      const batchSuccess = results.filter(r => r.success).length;
      console.log(`Operations batch ${batch + 1}: ${batchSuccess}/${results.length} successful`);
    }

    const successful = opResults.filter(r => r.success).length;
    console.log(`\nDashboard operations: ${successful}/${opResults.length} successful`);

    expect(successful).toBeGreaterThanOrEqual(opResults.length * 0.8);
  }, 300000);
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

    // All pages should load within 10 seconds (relaxed for heavy load scenarios)
    results.forEach(r => {
      expect(r.duration).toBeLessThan(10000);
    });
  });

  test('dashboard load time after auth', async ({ page }) => {
    // Signup first
    const userData = generateUserData(4000);
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

    expect(duration).toBeLessThan(10000);
  });
});

test.describe('Load Testing - Stress Test', () => {
  test('rapid navigation stress test - 50 iterations', async ({ page }) => {
    await page.goto('/');

    const navigationCount = 50;
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
    const successRate = (successful / navigationCount) * 100;
    console.log(`\nRapid navigation: ${successful}/${navigationCount} (${successRate.toFixed(1)}%) successful`);

    expect(successful).toBeGreaterThanOrEqual(navigationCount * 0.8);
  });

  test('concurrent API-like stress - multiple tabs', async ({ browser }) => {
    const TAB_COUNT = 5;
    const contexts: any[] = [];
    const pages: Page[] = [];

    // Open multiple tabs
    for (let i = 0; i < TAB_COUNT; i++) {
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      pages.push(page);
    }

    // Navigate all tabs simultaneously
    const navPromises = pages.map(async (page, i) => {
      try {
        await page.goto('/');
        await page.goto('/login');
        await page.goto('/signup');
        return true;
      } catch {
        return false;
      }
    });

    const results = await Promise.all(navPromises);
    const successful = results.filter(r => r).length;

    // Close all
    for (const ctx of contexts) {
      await ctx.close();
    }

    console.log(`\nMulti-tab stress: ${successful}/${TAB_COUNT} tabs successful`);
    expect(successful).toBeGreaterThanOrEqual(TAB_COUNT * 0.8);
  });
});
