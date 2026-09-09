/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0a0c',
          card: '#16161e',
          accent: '#3b82f6',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          border: '#27272a',
        },
        light: {
          bg: '#f8fafc',
          card: '#ffffff',
          accent: '#2563eb',
          border: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}
