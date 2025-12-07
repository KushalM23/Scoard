/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#271D1D',
        text: '#faf0d5',
        primary: '#EB5E28',
        accent: '#EB5E28',
        secondary: '#7776BC',
        light: {
          background: '#FFF5F5',
          text: '#2D2B35',
        }
      },
      fontFamily: {
        sans: ['Parkinsans', 'sans-serif'],
        display: ['Bungee', 'cursive'],
        mono: ['"Jersey 15"', 'monospace'],
      },
    },
  },
  plugins: [],
}
