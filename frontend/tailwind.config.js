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
      // Optimized for mobile devices
      fontSize: {
        '2xs': '0.625rem', // 10px - for very small mobile text
      },
      minHeight: {
        touch: '44px', // Apple's recommended touch target size
      },
      minWidth: {
        touch: '44px',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shrink: {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        shrink: 'shrink 5s linear forwards',
      },
    },
  },
  plugins: [],
};
