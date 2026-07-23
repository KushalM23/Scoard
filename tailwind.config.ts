import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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
        },
        surface: {
          dark: '#171313',
          card: '#27272b',
          panel: '#2c2c2f',
          hover: '#241f1f',
          elevated: '#302828',
          border: '#352e2e',
          borderLight: '#3c3434',
        },
        status: {
          signing: '#40c057',
          trade: '#339af0',
          waive: '#ff6b6b',
          other: '#fcc419',
        },
      },
      fontFamily: {
        sans: ['var(--font-parkinsans)', 'sans-serif'],
        display: ['var(--font-bungee)', 'cursive'],
        mono: ['var(--font-jersey)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
