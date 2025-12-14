import { expect, test } from '@playwright/test';
import { adminLogin } from '../utils/authentication';

test.describe('Admin Import tests', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('Should import an election', async ({ page }) => {
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('body')).toHaveText(/Wahleinstellung hochladen/);

    const uploadSettingsButton = page.getByRole('button', { name: 'Wahleinstellung hochladen' });
    await expect(uploadSettingsButton).toBeVisible();
    await uploadSettingsButton.click();
    await expect(uploadSettingsButton).toBeFocused();

    const fileButton = page.getByRole('button', { name: 'Datei auswählen' }).first();
    await expect(fileButton).toBeVisible();

    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), fileButton.click()]);
    await fileChooser.setFiles('e2e/files/election_e2e.xlsx');

    await expect(page.getByText('Validierung erfolgreich')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Wahlbezeichnung:/)).toBeVisible();
    await expect(page.getByText(/Kandidaten:/)).toBeVisible();

    await expect(page.getByText('Upload erfolgreich')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Datei erfolgreich validiert/)).toBeVisible();

    const finalUploadBtn = page.getByRole('button', { name: 'Hochladen', exact: true });
    await expect(finalUploadBtn).toBeEnabled();

    const [uploadResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/upload/elections') && resp.status() === 200,
      ),
      finalUploadBtn.click(),
    ]);

    expect(uploadResponse.ok()).toBeTruthy();
    await finalUploadBtn.click();
  });

  test('Should import list of voters', async ({ page }) => {
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('body')).toHaveText(/CSV-Datei hochladen/);

    const uploadSettingsButton = page.getByRole('button', { name: 'CSV-Datei hochladen' }).nth(0);
    await expect(uploadSettingsButton).toBeVisible();
    await uploadSettingsButton.click();
    await expect(uploadSettingsButton).toBeFocused();

    const fileButton = page.getByRole('button', { name: 'Datei auswählen' }).first();
    await expect(fileButton).toBeVisible();

    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), fileButton.click()]);
    await fileChooser.setFiles('e2e/files/voters_e2e.csv');

    await expect(page.getByText('Validierung erfolgreich')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Wähler:/)).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Upload erfolgreich')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Datei erfolgreich validiert/)).toBeVisible();

    const finalUploadBtn = page.getByRole('button', { name: 'Hochladen', exact: true });
    await expect(finalUploadBtn).toBeEnabled();

    const [uploadResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/upload/voters') && resp.status() === 200,
      ),
      finalUploadBtn.click(),
    ]);

    expect(uploadResponse.ok()).toBeTruthy();
    await finalUploadBtn.click();
  });

  test('Should import list of candidates', async ({ page }) => {
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('body')).toHaveText(/CSV-Datei hochladen/);

    const uploadSettingsButton = page.getByRole('button', { name: 'CSV-Datei hochladen' }).nth(1);
    await expect(uploadSettingsButton).toBeVisible();
    await uploadSettingsButton.click();
    await expect(uploadSettingsButton).toBeFocused();

    const fileButton = page.getByRole('button', { name: 'Datei auswählen' }).first();
    await expect(fileButton).toBeVisible();

    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), fileButton.click()]);
    await fileChooser.setFiles('e2e/files/candidates_e2e.csv');

    await expect(page.getByText('Validierung erfolgreich')).toBeVisible({ timeout: 15000 });

    await expect(page.getByText('Upload erfolgreich')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Datei erfolgreich validiert!/)).toBeVisible();

    const finalUploadBtn = page.getByRole('button', { name: 'Hochladen', exact: true });
    await expect(finalUploadBtn).toBeEnabled();

    const [uploadResponse] = await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/upload/candidates') && resp.status() === 200,
      ),
      finalUploadBtn.click(),
    ]);

    expect(uploadResponse.ok()).toBeTruthy();
    await finalUploadBtn.click();
  });
});
