import { expect } from '@playwright/test';

/**
 * Page Object Model for the Counting Page.
 * Handles the election vote counting process and result verification.
 */
export class CountingPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    this.txtCountingTitle = 'Wahlergebnisse auszählen';
    this.txtSuccess = 'Auszählung erfolgreich';
    this.txtExportBtn = 'Wahlergebnis als Excel exportieren';
    this.txtCountBtn = 'Auszählen';
    this.txtAlgorithmPrefix = 'Algorithmus: ';

    this.navButton = page.locator('button', { hasText: this.txtCountingTitle });
    this.header = page.locator('h2', { hasText: this.txtCountingTitle });
    this.successMessage = page.getByText(this.txtSuccess);
    this.exportButton = page.getByRole('button', { name: this.txtExportBtn });
  }

  /**
   * Navigates to the counting view by clicking the sidebar/menu button.
   */
  async navigateToCounting() {
    await expect(this.navButton).toBeVisible();
    await this.navButton.click();
    await expect(this.header).toBeVisible();
  }

  /**
   * Executes the counting process for a specific election.
   * @param {string} electionName - The name of the election to verify presence.
   * @param {number} buttonIndex - The index of the count button (based on DOM order).
   */
  async performCounting(electionName, buttonIndex) {
    await expect(this.page.getByText(electionName)).toBeVisible();
    const countBtn = this.page
      .getByRole('button', { name: this.txtCountBtn, exact: true })
      .nth(buttonIndex);
    await countBtn.click();
  }

  /**
   * Verifies the counting result and the algorithm name used.
   * @param {string} [algorithmSuffix=''] - The specific name of the algorithm (optional).
   */
  async verifyResult(algorithmSuffix = '') {
    await expect(this.successMessage).toBeVisible();

    const algoText = this.txtAlgorithmPrefix + algorithmSuffix;
    await expect(this.page.getByText(algoText)).toBeVisible();

    await expect(this.exportButton).toBeVisible();
  }
}
