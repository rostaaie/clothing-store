/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out',
        slideIn: 'slideIn 0.2s ease-out',
      },
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ef6a2c',
          600: '#dd5420',
          700: '#b8401a',
          800: '#93331b',
          900: '#772c19',
        },
        ink: {
          50: '#f6f7f8',
          100: '#eceef1',
          200: '#d5d9e0',
          300: '#b1b9c4',
          400: '#8691a2',
          500: '#677286',
          600: '#535c6f',
          700: '#444b5a',
          800: '#3a3f4c',
          900: '#1c1e26',
          950: '#101116',
        },
      },
    },
  },
  plugins: [],
};
