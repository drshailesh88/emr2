import { test, expect } from '@playwright/test';

test.describe('Login Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows required validation for empty email', async ({ page }) => {
    // Try to submit with empty email
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    // Email field should show validation message (HTML5 required)
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveAttribute('required', '');

    // Form should not submit (still on login page)
    await expect(page).toHaveURL('/login');
  });

  test('shows required validation for empty password', async ({ page }) => {
    // Try to submit with empty password
    await page.fill('input#email', 'test@example.com');
    await page.click('button[type="submit"]');

    // Password field should show validation message (HTML5 required)
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveAttribute('required', '');

    // Form should not submit (still on login page)
    await expect(page).toHaveURL('/login');
  });

  test('email input has correct type for validation', async ({ page }) => {
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('password input has correct type', async ({ page }) => {
    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('sign in button is enabled by default', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await expect(submitButton).toHaveText('Sign In');
  });

  test('has link to signup page', async ({ page }) => {
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toHaveText('Sign up');
  });
});

test.describe('Signup Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('starts on step 1 (account setup)', async ({ page }) => {
    // Should see step 1 description
    await expect(page.locator('text=Set up your login credentials')).toBeVisible();

    // Should see email, password, confirm password fields
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();

    // Continue button should be visible
    await expect(page.locator('button[type="submit"]')).toHaveText('Continue');
  });

  test('validates password length on step 1', async ({ page }) => {
    // Fill form with short password
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'short');
    await page.fill('input#confirmPassword', 'short');

    // Click continue
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();

    // Should stay on step 1
    await expect(page.locator('text=Set up your login credentials')).toBeVisible();
  });

  test('validates password match on step 1', async ({ page }) => {
    // Fill form with mismatched passwords
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'password456');

    // Click continue
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Passwords do not match')).toBeVisible();

    // Should stay on step 1
    await expect(page.locator('text=Set up your login credentials')).toBeVisible();
  });

  test('progresses to step 2 with valid credentials', async ({ page }) => {
    // Fill valid step 1 data
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'password123');

    // Click continue
    await page.click('button[type="submit"]');

    // Should be on step 2
    await expect(page.locator('text=Complete your doctor profile')).toBeVisible();

    // Should see profile fields
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('input#specialty')).toBeVisible();
  });

  test('can go back from step 2 to step 1', async ({ page }) => {
    // Go to step 2
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'password123');
    await page.click('button[type="submit"]');

    // Verify on step 2
    await expect(page.locator('text=Complete your doctor profile')).toBeVisible();

    // Click back button
    await page.click('button:has-text("Back")');

    // Should be back on step 1
    await expect(page.locator('text=Set up your login credentials')).toBeVisible();

    // Email should still be filled
    await expect(page.locator('input#email')).toHaveValue('test@example.com');
  });

  test('step 2 has all required profile fields', async ({ page }) => {
    // Go to step 2
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', 'password123');
    await page.fill('input#confirmPassword', 'password123');
    await page.click('button[type="submit"]');

    // Check all required fields exist
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('input#specialty')).toBeVisible();
    await expect(page.locator('input#qualifications')).toBeVisible();
    await expect(page.locator('input#clinicName')).toBeVisible();
    await expect(page.locator('input#clinicAddress')).toBeVisible();
    await expect(page.locator('input#registrationNumber')).toBeVisible();

    // Create Account button should be visible
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
  });

  test('has link to login page', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText('Sign in');
  });

  test('shows step indicators', async ({ page }) => {
    // Should have 2 step indicator dots
    const stepIndicators = page.locator('.rounded-full.w-3.h-3');
    await expect(stepIndicators).toHaveCount(2);
  });
});
