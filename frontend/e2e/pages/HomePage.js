import { expect } from '@playwright/test';

export class HomePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.candidateViewButton = page.getByText('Kandidaten Ansicht');
    this.futureElectionsHeader = page.getByText('Zukünftige Wahlen');
  }

  async goto() {
    await this.page.goto('/home');
  }

  async navigateToCandidateProfile() {
    await this.candidateViewButton.click();
    await expect(this.page).toHaveURL('/candidate');
  }

  /**
   * @param {string} electionName
   */
  async openElectionCandidates(electionName) {
    await expect(this.futureElectionsHeader).toBeVisible();
    const electionItem = this.page.locator('li').filter({ hasText: electionName });
    await electionItem.getByRole('button').nth(1).click();
  }
}
