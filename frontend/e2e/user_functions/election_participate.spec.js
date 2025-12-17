import { test, expect } from '@playwright/test';
import { thirdUserLogin, secondUserLogin, userLogin } from '../utils/authentication.js';
import { HomePage } from '../pages/HomePage.js';
import { VotingPage } from '../pages/votingPage.js';

test.describe('Various participations in election', () => {
  test('Should see all avaliable elections', async ({ page }) => {
    const homePage = new HomePage(page);
    await userLogin(page);
    await expect(page).toHaveURL('/home');
    await homePage.expectCurrentElectionsVisible();
  });

  test('Should participate in an election', async ({ page }) => {
    const votingPage = new VotingPage(page);

    await secondUserLogin(page);
    await page.goto('/home');
    await expect(page).toHaveURL('/home');

    await votingPage.startElection();

    const canVote = await votingPage.candidatesAvailable();
    if (!canVote) {
      return;
    }

    await votingPage.distributeVotesSimple();
    await votingPage.completeVotingProcess();
  });

  test('Should participate again in an election with dynamic vote distribution', async ({
    page,
  }) => {
    const votingPage = new VotingPage(page);

    await thirdUserLogin(page);
    await page.goto('/home');
    await expect(page).toHaveURL('/home');

    await votingPage.startElection();

    const canVote = await votingPage.candidatesAvailable();
    if (!canVote) {
      return;
    }

    await votingPage.distributeVotesDynamic();
    await votingPage.completeVotingProcess();
  });

  test('Should submit an invalid vote', async ({ page }) => {
    const votingPage = new VotingPage(page);

    await userLogin(page);
    await page.goto('/home');
    await expect(page).toHaveURL('/home');

    await votingPage.startElection();

    await expect(votingPage.noCandidatesMsg).not.toBeVisible();

    await votingPage.submitInvalidVote();
    await votingPage.completeVotingProcess();
  });
});
