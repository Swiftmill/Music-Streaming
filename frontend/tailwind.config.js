/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f172a',
        panel: '#111827',
        accent: '#22d3ee',
        accentMuted: '#0ea5e9'
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(14,165,233,0.05))'
      },
      boxShadow: {
        glass: '0 20px 60px -30px rgba(34, 211, 238, 0.45)',
        neon: '0 0 20px rgba(34, 211, 238, 0.45)'
      }
    }
  },
  plugins: []
};
