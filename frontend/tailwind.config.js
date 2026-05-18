/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: 'rgb(var(--brand-black-rgb) / <alpha-value>)',
          ink: 'rgb(var(--brand-ink-rgb) / <alpha-value>)',
          navy: 'rgb(var(--brand-navy-rgb) / <alpha-value>)',
          'navy-700': 'rgb(var(--brand-navy-700-rgb) / <alpha-value>)',
          blue: 'rgb(var(--brand-blue-rgb) / <alpha-value>)',
          bg: 'rgb(var(--brand-bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--brand-surface-rgb) / <alpha-value>)',
          'surface-muted': 'rgb(var(--brand-surface-muted-rgb) / <alpha-value>)',
          border: 'rgb(var(--brand-border-rgb) / <alpha-value>)',
          muted: 'rgb(var(--brand-muted-rgb) / <alpha-value>)'
        }
      }
    }
  },
  plugins: []
};
