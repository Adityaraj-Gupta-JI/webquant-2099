/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#08080a',
        bg: '#0b0b0e',
        panel: '#121216',
        panel2: '#17171c',
        line: '#26262e',
        line2: '#33333d',
        ink: '#e7e4df',
        mute: '#8b8884',
        dim: '#5f5d5a',
        signal: '#e0453f',
        compute: '#3ec8d8',
        warn: '#d9a441',
      },
      fontFamily: {
        display: ['"Helvetica Neue"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', '"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
      borderRadius: { none: '0', sm: '2px', DEFAULT: '2px' },
    },
  },
  plugins: [],
};
