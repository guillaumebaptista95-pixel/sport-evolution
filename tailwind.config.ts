// Palette, typographie et animations de l'application.
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080B',
          900: '#0C0E13',
          850: '#11141A',
          800: '#161A22',
          700: '#1E232D',
          600: '#2A303C',
          500: '#3A4150',
          400: '#5A6376',
          300: '#8891A5',
          200: '#B6BECD',
          100: '#DFE4EC',
        },
        brand: {
          50: '#F2F0FF',
          100: '#E4E0FF',
          200: '#C9C1FF',
          300: '#A99DFF',
          400: '#8A78FF',
          500: '#6C5CE7',
          600: '#5646C9',
          700: '#4335A3',
          800: '#31287A',
          900: '#221B54',
        },
        lime: {
          400: '#B6F36B',
          500: '#9BE23C',
          600: '#7CC323',
        },
        coral: {
          400: '#FF8A70',
          500: '#FF6B4A',
        },
        gold: {
          400: '#FFD37A',
          500: '#FFB627',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -24px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(108,92,231,0.35), 0 18px 50px -18px rgba(108,92,231,0.65)',
        limeGlow: '0 0 0 1px rgba(155,226,60,0.3), 0 18px 50px -18px rgba(155,226,60,0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
