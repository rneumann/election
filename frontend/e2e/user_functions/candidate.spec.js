import { expect, test } from '@playwright/test';
import { userLogin, secondUserLogin } from '../utils/authentication';

test.describe('Candidate Functionalities', () => {
  test('Should upload a profile picture', async ({ page }) => {
    await secondUserLogin(page);
    await expect(page).toHaveURL('/home');
    const candidateButton = page.getByText('Kandidaten Ansicht');
    await expect(candidateButton).toBeVisible();
    await candidateButton.click();
    await expect(page).toHaveURL('/candidate');
    await expect(page.getByText('Persönliche Kandidateninformationen')).toBeVisible();
    await expect(page.getByText('Bild hochladen')).toBeVisible();
    const fileButton = page.getByText('Datei auswählen');
    await expect(fileButton).toBeVisible();
    const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), fileButton.click()]);
    await fileChooser.setFiles('e2e/files/goat_e2e.png');
    const applyButton = page.getByText('Übernehmen');
    await expect(applyButton).toBeVisible();
    await applyButton.click();
    await expect(page.getByText('Persönliche Beschreibung')).toBeVisible();
    const descriptionField = page.getByLabel('Ihre Beschreibung');
    await expect(descriptionField).toBeVisible();
    await descriptionField.fill('Dies ist eine Test-Beschreibung für den Kandidaten.');
    const saveButton = page.getByRole('button', { name: 'Beschreibung speichern' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await expect(page.getByText(/Deine Informationen wurden erfolgreich geupdated./)).toBeVisible();
  });

  test('Should see Candidate List and view Candidate Details', async ({ page }) => {
    await userLogin(page);

    await expect(page).toHaveURL('/home');

    await expect(page.getByText('Zukünftige Wahlen')).toBeVisible();

    const infoButton = page
      .locator('li')
      .filter({ hasText: 'Testwahl' })
      .getByRole('button')
      .nth(1);

    await expect(infoButton).toBeVisible();
    await infoButton.click();

    const modalHeader = page.getByText('Kandidatenliste');
    await expect(modalHeader).toBeVisible();

    await expect(page.locator('.animate-spin')).not.toBeVisible();
    const candidate = page.getByText('Max Müller');
    await expect(candidate).toBeVisible();
    await candidate.click();

    await expect(page.getByText('Kandidatendetails')).toBeVisible();

    await expect(page.getByText('Max Müller')).toBeVisible();

    await expect(page.getByText('Info', { exact: true })).toBeVisible();

    const backButton = page.getByRole('button', { name: 'Zurück zur Liste' });
    await expect(backButton).toBeVisible();

    await backButton.click();
    await expect(modalHeader).toBeVisible();
  });
});
