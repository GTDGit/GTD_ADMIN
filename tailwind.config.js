/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',   // blue-50
          100: '#dbeafe',   // blue-100
          200: '#bfdbfe',   // blue-200
          300: '#93c5fd',   // blue-300
          400: '#60a5fa',   // blue-400
          500: '#3b82f6',   // blue-500
          600: '#2563eb',   // blue-600  ← warna primer utama
          700: '#1d4ed8',   // blue-700
          800: '#1e40af',   // blue-800
          900: '#1e3a8a',   // blue-900
        },
      },
    },
  },
  plugins: [],
}
