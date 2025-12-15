import { expect } from '@playwright/test';

export class CandidateListPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.modalHeader = page.getByText('Kandidatenliste');
    this.loadingSpinner = page.locator('.animate-spin');
    this.candidateDetailsHeader = page.getByText('Kandidatendetails');
    this.backToListButton = page.getByRole('button', { name: 'Zurück zur Liste' });
  }

  /**
   * @param {string} name
   */
  async selectCandidate(name) {
    await expect(this.modalHeader).toBeVisible();
    await expect(this.loadingSpinner).not.toBeVisible();
    await this.page.getByText(name).click();
  }

  /**
   * @param {string} name
   */
  async verifyCandidateDetails(name) {
    await expect(this.candidateDetailsHeader).toBeVisible();
    await expect(this.page.getByText(name)).toBeVisible();
    await expect(this.page.getByText('Info', { exact: true })).toBeVisible();
  }

  async goBackToList() {
    await this.backToListButton.click();
    await expect(this.modalHeader).toBeVisible();
  }
}
