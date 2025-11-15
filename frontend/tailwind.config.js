module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '2560px',
      },
      height: {
        '32rem': '32rem',
      },
      minHeight: {
        '800px': '800px',
      },
      spacing: {
        '128': '32rem',
      }
    },
  },
  plugins: [],
}