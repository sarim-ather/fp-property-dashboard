/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#FAF7F2',
        bone: '#F0EBE3',
        ink: {
          DEFAULT: '#1A1A2E',
          500: '#6B6B8A',
          300: '#9898B0',
        },
        navy: {
          DEFAULT: '#0F3460',
          600: '#0a2a50',
          400: '#1a4a7a',
          200: '#b8c9e0',
        },
        forest: {
          DEFAULT: '#1B4332',
          light: '#2d6a4f',
        },
        brass: {
          DEFAULT: '#B8860B',
          dark: '#8B6914',
          light: '#D4AF37',
          pale: '#FAF0D7',
        },
      },
    },
  },
  plugins: [],
};
