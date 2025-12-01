/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // HKA Farben
        primary: '#E30613',     
        secondary: '#58595B',   
        accent: '#9D9D9C',      
        
        // Kompatibilitäts-Namen
        'hka-red': '#E30613',
        'hka-dark': '#333333',
        'hka-gray': '#58595B',
        'hka-light-gray': '#F2F2F2',

        'brand-primary': '#E30613',
        'brand-dark': '#1a1a1a',
        'brand-gray': '#666666',
        'brand-light': '#f4f4f4',
      },
      fontSize: {
        '2xs': '0.625rem',
      },
    },
  },
  plugins: [],
}