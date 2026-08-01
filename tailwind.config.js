/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        bouba: {
          purple: '#6C3EF4',
          dark: '#0F0D1A',
          light: '#A78BFA',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
      screens: {
        'xs': '375px',   // iPhone SE
        'sm': '640px',   // Mobile
        'md': '768px',   // Tablet
        'lg': '1024px',  // Desktop petit
        'xl': '1280px',  // Desktop
        '2xl': '1536px', // Desktop large
      },
    },
  },
}