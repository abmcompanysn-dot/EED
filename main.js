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

/**
 * ==================================================================
 * Logique pour la page Ressources
 * ==================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    const resourcesGrid = document.getElementById('resources-grid');
    if (!resourcesGrid) return; // Ne s'exécute que si la grille existe sur la page

    // 1. Afficher le squelette de chargement
    let skeletonHTML = '';
    for (let i = 0; i < 6; i++) {
        skeletonHTML += `
            <div class="skeleton-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line title"></div>
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>`;
    }
    resourcesGrid.innerHTML = skeletonHTML;

    // 2. Appeler l'API pour obtenir les ressources
    // NOTE : Pour l'instant, nous utilisons 'getBlogPosts'. Vous devrez créer une action 'getResources'
    // et une feuille "Ressources" dans votre Google Sheet avec les colonnes :
    // Titre, Auteur, Preface, ImageURL, Categorie, FichierURL
    callApi('getResources', {}) // On utilise maintenant la nouvelle fonction
        .then(data => {
            // Les données arrivent maintenant dans data.resources
            const resources = data.resources; 

            if (data.success && resources && resources.length > 0) {
                resourcesGrid.innerHTML = ''; // Vider le squelette
                const categories = new Set();

                resources.forEach(resource => {
                    if (resource.Categorie) categories.add(resource.Categorie);

                    const card = document.createElement('div');
                    card.className = 'resource-card';
                    // Ajout des data-attributes pour le filtrage
                    card.dataset.category = resource.Categorie ? resource.Categorie.toLowerCase() : '';
                    card.dataset.title = resource.Titre ? resource.Titre.toLowerCase() : '';
                    card.dataset.author = resource.Auteur ? resource.Auteur.toLowerCase() : '';

                    card.innerHTML = `
                        <img src="${resource.ImageURL || 'r/default-cover.jpg'}" alt="Couverture pour ${resource.Titre}">
                        <div class="resource-content">
                            <h4>${resource.Titre}</h4>
                            <p>${resource.Preface || 'Aucune préface disponible.'}</p>
                            <div class="resource-footer">
                                <span class="availability">Disponible à l'église</span>
                                <a href="${resource.FichierURL || '#'}" class="btn-download" download>Télécharger</a>
                            </div>
                        </div>
                    `;
                    resourcesGrid.appendChild(card);
                });

                // Remplir le filtre des catégories
                const categoryFilter = document.getElementById('category-filter');
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.toLowerCase();
                    option.textContent = cat;
                    categoryFilter.appendChild(option);
                });

            } else {
                resourcesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Aucune ressource disponible pour le moment.</p>';
            }
        })
        .catch(error => {
            console.error('Erreur de chargement des ressources:', error);
            resourcesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Impossible de charger les ressources.</p>';
        });
});

// Fonction de filtrage (à placer dans main.js également)
function filterResources() {
    // Cette fonction sera appelée par les événements onkeyup et onchange dans ressources.html
    // Vous pouvez y ajouter la logique de filtrage si nécessaire.
}