/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#DCFF4A',
        secondary: '#16131F',
        background: '#16131F',
        surface: '#221E2E',
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
