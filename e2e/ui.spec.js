import { expect, test } from '@playwright/test';

const cookieUrl = 'http://127.0.0.1:3000';

test('authenticated visits to `/` redirect to dashboard', async ({ page }) => {
  await page.context().addCookies([{ name: 'auth_token', value: JSON.stringify({ role: 'Admin', name: 'Admin' }), url: cookieUrl }]);

  await page.goto('/');

  await expect(page).toHaveURL('/portal/dashboard');
});

test('cashier cannot access registrar/admin routes (RBAC redirects)', async ({ page }) => {
  await page.context().addCookies([{ name: 'auth_token', value: JSON.stringify({ role: 'Cashier', name: 'Cashier' }), url: cookieUrl }]);

  await page.goto('/portal/students');
  await expect(page).toHaveURL('/portal/dashboard');

  await page.goto('/portal/teachers');
  await expect(page).toHaveURL('/portal/dashboard');

  await page.goto('/portal/system');
  await expect(page).toHaveURL('/portal/dashboard');
});

test('sidebar shows/hides items based on role', async ({ page }) => {
  // Registrar should not see Financials (Admin & Cashier only)
  await page.context().addCookies([{ name: 'auth_token', value: JSON.stringify({ role: 'Registrar', name: 'Registrar' }), url: cookieUrl }]);
  await page.goto('/portal/dashboard');

  await expect(page.getByText('Financials')).toHaveCount(0);
  await expect(page.getByText('Student Management')).toHaveCount(1);
});

test('login page is usable on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  await expect(page.getByPlaceholder('Enter your user ID')).toBeVisible();
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
});
