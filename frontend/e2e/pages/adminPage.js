import { expect } from '@playwright/test';

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
   * Startet den Upload-Prozess und prüft den Fokus (Original-Logik)
   * @param {string} buttonName
   * @param {number} [index=0] - Optionaler Index für Buttons mit gleichem Namen
   */
  async startImportProcess(buttonName, index = 0) {
    // Falls ein Index benötigt wird (wie bei CSV-Uploads)
    let button = this.page.getByRole('button', { name: buttonName });
    if (index > 0 || buttonName === 'CSV-Datei hochladen') {
      button = button.nth(index);
    }

    await expect(button).toBeVisible();
    await button.click();
    await expect(button).toBeFocused(); // Original-Check beibehalten
  }

  /**
   * Wählt Datei aus
   * @param {string} filePath
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
   * Validierung abwarten
   * @param {RegExp} [specificCheck] - Optionaler Regex-Check (z.B. /Wähler:/)
   */
  async waitForValidation(specificCheck) {
    await expect(this.validationSuccessMsg).toBeVisible({ timeout: 15000 });
    if (specificCheck) {
      // Timeout explizit setzen, falls im Original vorhanden (z.B. bei Wählern)
      await expect(this.page.getByText(specificCheck)).toBeVisible({ timeout: 15000 });
    }
  }

  /**
   * Führt den finalen Upload durch - Inklusive des doppelten Klicks
   * @param {string} apiEndpointPart
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

    // Funktionalität: Der zweite Klick bleibt erhalten, wie angefordert
    await this.finalUploadButton.click();
  }
}
