/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nura: {
          orange: '#FF6B4A',
          pink: '#F02FC2',
          purple: '#A23CFD',
          light: '#FFF5F4',
          dark: '#1C1917',
          gray: '#F5F5F4',
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'], // Elegant serif for large titles
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'nura-gradient': 'linear-gradient(135deg, #FF6B4A 0%, #F02FC2 50%, #A23CFD 100%)',
        'nura-radial': 'radial-gradient(circle at var(--x, 50%) var(--y, 50%), #F02FC2 0%, #FF6B4A 40%, transparent 80%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
        'glow': '0 0 20px rgba(240, 47, 194, 0.4)',
      },
      backdropBlur: {
        'glass': '20px',
      }
    },
  },
  plugins: [],
}