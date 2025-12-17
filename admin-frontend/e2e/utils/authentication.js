import { expect } from '@playwright/test';
import { information } from './loginInformation.js';

// Constants to avoid string duplication (SonarJS fix)
const TXT_PLACEHOLDER_USER = 'Ihr Benutzername';
const TXT_PLACEHOLDER_PASS = '••••••••';
const TXT_LOGIN_BTN = 'Anmelden';

/**
 * Internal helper function to perform the login sequence.
 * Reduces code duplication across different user login functions.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} username
 * @param {string} password
 * @param {string} targetUrl - The URL expected after successful login (e.g. '/home' or '/admin')
 */
const performLogin = async (page, username, password, targetUrl) => {
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  await page.getByPlaceholder(TXT_PLACEHOLDER_USER).fill(username);
  await page.getByPlaceholder(TXT_PLACEHOLDER_PASS).fill(password);
  await page.getByRole('button', { name: TXT_LOGIN_BTN, exact: true }).click();

  await expect(page).toHaveURL(targetUrl);
};

/**
 * Performs an admin login and verifies redirection to the admin dashboard.
 * @param {import('@playwright/test').Page} page
 * @param {string} [username] - Optional (Default: Admin from config)
 * @param {string} [password] - Optional (Default: Password from config)
 */
export const adminLogin = async (
  page,
  username = information.admin,
  password = information.adminPassword,
) => {
  await performLogin(page, username, password, '/admin');
};

/**
 * Logs out the current user and verifies redirection to the login page.
 * @param {import('@playwright/test').Page} page
 */
export const logout = async (page) => {
  await page.getByRole('button', { name: /Abmelden/i, exact: true }).click();
  await expect(page).toHaveURL('/login');
};
