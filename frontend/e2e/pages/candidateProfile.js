import { expect } from '@playwright/test';

export class CandidateProfilePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.fileChooserButton = page.getByText('Datei auswählen');
    this.applyImageButton = page.getByText('Übernehmen');
    this.descriptionField = page.getByLabel('Ihre Beschreibung');
    this.saveDescriptionButton = page.getByRole('button', { name: 'Beschreibung speichern' });
    this.backToHomeButton = page.getByRole('button', { name: 'Wechsel zur Hauptansicht' });
    this.profileImage = page.getByRole('img').first();
  }

  /**
   * @param {string} filePath
   */
  async uploadProfilePicture(filePath) {
    // Warten auf den FileChooser Event bevor geklickt wird
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.fileChooserButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    await this.applyImageButton.click();
  }

  /**
   * @param {string} text
   */
  async updateDescription(text) {
    await this.descriptionField.fill(text);
    await this.saveDescriptionButton.click();
    await expect(
      this.page.getByText(/Deine Informationen wurden erfolgreich geupdated./),
    ).toBeVisible();
  }

  async returnToMainView() {
    await this.backToHomeButton.click();
    await expect(this.page).toHaveURL('/home');
  }

  async expectProfileImageVisible() {
    await expect(this.profileImage).toBeVisible();
  }
}
