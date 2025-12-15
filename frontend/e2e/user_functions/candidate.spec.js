import { test, expect } from '@playwright/test';
import { userLogin, secondUserLogin } from '../utils/authentication';
import { HomePage } from '../pages/HomePage';
import { CandidateProfilePage } from '../pages/candidateProfile';
import { CandidateListPage } from '../pages/candidateList';

test.describe('Candidate Functionalities', () => {
  test('Should upload a profile picture', async ({ page }) => {
    const homePage = new HomePage(page);
    const candidatePage = new CandidateProfilePage(page);

    await secondUserLogin(page);
    await expect(page).toHaveURL('/home');

    // Navigation zum Profil
    await homePage.navigateToCandidateProfile();

    // Bild hochladen
    await expect(page.getByText('Persönliche Kandidateninformationen')).toBeVisible();
    await candidatePage.uploadProfilePicture('e2e/files/goat_e2e.png');

    // Beschreibung aktualisieren
    await expect(page.getByText('Persönliche Beschreibung')).toBeVisible();
    await candidatePage.updateDescription('Dies ist eine Test-Beschreibung für den Kandidaten.');

    // Zurück zur Hauptansicht und Überprüfung
    await candidatePage.returnToMainView();

    // Erneuter Aufruf zur Prüfung, ob das Bild gespeichert wurde
    await homePage.navigateToCandidateProfile();
    await candidatePage.expectProfileImageVisible();
  });

  test('Should see Candidate List and view Candidate Details', async ({ page }) => {
    const homePage = new HomePage(page);
    const candidateList = new CandidateListPage(page);

    await userLogin(page);
    await expect(page).toHaveURL('/home');

    // Liste für eine bestimmte Wahl öffnen
    await homePage.openElectionCandidates('Testwahl');

    // Kandidatendetails prüfen
    await candidateList.selectCandidate('Max Müller');
    await candidateList.verifyCandidateDetails('Max Müller');

    // Zurück zur Liste navigieren
    await candidateList.goBackToList();
  });
});
