import { themeConfig } from '../../theme.config.js';

/**
 * Hook for accessing application theme configuration.
 * Provides institution branding, color scheme, and localized text content.
 * Theme is defined in theme.config.js at project root.
 *
 * @returns {object} Theme configuration with colors, text, and institution data
 *
 * @example
 * const theme = useTheme();
 * console.log(theme.institution.name); // 'HKA'
 * console.log(theme.colors.primary); // '#E2001A'
 * console.log(theme.text.appTitle); // 'Wahlsystem'
 */
export const useTheme = () => {
  return themeConfig;
};
