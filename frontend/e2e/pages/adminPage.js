import { expect } from '@playwright/test';

/**
 * Page Object Model for Admin functionalities.
 * Handles operations related to importing elections, voters, and candidates.
 */
export class AdminPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.fileInputButton = page.getByRole('button', { name: 'Datei auswählen' }).first();
    this.finalUploadButton = page.getByRole('button', { name: 'Hochladen', exact: true });
    this.validationSuccessMsg = page.getByText('Validierung erfolgreich');
    this.uploadSuccessMsg = page.getByText('Upload erfolgreich');
    this.validationSuccessMsgFile = page.getByText(/Datei erfolgreich validiert/);
  }

  /**
   * Starts the upload process and checks for focus (maintains original logic).
   * @param {string} buttonName - The name of the button to click.
   * @param {number} [index=0] - Optional index for buttons with the same name.
   */
  async startImportProcess(buttonName, index = 0) {
    let button = this.page.getByRole('button', { name: buttonName });
    if (index > 0 || buttonName === 'CSV-Datei hochladen') {
      button = button.nth(index);
    }

    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toBeFocused();
  }

  /**
   * Selects a file in the file chooser.
   * @param {string} filePath - Path to the file to be uploaded.
   */
  async selectFile(filePath) {
    await expect(this.fileInputButton).toBeVisible();
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.fileInputButton.click(),
    ]);
    await fileChooser.setFiles(filePath);
  }

  /**
   * Waits for the validation success message.
   * @param {RegExp} [specificCheck] - Optional regex check (e.g., /Wähler:/) that must also be visible.
   */
  async waitForValidation(specificCheck) {
    await expect(this.validationSuccessMsg).toBeVisible({ timeout: 15000 });
    if (specificCheck) {
      await expect(this.page.getByText(specificCheck)).toBeVisible({ timeout: 15000 });
    }
  }

  /**
   * Executes the final upload including the double click logic.
   * @param {string} apiEndpointPart - Part of the API URL to wait for (e.g., '/upload/elections').
   */
  async executeFinalUpload(apiEndpointPart) {
    await expect(this.uploadSuccessMsg).toBeVisible({ timeout: 15000 });
    await expect(this.validationSuccessMsgFile).toBeVisible();

    await expect(this.finalUploadButton).toBeEnabled();

    const [uploadResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) => resp.url().includes(apiEndpointPart) && resp.status() === 200,
      ),
      this.finalUploadButton.click(),
    ]);

    expect(uploadResponse.ok()).toBeTruthy();

    await this.finalUploadButton.click();
  }
}
