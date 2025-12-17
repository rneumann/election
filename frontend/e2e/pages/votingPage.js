import { expect } from '@playwright/test';

/**
 * Page Object Model for the Voting Page.
 * Handles the voting dialog, vote distribution logic, and submission.
 */
export class VotingPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.startButton = page.locator('div.group button', { hasText: /^Wahl starten$/ });
    this.dialog = page.getByRole('dialog');
    this.heading = page.getByRole('heading', { name: /Wahlprozess/ });
    this.inputs = this.dialog.locator('input[type="number"]');
    this.votesLeftLabel = this.dialog.getByText(/Stimmen übrig:/);
    this.saveButton = this.dialog.getByRole('button', { name: 'Abstimmung speichern' });
    this.confirmationHeader = page.getByText('Ihre Auswahl zur Kontrolle');
    this.confirmButton = page.getByRole('button', { name: 'Abstimmung bestätigen' });
    this.noCandidatesMsg = this.dialog.getByText('Keine Kandidaten vorhanden!');
    this.invalidCheckbox = this.dialog.getByLabel(
      'Ich möchte meinen Stimmzettel ungültig abgeben!',
    );
  }

  /**
   * Starts the election by clicking the start button and waiting for the API response.
   */
  async startElection() {
    await Promise.all([
      this.page.waitForResponse((res) => res.url().includes('/voter/elections') && res.ok()),
      this.startButton.click(),
    ]);
    await expect(this.heading).toBeVisible();
  }

  /**
   * Checks if candidates are available for the election.
   * @returns {Promise<boolean>} true if candidates exist; false if "No candidates" message appears.
   */
  async candidatesAvailable() {
    if (await this.noCandidatesMsg.isVisible()) {
      return false;
    }

    await expect(this.heading).not.toHaveText(/^- Wahlprozess/, { timeout: 10000 });
    await expect(this.inputs.first()).toBeVisible({ timeout: 5000 });

    const count = await this.inputs.count();
    if (count === 0) {
      throw new Error('FEHLER: Keine Inputs gefunden.');
    }
    return true;
  }

  /**
   * Retrieves the total number of available votes from the label.
   * @returns {Promise<number>} The total number of votes.
   */
  async _getTotalVotes() {
    const text = await this.votesLeftLabel.innerText();
    return parseInt(text.split(':')[1].trim(), 10);
  }

  /**
   * Retrieves the maximum votes allowed per candidate from the first input.
   * @returns {Promise<number>} The max votes per candidate (defaults to 1).
   */
  async _getMaxPerCandidate() {
    const maxStr = await this.inputs.first().getAttribute('max');
    return parseInt(maxStr || '1', 10);
  }

  /**
   * Distributes votes using the simple logic (filling first, then second input).
   */
  async distributeVotesSimple() {
    const totalVotes = await this._getTotalVotes();
    const maxPerCandidate = await this._getMaxPerCandidate();
    const inputCount = await this.inputs.count();

    let votesDistributed = 0;
    const votesForFirst = Math.min(totalVotes, maxPerCandidate);

    const firstInput = this.inputs.first();
    await firstInput.fill(String(votesForFirst));
    await firstInput.blur();
    votesDistributed += votesForFirst;

    if (votesDistributed < totalVotes && inputCount > 1) {
      const remaining = totalVotes - votesDistributed;
      const secondInput = this.inputs.nth(1);
      await secondInput.fill(String(remaining));
      await secondInput.blur();
    }
  }

  /**
   * Distributes votes dynamically across all available candidates using a loop.
   */
  async distributeVotesDynamic() {
    let votesRemaining = await this._getTotalVotes();
    const maxPerCandidate = await this._getMaxPerCandidate();
    const inputCount = await this.inputs.count();

    for (let i = 0; i < inputCount; i++) {
      if (votesRemaining <= 0) {
        break;
      }

      const currentInput = this.inputs.nth(i);
      const votesToCast = Math.min(votesRemaining, maxPerCandidate);

      await currentInput.fill(String(votesToCast));
      await currentInput.blur();

      votesRemaining -= votesToCast;
    }
  }

  /**
   * Selects the option to submit an invalid vote.
   */
  async submitInvalidVote() {
    await expect(this.inputs.first()).toBeVisible({ timeout: 5000 });
    await expect(this.inputs).not.toHaveCount(0);

    await expect(this.invalidCheckbox).toBeVisible();
    await this.invalidCheckbox.check();
    await expect(this.invalidCheckbox).toBeChecked();
  }

  /**
   * Completes the voting process by saving and confirming the vote.
   * Checks for "0 votes left" if the vote is valid.
   */
  async completeVotingProcess() {
    if (!(await this.invalidCheckbox.isChecked())) {
      await expect(this.dialog.getByText('Stimmen übrig: 0')).toBeVisible();
    }

    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();

    await expect(this.confirmationHeader).toBeVisible();
    await expect(this.confirmButton).toBeVisible();
    await this.confirmButton.click();

    await expect(this.confirmationHeader).not.toBeVisible({ timeout: 10000 });
  }
}
