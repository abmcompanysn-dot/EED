/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html", // Scanne tous les fichiers .html à la racine
    "./js/**/*.js" // Scanne tous les fichiers .js dans un dossier js (si vous en avez un)
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#005a9c',
        'primary-red': '#e53935',
        'card-bg': '#1e293b', // --card-bg
        'border-color': '#334155', // --border-color
        'text-secondary': '#94a3b8' // --text-secondary
      },
      fontFamily: {
        'sans': ['Open Sans', 'sans-serif'],
        'orbitron': ['Orbitron', 'sans-serif']
      }
    },
  },
  plugins: [],
}
