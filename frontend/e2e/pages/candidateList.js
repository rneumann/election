import { expect } from '@playwright/test';

/**
 * Page Object Model for the Candidate List.
 * Handles interactions with the candidate list modal and the candidate details view.
 */
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
   * Selects a candidate from the list.
   * Waits for the list to be loaded (spinner invisible) before clicking.
   * @param {string} name - The name of the candidate to select.
   */
  async selectCandidate(name) {
    await expect(this.modalHeader).toBeVisible();
    await expect(this.loadingSpinner).not.toBeVisible();
    await this.page.getByText(name).click();
  }

  /**
   * Verifies that the details view for a specific candidate is displayed correctly.
   * @param {string} name - The name of the candidate to verify.
   */
  async verifyCandidateDetails(name) {
    await expect(this.candidateDetailsHeader).toBeVisible();
    await expect(this.page.getByText(name)).toBeVisible();
    await expect(this.page.getByText('Info', { exact: true })).toBeVisible();
  }

  /**
   * Navigates back from the details view to the candidate list.
   */
  async goBackToList() {
    await this.backToListButton.click();
    await expect(this.modalHeader).toBeVisible();
  }
}
