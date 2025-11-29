/**
 * ==================================================================
 * FICHIER JAVASCRIPT PRINCIPAL (main.js)
 * Ce fichier contient les fonctions partagées par la plupart des pages.
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
    return fetch(API_URL, postOptions)
        .then(res => {
            if (!res.ok) {
                // Gère les erreurs HTTP (ex: 500 Internal Server Error)
                throw new Error(`Erreur HTTP: ${res.status} ${res.statusText}`);
            }
            return res.json();
        })
        .catch(error => {
            // Enregistre l'erreur côté client dans la feuille de calcul
            const errorPayload = {
                action: 'logAction',
                payload: { origin: 'Front-End', action: action, status: 'ERROR', message: error.message, suggestion: 'Vérifiez la connexion réseau, l\'URL de l\'API et les erreurs serveur dans la feuille de logs.' }
            };
            // On envoie l'erreur au serveur, mais on ne se soucie pas de la réponse pour éviter une boucle infinie.
            fetch(API_URL, { method: 'POST', body: JSON.stringify(errorPayload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
            // Renvoie une erreur pour que le code appelant puisse la gérer
            return { success: false, error: `Erreur côté client: ${error.message}` };
        });
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