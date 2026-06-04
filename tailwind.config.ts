import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f7f3ff',
          100: '#ede5ff',
          200: '#ded0ff',
          300: '#c3a8ff',
          400: '#9c6cff',
          500: '#7447ee',
          600: '#5f32dc',
          700: '#4b23b7',
          800: '#351579',
          900: '#25105d',
        },
        ink: '#21124f',
      },
      boxShadow: {
        card: '0 18px 45px rgba(80, 50, 170, 0.10)',
        button: '0 14px 28px rgba(95, 50, 220, 0.28)',
        soft: '0 10px 24px rgba(80, 50, 170, 0.08)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
