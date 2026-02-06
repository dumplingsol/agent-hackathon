/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        heading: ['var(--font-archivo)', 'sans-serif'],
        logo: ['var(--font-kanit)', 'sans-serif'],
      },
      colors: {
        'solana-purple': '#9945FF',
        'solana-green': '#14F195',
      },
      backgroundImage: {
        'solana-gradient': 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
