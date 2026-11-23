/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pri: { DEFAULT: '#75A815', dark: '#4F7A0A' },
        lime: '#89C124',
        mint: '#F1F7E7',
        surface: '#F5F6F8',
        line: '#E8EAEE',
        ink: '#1C1E21',
        slate: '#6B7280',
        gold: '#F3B94F',
        danger: '#D64545',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 4px 12px rgba(28,30,33,0.06)' },
      borderRadius: { card: '16px', btn: '14px' },
    },
  },
  plugins: [],
};
