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
    this.electionSelect = page.locator('#election-select');
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
   * Selects an election from the dropdown (required for voter uploads).
   * Waits for elections to load and selects the first available one.
   */
  async selectElection() {
    // Wait for the election dropdown to be visible and enabled
    await expect(this.electionSelect).toBeVisible({ timeout: 10000 });

    // Wait for elections to load (dropdown should have options)
    await this.page.waitForFunction(
      () => {
        const select = document.querySelector('#election-select');
        return select && select.options.length > 1;
      },
      { timeout: 10000 },
    );

    // Select the first available election (index 1, since 0 is the placeholder)
    await this.electionSelect.selectOption({ index: 1 });
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
    // Wait for validation to complete (file validation message)
    await expect(this.validationSuccessMsgFile).toBeVisible({ timeout: 15000 });

    // Ensure upload button is enabled before clicking
    await expect(this.finalUploadButton).toBeEnabled({ timeout: 10000 });

    // Click upload and wait for successful API response (200 OK or 201 Created)
    const [uploadResponse] = await Promise.all([
      this.page.waitForResponse(
        (resp) =>
          resp.url().includes(apiEndpointPart) && (resp.status() === 200 || resp.status() === 201),
      ),
      this.finalUploadButton.click(),
    ]);

    expect(uploadResponse.ok()).toBeTruthy();

    // Verify upload success message appears after upload
    await expect(this.uploadSuccessMsg).toBeVisible({ timeout: 15000 });
  }

  /**
   * Deletes all data from the database via the admin UI.
   * Navigates to "Datenbank leeren" and confirms deletion.
   */
  async deleteAllData() {
    // Click on "Datenbank leeren" button in the navigation
    const deleteButton = this.page.getByRole('button', { name: 'Datenbank leeren' });
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Wait for the delete view to load, then click the delete button
    const confirmButton = this.page.getByRole('button', { name: 'Daten löschen' });
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    await confirmButton.click();

    // Wait for confirmation alert dialog and confirm
    const finalConfirmButton = this.page.getByRole('button', { name: 'Löschen', exact: true });
    await expect(finalConfirmButton).toBeVisible({ timeout: 5000 });
    await finalConfirmButton.click();

    // Wait for deletion to complete
    await this.page.waitForTimeout(2000);
  }
}
