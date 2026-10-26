/** @type {import('tailwindcss').Config} */
// Tokens mirror DESIGN.md. Change them there first.
module.exports = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'ui-rounded', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'ui-rounded', 'system-ui', 'sans-serif'],
        // Photo captions only, written like a pen on an instant print.
        hand: ['var(--font-hand)', 'cursive'],
      },
      colors: {
        'carlo-blue': '#004AAD',
        sky: '#0CC0DF',
        sun: '#FFC93C',
        ink: '#14274A',
        'ink-soft': '#46607F',
        cloud: '#EEF7FF',
        danger: '#B42318',
      },
      boxShadow: {
        // Hard offset, no blur: the "sticker" motif from DESIGN.md.
        sticker: '4px 4px 0 0 #14274A',
        'sticker-sm': '3px 3px 0 0 #14274A',
      },
    },
  },
  plugins: [],
};
