/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        income: '#16a34a',
        expense: '#dc2626',
        lavender: '#EEECFB',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#5B4FE5',
          light: '#EEF0FE',
          dark: '#4A3FD1',
        },
        ink: '#1E1B2E',
        muted: '#8B87A3',
        borderc: '#E4E1F5',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}