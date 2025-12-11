import { expect, test } from '@playwright/test';
import { adminLogin } from '../utils/authentication';

test.describe('Counting Logic', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('CL - Ballot vote', async ({ page }) => {
    await expect(page).toHaveURL('/admin');

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/admin/elections') && resp.request().method() === 'GET',
    );
    const countingButton = page.locator('button', { hasText: 'Wahlergebnisse auszählen' });
    await expect(countingButton).toBeVisible();
    await countingButton.click();

    const header = page.locator('h2', { hasText: 'Wahlergebnisse auszählen' });
    await expect(header).toBeVisible();

    await expect(page.getByText('Urabstimmung Semesterticket')).toBeVisible();
    const buttonCount = page.getByRole('button', { name: 'Auszählen', exact: true });
    await buttonCount.nth(0).click();

    await expect(page.getByText('Auszählung erfolgreich')).toBeVisible();
    await expect(page.getByText('Algorithmus: ')).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Wahlergebnis als Excel exportieren' }),
    ).toBeVisible();
  });

  test('sainte_lague', async ({ page }) => {
    await expect(page).toHaveURL('/admin');

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/admin/elections') && resp.request().method() === 'GET',
    );
    const countingButton = page.locator('button', { hasText: 'Wahlergebnisse auszählen' });
    await expect(countingButton).toBeVisible();
    await countingButton.click();

    const header = page.locator('h2', { hasText: 'Wahlergebnisse auszählen' });
    await expect(header).toBeVisible();

    await expect(page.getByText('Studierendenparlament 2025')).toBeVisible();
    const buttonCount = page.getByRole('button', { name: 'Auszählen', exact: true });
    await buttonCount.nth(6).click();

    await expect(page.getByText('Auszählung erfolgreich')).toBeVisible();
    await expect(page.getByText('Algorithmus: sainte_lague')).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Wahlergebnis als Excel exportieren' }),
    ).toBeVisible();
  });

  test('yes_no_referendum', async ({ page }) => {
    await expect(page).toHaveURL('/admin');

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/admin/elections') && resp.request().method() === 'GET',
    );
    const countingButton = page.locator('button', { hasText: 'Wahlergebnisse auszählen' });
    await expect(countingButton).toBeVisible();
    await countingButton.click();

    const header = page.locator('h2', { hasText: 'Wahlergebnisse auszählen' });
    await expect(header).toBeVisible();

    await expect(page.getByText('Prorektor:in Lehre 2025')).toBeVisible();
    const buttonCount = page.getByRole('button', { name: 'Auszählen', exact: true });
    await buttonCount.nth(2).click();

    await expect(page.getByText('Auszählung erfolgreich')).toBeVisible();
    await expect(page.getByText('Algorithmus: yes_no_referendum')).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Wahlergebnis als Excel exportieren' }),
    ).toBeVisible();
  });

  test('highest_votes_absolute', async ({ page }) => {
    await expect(page).toHaveURL('/admin');

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/admin/elections') && resp.request().method() === 'GET',
    );
    const countingButton = page.locator('button', { hasText: 'Wahlergebnisse auszählen' });
    await expect(countingButton).toBeVisible();
    await countingButton.click();

    const header = page.locator('h2', { hasText: 'Wahlergebnisse auszählen' });
    await expect(header).toBeVisible();

    await expect(page.getByText('Fachschaftsvorstand IWI 2025')).toBeVisible();
    const buttonCount = page.getByRole('button', { name: 'Auszählen', exact: true });
    await buttonCount.nth(4).click();

    await expect(page.getByText('Auszählung erfolgreich')).toBeVisible();
    await expect(page.getByText('Algorithmus: highest_votes_absolute')).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Wahlergebnis als Excel exportieren' }),
    ).toBeVisible();
  });
});
