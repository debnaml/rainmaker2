// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        primary: '#331D4C',
        birkettsPurple: '#331D4C',
        action: '#237781',
        mint: '#CBEEF3',
        white: '#ffffff',
        purplebg: '#F5F4F6',
        lines: '#D9D9D9',
        textdark: '#303030',
        accent: '#CBDD52',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;