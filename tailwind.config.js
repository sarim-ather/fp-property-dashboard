/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%':     { transform: 'translateX(-7px)' },
          '40%':     { transform: 'translateX(7px)' },
          '60%':     { transform: 'translateX(-4px)' },
          '80%':     { transform: 'translateX(4px)' },
        },
        dotPop: {
          '0%':   { transform: 'scale(1)' },
          '45%':  { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up':  'fadeInUp 0.38s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':     'fadeIn 0.25s ease-out both',
        'scale-in':    'scaleIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
        'shake':       'shake 0.38s ease-out',
        'dot-pop':     'dotPop 0.18s ease-out',
        'slide-down':  'slideDown 0.3s cubic-bezier(0.22,1,0.36,1) both',
      },
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
