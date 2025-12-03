/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html", // Scanne tous les fichiers .html à la racine
    "./js/**/*.js" // Scanne tous les fichiers .js dans un dossier js (si vous en avez un)
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
