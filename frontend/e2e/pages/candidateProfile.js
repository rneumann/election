import { expect } from '@playwright/test';

/**
 * Page Object Model for the Candidate Profile.
 * Allows candidates to edit their profile information and upload pictures.
 */
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
   * Uploads a profile picture by handling the file chooser dialog.
   * @param {string} filePath - Path to the image file to upload.
   */
  async uploadProfilePicture(filePath) {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.fileChooserButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    await this.applyImageButton.click();
  }

  /**
   * Updates the candidate's personal description and waits for the success message.
   * @param {string} text - The new description text.
   */
  async updateDescription(text) {
    await this.descriptionField.fill(text);
    await this.saveDescriptionButton.click();
    await expect(
      this.page.getByText(
        /Deine Informationen wurden erfolgreich gespeichert\.|Deine Informationen wurden erfolgreich geupdated\./,
      ),
    ).toBeVisible();
  }

  /**
   * Navigates back to the main/home view.
   */
  async returnToMainView() {
    await this.backToHomeButton.click();
    await expect(this.page).toHaveURL('/home');
  }

  /**
   * Verifies that the profile image is currently visible on the page.
   */
  async expectProfileImageVisible() {
    await expect(this.profileImage).toBeVisible();
  }
}
