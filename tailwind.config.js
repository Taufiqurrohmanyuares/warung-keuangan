/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)', 'Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        income: '#16a34a',
        expense: '#dc2626',
        surface: 'var(--card)',
        primary: {
          DEFAULT: '#5B4FE5',
          light: '#EEF0FE',
          dark: '#4A3FD1',
        },
        brand: {
          DEFAULT: 'var(--br)',
          dark: 'var(--dk)',
          gold: 'var(--gd)',
        },
        bg: 'var(--bg)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        mu: 'var(--mu)',
        ln: 'var(--ln)',
        br: 'var(--br)',
        dk: 'var(--dk)',
        gd: 'var(--gd)',
        so: 'var(--so)',
        rd: 'var(--rd)',
        rs: 'var(--rs)',
        am: 'var(--am)',
        lavender: 'var(--bg)',
        muted: 'var(--mu)',
        borderc: 'var(--ln)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}