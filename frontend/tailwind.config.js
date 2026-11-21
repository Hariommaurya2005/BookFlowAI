/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F1F0FF',
          100: '#E6E5FF',
          200: '#D0CEFF',
          300: '#B2AEFF',
          400: '#918BFF',
          500: '#756CF8',
          600: '#6258E8',
          700: '#5146C9',
          800: '#413AA2',
          900: '#302B79',
        },
        accent: {
          50: '#E7FBF7',
          100: '#C9F6EE',
          500: '#17B89A',
          600: '#0D9F86',
          700: '#087E6B',
        },
        background: '#F5F7FC',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      width: { sidebar: '276px' },
      height: { navbar: '72px' },
      boxShadow: {
        premium: '0 12px 38px rgba(31, 41, 87, 0.08)',
        elevated: '0 24px 64px rgba(31, 41, 87, 0.14)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-12px)' } },
      },
      animation: {
        'fade-up': 'fadeUp 500ms cubic-bezier(.2,.7,.2,1) both',
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
