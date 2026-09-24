/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        telemetry: {
          bg: '#0B0E14',
          panel: '#121721',
          border: '#1E2638',
          accent: '#E10600', // F1 Red accent
          cyan: '#00F0FF',   // Neon telemetry cyan
          green: '#00FF66',  // Sector / DRS green
          yellow: '#FFB800', // Warning / Yellow flag
          purple: '#D042FF'  // Fastest sector purple
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
