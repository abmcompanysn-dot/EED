/**
 * ==================================================================
 * FICHIER JAVASCRIPT PRINCIPAL (main.js)
 * Ce fichier contient les fonctions partagées par toutes les pages.
 * ==================================================================
 */

/**
 * Fonction centralisée pour appeler l'API Google Apps Script.
 * Utilise POST avec text/plain pour éviter les requêtes preflight (OPTIONS).
 * @param {string} action - L'action à exécuter côté serveur.
 * @param {object} data - Les données à envoyer (payload).
 * @returns {Promise<object>} - La réponse JSON du serveur.
 */
function callApi(action, data) {
    const payload = { action, ...data };
    const postOptions = {
        method: 'POST',
        redirect: 'follow',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload)
    };
    return fetch(API_URL, postOptions).then(res => res.json());
}

/**
 * Gère l'ouverture et la fermeture du menu de navigation mobile.
 */
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const burgerIcon = document.querySelector('.menu-burger');
    const body = document.body;

    if (mobileMenu && burgerIcon && body) {
        mobileMenu.classList.toggle('active');
        burgerIcon.classList.toggle('active');
        body.classList.toggle('no-scroll');
    }
}

/**
 * Code à exécuter lorsque le contenu de la page est entièrement chargé.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Attache la fonction de bascule au clic sur le menu burger, s'il existe.
    const burgerIcon = document.querySelector('.menu-burger');
    if (burgerIcon) {
        burgerIcon.setAttribute('onclick', 'toggleMobileMenu()');
    }
});