import { expect, test } from '@playwright/test';
import { logout, userLogin } from '../utils/authentication.js';

test.describe('Various participations in election', () => {
  test.beforeEach(async ({ page }) => {
    await userLogin(page);
  });

  test('Should see all avaliable elections', async ({ page }) => {
    await expect(page).toHaveURL('/home');

    await expect(page.getByText('Wahl der Fachschaft')).toBeVisible();
    await expect(page.getByRole('button', { name: /Wahl starten/i })).toBeVisible();
  });

  test('Should participate in an election', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL('/home');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/voter/elections') && res.ok()),
      page.locator('div.group button', { hasText: /^Wahl starten$/ }).click(),
    ]);

    const heading = page.getByRole('heading', { name: /Wahlprozess/ });
    await expect(heading).toBeVisible();

    const dialog = page.getByRole('dialog');

    const noCandidatesMsg = dialog.getByText('Keine Kandidaten vorhanden!');
    if (await noCandidatesMsg.isVisible()) {
      return;
    }

    await expect(heading).not.toHaveText(/^- Wahlprozess/, { timeout: 10000 });

    const inputs = dialog.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });

    const inputCount = await inputs.count();
    if (inputCount === 0) {
      throw new Error('FEHLER: Keine Inputs gefunden.');
    }

    const votesLeftLabel = dialog.getByText(/Stimmen übrig:/);
    const votesLeftText = await votesLeftLabel.innerText();
    const totalVotes = parseInt(votesLeftText.split(':')[1].trim(), 10);

    const firstInput = inputs.first();
    const maxPerCandidateStr = await firstInput.getAttribute('max');
    const maxPerCandidate = parseInt(maxPerCandidateStr || '1', 10);

    let votesDistributed = 0;
    const votesForFirst = Math.min(totalVotes, maxPerCandidate);

    await firstInput.fill(String(votesForFirst));
    await firstInput.blur();
    votesDistributed += votesForFirst;

    if (votesDistributed < totalVotes && inputCount > 1) {
      const remaining = totalVotes - votesDistributed;
      const secondInput = inputs.nth(1);
      await secondInput.fill(String(remaining));
      await secondInput.blur();
    }

    await expect(dialog.getByText('Stimmen übrig: 0')).toBeVisible();

    const saveButton = dialog.getByRole('button', { name: 'Abstimmung speichern' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const confirmationHeader = page.getByText('Ihre Auswahl zur Kontrolle');
    await expect(confirmationHeader).toBeVisible();

    const confirmButton = page.getByRole('button', { name: 'Abstimmung bestätigen' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(confirmationHeader).not.toBeVisible({ timeout: 10000 });
  });

  test('Should submit an invalid vote', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL('/home');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/voter/elections') && res.ok()),
      page.locator('div.group button', { hasText: /^Wahl starten$/ }).click(),
    ]);

    const heading = page.getByRole('heading', { name: /Wahlprozess/ });
    await expect(heading).toBeVisible({ timeout: 15000 });

    const dialog = page.getByRole('dialog');

    const noCandidatesMsg = dialog.getByText('Keine Kandidaten vorhanden!');
    if (await noCandidatesMsg.isVisible()) {
      return;
    }

    await expect(heading).not.toHaveText(/^- Wahlprozess/, { timeout: 10000 });

    const inputs = dialog.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });

    const invalidCheckbox = dialog.getByLabel('Ich möchte meinen Stimmzettel ungültig abgeben!');
    await expect(invalidCheckbox).toBeVisible();
    await invalidCheckbox.check();
    await expect(invalidCheckbox).toBeChecked();

    const saveButton = dialog.getByRole('button', { name: 'Abstimmung speichern' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const confirmationHeader = page.getByText('Ihre Auswahl zur Kontrolle');
    await expect(confirmationHeader).toBeVisible();

    const confirmButton = page.getByRole('button', { name: 'Abstimmung bestätigen' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(confirmationHeader).not.toBeVisible({ timeout: 10000 });
  });
});
