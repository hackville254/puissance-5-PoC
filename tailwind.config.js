/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './App.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef5ff',
          100: '#dbe9ff',
          200: '#bfd9ff',
          300: '#94c1ff',
          400: '#63a0ff',
          500: '#3f7cff',
          600: '#2c5df5',
          700: '#2448e0',
          800: '#233cb5',
          900: '#22368f'
        }
      }
    },
  },
  plugins: [],
}
