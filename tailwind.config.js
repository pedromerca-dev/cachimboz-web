/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif']
      },
      colors: {
        'cachimboz-dark': '#3e088f',
        'cachimboz-mid': '#6D28D9',
        'cachimboz-light': '#8B5CF6'
      }
    }
  },
  plugins: []
}

