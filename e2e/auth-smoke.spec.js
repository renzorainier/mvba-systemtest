import { expect, test } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await expect(page.getByPlaceholder('Enter your user ID')).toBeVisible();
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});

test('protected portal routes redirect unauthenticated users to login', async ({ page }) => {
  await page.goto('/portal/dashboard');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});
