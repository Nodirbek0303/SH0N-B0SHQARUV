/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          950: '#060B17',
          900: '#0A1126',
          800: '#0F1830',
          700: '#162241',
          600: '#1F2D52',
        },
        brand: {
          300: '#7DB5FF',
          400: '#4D9BFF',
          500: '#2F7EF5',
          600: '#1F63CC',
        },
        success: {
          400: '#3DE07A',
          500: '#22C55E',
          600: '#16A34A',
        },
        warning: {
          400: '#FFA726',
          500: '#F97316',
        },
        danger: {
          400: '#FF5C5C',
          500: '#EF4444',
        },
        cyan: {
          400: '#22D3EE',
        },
      },
    },
  },
  plugins: [],
};
