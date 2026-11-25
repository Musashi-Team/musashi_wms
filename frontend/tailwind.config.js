/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#FEF1F2', 100: '#FDE3E5', 200: '#FBCDD0', 500: '#EF2935', 600: '#D81F2B', 700: '#B81822' },
        page: '#F5F6F8',
        ink: { DEFAULT: '#1F2430', soft: '#5B6270', muted: '#8A91A0', line: '#E7E9EE' },
      },
      borderRadius: { card: '10px' },
      boxShadow: { card: '0 1px 2px rgba(16,24,40,0.04)' },
    },
  },
  plugins: [],
};
