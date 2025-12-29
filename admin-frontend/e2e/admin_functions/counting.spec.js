import { expect, test } from '@playwright/test';
import { adminLogin } from '../utils/authentication';
import { CountingPage } from '../pages/countingPage';

test.describe('Counting Logic', () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test('CL - Ballot vote', async ({ page }) => {
    const countingPage = new CountingPage(page);
    await expect(page).toHaveURL('/admin');

    await countingPage.navigateToCounting();

    await countingPage.performCounting('Urabstimmung Semesterticket');
    await countingPage.verifyResult('');
  });

  test('sainte_lague', async ({ page }) => {
    const countingPage = new CountingPage(page);
    await expect(page).toHaveURL('/admin');

    await countingPage.navigateToCounting();

    await countingPage.performCounting('Studierendenparlament 2025');
    await countingPage.verifyResult('sainte_lague');
  });

  test('yes_no_referendum', async ({ page }) => {
    const countingPage = new CountingPage(page);
    await expect(page).toHaveURL('/admin');

    await countingPage.navigateToCounting();

    await countingPage.performCounting('Prorektor:in Lehre 2025');
    await countingPage.verifyResult('yes_no_referendum');
  });

  test('highest_votes_absolute', async ({ page }) => {
    const countingPage = new CountingPage(page);
    await expect(page).toHaveURL('/admin');

    await countingPage.navigateToCounting();

    await countingPage.performCounting('Fachschaftsvorstand IWI 2025');
    await countingPage.verifyResult('highest_votes_absolute');
  });
});
