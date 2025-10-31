/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'hka-red': '#E2001A',
        'hka-dark': '#333333',
        'hka-gray': '#666666',
        'hka-light-gray': '#F5F5F5',
      },
    },
  },
  plugins: [],
};
