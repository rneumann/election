import { expect } from '@playwright/test';
import { information } from './loginInformation.js';

/**
 * Führt einen User-Login durch und prüft auf erfolgreiche Weiterleitung.
 * @param {import('@playwright/test').Page} page
 * @param {string} username - Optional (Default: User aus Config)
 * @param {string} password - Optional (Default: Passwort aus Config)
 */
export const userLogin = async (
  page,
  username = information.user,
  password = information.userPassword,
) => {
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  await page.getByPlaceholder('Ihr Benutzername').fill(username);
  await page.getByPlaceholder('Ihr Passwort').fill(password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

  await expect(page).toHaveURL('/home');
};

/**
 * Führt einen Admin-Login durch und prüft auf erfolgreiche Weiterleitung.
 * @param {import('@playwright/test').Page} page
 * @param {string} username - Optional (Default: User aus Config)
 * @param {string} password - Optional (Default: Passwort aus Config)
 */
export const adminLogin = async (
  page,
  username = information.admin,
  password = information.adminPassword,
) => {
  if (!page.url().includes('/login')) {
    await page.goto('/login');
  }

  await page.getByPlaceholder('Ihr Benutzername').fill(username);
  await page.getByPlaceholder('Ihr Passwort').fill(password);
  await page.getByRole('button', { name: 'Anmelden', exact: true }).click();

  await expect(page).toHaveURL('/admin');
};

export const logout = async (page) => {
  await page.getByRole('button', { name: /Abmelden/i, exact: true }).click();
  await expect(page).toHaveURL('/login');
};
