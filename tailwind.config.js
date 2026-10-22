/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // V4 Vibrant Tactile STEM System Palette
        electric: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        coral: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        emerald: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        // Base surfaces
        surface: {
          canvas: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          darkCanvas: '#0B0F19',
          darkCard: '#1E293B',
          darkBorder: '#334155',
        },
        // Backward compatibility tokens
        paper: {
          DEFAULT: '#F8FAFC',
          light: '#FFFFFF',
          dark: '#0B0F19',
          elevated: '#1E293B',
        },
        ink: {
          DEFAULT: '#0F172A',
          light: '#F8FAFC',
        },
        muted: {
          DEFAULT: '#64748B',
          light: '#94A3B8',
        },
        signal: {
          DEFAULT: '#EA580C',
          hover: '#C2410C',
          bg: 'rgba(234, 88, 12, 0.1)',
        },
        verified: {
          DEFAULT: '#10B981',
          bg: 'rgba(16, 185, 129, 0.1)',
        },
        line: {
          DEFAULT: '#E2E8F0',
          dark: '#334155',
        },
      },
    },
  },
  plugins: [],
}
