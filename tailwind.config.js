/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The single source of truth for the KEEP surface ramp.
        ink: '#000000',
        surface: '#111111',
        raised: '#1a1a1a',
        hover: '#1e1e1e',
        edge: '#262626',
        edgeStrong: '#333333',
        muted: '#737373',
        soft: '#a3a3a3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
        panel: '28px',
        pill: '32px',
      },
    },
  },
  plugins: [],
};
