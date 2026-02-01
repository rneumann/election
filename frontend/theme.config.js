/**
 * Theme Configuration
 * Customize colors and branding for your institution.
 *
 * How to use:
 * 1. Change the colors below to match your institution's branding
 * 2. Colors are automatically applied throughout the application
 * 3. No CSS changes needed - just update this file!
 */

export const themeConfig = {
  // Institution Name
  institution: {
    name: 'HKA',
    fullName: 'Hochschule Karlsruhe',
  },

  // Primary Brand Colors
  colors: {
    // Main brand color (used for buttons, headers, highlights)
    primary: '#e20000ff', // HKA Red

    // Dark color (used for text, dark backgrounds)
    dark: '#333333',

    // Medium gray (used for secondary text)
    gray: '#666666',

    // Light gray (used for backgrounds)
    lightGray: '#F5F5F5',

    // Optional: Additional colors for future use
    secondary: '#E2001A', // Can be different from primary
    accent: '#E2001A', // For special highlights
  },

  // Text content customization
  text: {
    appTitle: 'Wahlsystem',
    loginSubtitle: 'Bitte melden Sie sich mit Ihren Anmeldedaten an',
    welcomeTitle: 'Willkommen im HKA Wahlsystem',
    welcomeSubtitle: 'BSI-konformes Online-Wahlsystem für hochschulinterne Wahlen',
    checkVote: 'Ihre Auswahl zur Kontrolle',
    confirmationInvalid: 'Ihr Stimmzettel wird ungültig abgegeben!',
    confirmVote: 'Abstimmung bestätigen',
    checkBoxConfirm: 'Ich möchte meinen Stimmzettel ungültig abgeben!',
    auditSearch: 'Suche (Aktion, Akteur, ID)...',
  },

  placeholders: {
    loginUsername: 'Ihr RZ-Kürzel',
    loginPassword: 'Ihr Passwort',
  },

  // Role names (optional customization)
  roles: {
    admin: 'Administrator',
    committee: 'Wahlausschuss',
    voter: 'Wähler',
  },
};
