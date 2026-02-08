import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1616',
        text: '#faf0d5',
        primary: '#EB5E28',
        accent: '#EB5E28',
        secondary: '#7774E2',
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
};
export default config;

