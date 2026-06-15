import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const profile = process.env.CONFIG_PROFILE || 'hka';
const themePath = path.join(__dirname, `config/theme.${profile}.json`);

let colors;
try {
  colors = JSON.parse(fs.readFileSync(themePath, 'utf-8')).colors;
} catch {
  colors = JSON.parse(fs.readFileSync(path.join(__dirname, 'config/theme.hka.json'), 'utf-8')).colors;
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary:          colors.primary,
        secondary:        colors.secondary,
        accent:           colors.accent,
        'hka-red':        colors.primary,
        'hka-dark':       colors.dark,
        'hka-gray':       colors.gray,
        'hka-light-gray': colors.lightGray,
        'brand-primary':  colors.primary,
        'brand-dark':     colors.dark,
        'brand-gray':     colors.gray,
        'brand-light':    colors.lightGray,
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      minHeight: { touch: '44px' },
      minWidth:  { touch: '44px' },
      keyframes: {
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shrink: {
          '0%':   { width: '100%' },
          '100%': { width: '0%' },
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        shrink:     'shrink 5s linear forwards',
      },
    },
  },
  plugins: [],
};
