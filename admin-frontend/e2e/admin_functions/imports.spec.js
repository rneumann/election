import { test, expect } from '@playwright/test';
import { adminLogin } from '../utils/authentication';
import { AdminPage } from '../pages/adminPage';

test.describe('Admin Import tests', () => {
  // Force serial execution - tests depend on each other
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('Should import an election', async ({ page }) => {
    const adminPage = new AdminPage(page);

    await expect(page).toHaveURL('/admin');
    await expect(page.locator('body')).toHaveText(/Wahleinstellung hochladen/);

    // 1. Prozess starten
    await adminPage.startImportProcess('Wahleinstellung hochladen');

    // 2. Datei wählen
    await adminPage.selectFile('e2e/files/election_e2e.xlsx');

    // 3. Validieren
    await adminPage.waitForValidation();
    // Zusätzliche spezifische Checks aus dem Original-Test
    await expect(page.getByText(/Wahlbezeichnung:/)).toBeVisible();
    await expect(page.getByText(/Kandidaten:/)).toBeVisible();

    // 4. Hochladen (mit doppeltem Klick)
    await adminPage.executeFinalUpload('/upload/elections');
  });

  test('Should import list of voters', async ({ page }) => {
    const adminPage = new AdminPage(page);

    await expect(page).toHaveURL('/admin');
    await expect(page.locator('body')).toHaveText(/CSV-Datei hochladen/);

    // Nutzung von nth(0) ist in startImportProcess gekapselt
    await adminPage.startImportProcess('CSV-Datei hochladen', 0);

    // Select an election first (required for voter uploads)
    await adminPage.selectElection();

    await adminPage.selectFile('e2e/files/voters_e2e.csv');

    // Spezifischer Check mit Timeout wie im Original
    await adminPage.waitForValidation(/Wähler:/);

    await adminPage.executeFinalUpload('/upload/voters');
  });

  test('Should import list of candidates', async ({ page }) => {
    const adminPage = new AdminPage(page);

    await expect(page).toHaveURL('/admin');
    await expect(page.locator('body')).toHaveText(/CSV-Datei hochladen/);

    // Nutzung von nth(1)
    await adminPage.startImportProcess('CSV-Datei hochladen', 1);

    await adminPage.selectFile('e2e/files/candidates_e2e.csv');

    await adminPage.waitForValidation();

    await adminPage.executeFinalUpload('/upload/candidates');
  });
});
