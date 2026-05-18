/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#070B12',
          ink: '#111827',
          navy: '#0B1F3A',
          'navy-700': '#12355B',
          blue: '#1D4ED8',
          bg: '#F3F6FA',
          surface: '#FFFFFF',
          border: '#D6DEE8',
          muted: '#526173'
        }
      }
    }
  },
  plugins: []
};
