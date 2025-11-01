import { themeConfig } from './theme.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand colors from theme.config.js
        primary: themeConfig.colors.primary,
        secondary: themeConfig.colors.secondary,
        accent: themeConfig.colors.accent,

        // Legacy HKA names (for backward compatibility)
        'hka-red': themeConfig.colors.primary,
        'hka-dark': themeConfig.colors.dark,
        'hka-gray': themeConfig.colors.gray,
        'hka-light-gray': themeConfig.colors.lightGray,

        // Semantic color names (recommended for new code)
        'brand-primary': themeConfig.colors.primary,
        'brand-dark': themeConfig.colors.dark,
        'brand-gray': themeConfig.colors.gray,
        'brand-light': themeConfig.colors.lightGray,
      },
    },
  },
  plugins: [],
};
