import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Curls Are Fun design system — approved palette
        primary: {
          DEFAULT: '#D67D5C',
          dark: '#B86A4C',
          light: '#E59A7D',
        },
        secondary: {
          DEFAULT: '#BC8A7B',
          light: '#D2A795',
        },
        tertiary: '#F9E4D4',
        'neutral-dark': '#3C2F2F',
        accent: {
          green: '#4A7C59',
          purple: '#6B4C9A',
          gold: '#C9A962',
        },
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Playfair Display', 'serif'],
        body: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
export default config
