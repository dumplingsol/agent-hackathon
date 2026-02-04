/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'solana-purple': '#9945FF',
        'solana-green': '#14F195',
      },
      backgroundImage: {
        'solana-gradient': 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
      },
    },
  },
  plugins: [],
}
