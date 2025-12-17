import { expect } from '@playwright/test';

/**
 * Page Object Model for the Home Page.
 * Contains selectors and methods to interact with the dashboard/home view.
 */
export class HomePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.candidateViewButton = page.getByText('Kandidaten Ansicht');
    this.futureElectionsHeader = page.getByText('Zukünftige Wahlen');
  }

  /**
   * Navigates directly to the home page URL.
   */
  async goto() {
    await this.page.goto('/home');
  }

  /**
   * Navigates to the candidate profile view by clicking the button
   * and verifies the URL change.
   */
  async navigateToCandidateProfile() {
    await this.candidateViewButton.click();
    await expect(this.page).toHaveURL('/candidate');
  }

  /**
   * Opens the list of candidates for a specific future election.
   * @param {string} electionName - The name of the election to select.
   */
  async openElectionCandidates(electionName) {
    await expect(this.futureElectionsHeader).toBeVisible();
    const electionItem = this.page.locator('li').filter({ hasText: electionName });
    await electionItem.getByRole('button').nth(1).click();
  }

  /**
   * Verifies that the "Current Elections" section is visible.
   */
  async expectCurrentElectionsVisible() {
    await expect(this.page.getByText('Aktuelle Wahlen')).toBeVisible();
  }
}
