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
        'orbitron': ['Open Sans', 'sans-serif'] // Remplacé par Open Sans
      },
      // 1. Définir les keyframes de notre animation personnalisée
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        }
      },
      // 2. Créer la classe utilitaire pour utiliser cette animation
      animation: {
        shake: 'shake 0.5s ease-in-out',
      }
    },
  },
  plugins: [],
}
