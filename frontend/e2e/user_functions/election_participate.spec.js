import { expect, test } from '@playwright/test';
import { thirdUserLogin, secondUserLogin, userLogin } from '../utils/authentication.js';

test.describe('Various participations in election', () => {
  test('Should see all avaliable elections', async ({ page }) => {
    await userLogin(page);
    await expect(page).toHaveURL('/home');
    await expect(page.getByText('Aktuelle Wahlen')).toBeVisible();
  });

  test('Should participate in an election', async ({ page }) => {
    await secondUserLogin(page);
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

  test('Should participate again in an election with dynamic vote distribution', async ({
    page,
  }) => {
    await thirdUserLogin(page);
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
      console.log('Test übersprungen: Keine Kandidaten verfügbar.');
      return;
    }

    const inputs = dialog.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10000 });
    const inputCount = await inputs.count();

    if (inputCount === 0) {
      throw new Error('FEHLER: Keine Inputs für Kandidaten gefunden.');
    }

    const votesLeftLabel = dialog.getByText(/Stimmen übrig:/);
    await expect(votesLeftLabel).toBeVisible();
    const votesLeftText = await votesLeftLabel.innerText();

    let votesRemaining = parseInt(votesLeftText.split(':')[1].trim(), 10);

    const firstInput = inputs.first();
    const maxPerCandidateStr = await firstInput.getAttribute('max');
    const maxPerCandidate = parseInt(maxPerCandidateStr || '1', 10);

    console.log(
      `Verteile ${votesRemaining} Stimmen auf ${inputCount} Kandidaten (Max pro Kandidat: ${maxPerCandidate})`,
    );

    for (let i = 0; i < inputCount; i++) {
      if (votesRemaining <= 0) break;

      const currentInput = inputs.nth(i);
      const votesToCast = Math.min(votesRemaining, maxPerCandidate);

      await currentInput.fill(String(votesToCast));
      await currentInput.blur();

      votesRemaining -= votesToCast;
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
    await userLogin(page);
    await page.goto('/home');
    await expect(page).toHaveURL('/home');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/voter/elections') && res.ok()),
      page.locator('div.group button', { hasText: /^Wahl starten$/ }).click(),
    ]);

    const heading = page.getByRole('heading', { name: /Wahlprozess/ });
    await expect(heading).toBeVisible();

    const dialog = page.getByRole('dialog');

    await expect(dialog.getByText('Keine Kandidaten vorhanden!')).not.toBeVisible();
    const inputs = dialog.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });

    await expect(inputs).not.toHaveCount(0);

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
