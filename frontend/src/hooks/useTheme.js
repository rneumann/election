import { themeConfig } from '../../theme.config.js';

/**
 * Custom hook to access theme configuration.
 * Provides colors, text content, and institution information.
 *
 * @returns {object} Theme configuration object
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
