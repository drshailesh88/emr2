import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('home page loads with correct content', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page.locator('text=Doctor Secretary AI')).toBeVisible();

    // Check description
    await expect(page.locator('text=AI-powered medical secretary')).toBeVisible();

    // Check buttons exist
    await expect(page.locator('a[href="/login"]')).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('login page loads with form', async ({ page }) => {
    await page.goto('/login');

    // Check title
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    // Check form elements
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check link to signup
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
  });

  test('signup page loads with form', async ({ page }) => {
    await page.goto('/signup');

    // Check title
    await expect(page.locator('text=Create Account')).toBeVisible();

    // Check step 1 form elements (account setup)
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check link to login
    await expect(page.locator('a[href="/login"]')).toBeVisible();
  });

  test('navigation from home to login works', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/login"]');

    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });

  test('navigation from home to signup works', async ({ page }) => {
    await page.goto('/');

    await page.click('a[href="/signup"]');

    await expect(page).toHaveURL('/signup');
    await expect(page.locator('text=Create Account')).toBeVisible();
  });

  test('navigation from login to signup works', async ({ page }) => {
    await page.goto('/login');

    await page.click('a[href="/signup"]');

    await expect(page).toHaveURL('/signup');
    await expect(page.locator('text=Create Account')).toBeVisible();
  });

  test('navigation from signup to login works', async ({ page }) => {
    await page.goto('/signup');

    await page.click('a[href="/login"]');

    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Welcome Back')).toBeVisible();
  });
});
