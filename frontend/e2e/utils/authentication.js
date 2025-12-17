import { expect } from '@playwright/test';
import { information } from './loginInformation.js';

// Constants to avoid string duplication (SonarJS fix)
const TXT_PLACEHOLDER_USER = 'Ihr Benutzername';
const TXT_PLACEHOLDER_PASS = 'Ihr Passwort';
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
 * Performs a standard user login and verifies redirection to home.
 * @param {import('@playwright/test').Page} page
 * @param {string} [username] - Optional (Default: User from config)
 * @param {string} [password] - Optional (Default: Password from config)
 */
export const userLogin = async (
  page,
  username = information.user,
  password = information.userPassword,
) => {
  await performLogin(page, username, password, '/home');
};

/**
 * Performs a login with the second user and verifies redirection to home.
 * @param {import('@playwright/test').Page} page
 * @param {string} [username] - Optional (Default: Second user from config)
 * @param {string} [password] - Optional (Default: Password from config)
 */
export const secondUserLogin = async (
  page,
  username = information.secondUser,
  password = information.secondUserPassword,
) => {
  await performLogin(page, username, password, '/home');
};

/**
 * Performs a login with the third user and verifies redirection to home.
 * @param {import('@playwright/test').Page} page
 * @param {string} [username] - Optional (Default: Third user from config)
 * @param {string} [password] - Optional (Default: Password from config)
 */
export const thirdUserLogin = async (
  page,
  username = information.thirdUser,
  password = information.thirdUserPassword,
) => {
  await performLogin(page, username, password, '/home');
};

/**
 * Logs out the current user and verifies redirection to the login page.
 * @param {import('@playwright/test').Page} page
 */
export const logout = async (page) => {
  await page.getByRole('button', { name: /Abmelden/i, exact: true }).click();
  await expect(page).toHaveURL('/login');
};
