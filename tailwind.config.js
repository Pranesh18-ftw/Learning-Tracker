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
        // Human-Centered Engineering Workbench Palette
        charcoal: {
          950: '#0E0D0C',
          900: '#141312',
          850: '#181716',
          800: '#1C1917',
          700: '#262422',
          600: '#33302C',
        },
        graphite: {
          900: '#1F1D1B',
          800: '#2A2725',
          700: '#383431',
          600: '#48433F',
          500: '#5A544F',
          400: '#736B65',
        },
        mineral: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          500: '#486581',
          600: '#3B5571',
          700: '#2F455C',
          800: '#243447',
          900: '#1B2836',
        },
        sage: {
          50: '#F2F6F3',
          100: '#DEE8E1',
          500: '#5F826D',
          600: '#4D6B58',
          700: '#3A5243',
          800: '#2B3E32',
          900: '#1E2D24',
        },
        copper: {
          50: '#FFF7F2',
          100: '#FDEEE6',
          500: '#D96E3A',
          600: '#C25524',
          700: '#9C4018',
          800: '#732F12',
          900: '#4A1D0B',
        },
        warmwhite: {
          DEFAULT: '#FAF8F5',
          pure: '#FFFFFF',
          sub: '#F5F3EF',
          border: '#E7E4DC',
          darkBorder: '#2E2B27',
        },
        // Base surfaces
        surface: {
          canvas: '#FAF8F5',
          card: '#FFFFFF',
          border: '#E7E4DC',
          darkCanvas: '#141312',
          darkCard: '#1C1A18',
          darkBorder: '#2E2B27',
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
