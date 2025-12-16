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
    name: "HKA",
    fullName: "Hochschule Karlsruhe",
  },

  // Primary Brand Colors
  colors: {
    // Main brand color (used for buttons, headers, highlights)
    primary: "#e20000ff", // HKA Red

    // Dark color (used for text, dark backgrounds)
    dark: "#333333",

    // Medium gray (used for secondary text)
    gray: "#666666",

    // Light gray (used for backgrounds)
    lightGray: "#F5F5F5",

    // Optional: Additional colors for future use
    secondary: "#E2001A", // Can be different from primary
    accent: "#E2001A", // For special highlights
  },

  // Text content customization
  text: {
    appTitle: "Wahlsystem Admin",
    loginSubtitle: "Bitte melden Sie sich mit Ihren Admin-Anmeldedaten an",
    welcomeTitle: "Willkommen im HKA Wahlsystem Admin",
    welcomeSubtitle: "Administration des BSI-konformen Online-Wahlsystems",
  },

  // Role names (optional customization)
  roles: {
    admin: "Administrator",
    committee: "Wahlausschuss",
    voter: "Wähler",
  },
};
