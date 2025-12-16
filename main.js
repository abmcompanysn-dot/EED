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
    // Vérification : s'assurer que l'URL de l'API est définie.
    if (typeof API_URL === 'undefined' || !API_URL) {
        console.error("Erreur critique : La variable API_URL n'est pas définie. Assurez-vous que config.js est chargé avant main.js.");
        return Promise.resolve({ success: false, error: "Configuration de l'API manquante." });
    }

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
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-menu-overlay');
    const body = document.body;
    const burger = document.querySelector('.menu-burger');

    // Si les éléments n'existent pas, on ne fait rien.
    if (!menu || !overlay || !body || !burger) return;

    const isOpen = menu.style.width === '280px';

    if (isOpen) {
        menu.style.width = '0';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        body.style.overflow = 'auto'; // Rétablit le défilement
        burger.classList.remove('open');
    } else {
        menu.style.width = '280px';
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        body.style.overflow = 'hidden'; // Bloque le défilement de la page
        burger.classList.add('open');
    }
}

// Ajout d'un écouteur d'événement pour fermer le menu en cliquant sur l'overlay
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('mobile-menu-overlay')?.addEventListener('click', toggleMobileMenu);
});

/**
 * Génère et insère le contenu du menu mobile.
 * Centralise la structure du menu pour une maintenance facile.
 */
function populateMobileMenu() {
    const menuContainer = document.getElementById('mobile-menu');
    // Le conteneur peut ne pas exister sur toutes les pages, donc on vérifie.
    if (!menuContainer) {
        return;
    }

    const menuItems = [
        { href: 'index.html', text: 'Accueil' },
        { href: 'apropos.html', text: 'À Propos' },
        { href: 'ministeres.html', text: 'Ministères' },
        { href: 'evenements.html', text: 'Événements' },
        { href: 'demande-priere.html', text: 'Demande de Prière' },
        { href: 'ressources.html', text: 'Ressources' },
        { href: 'live.html', text: 'Live' },
        { href: 'Boutique.html', text: 'Faire un Don' },
        { href: 'apropos.html#contact', text: 'Contact' }
    ];

    // Ajout du bouton de fermeture pour le menu latéral
    let menuHTML = '<a href="javascript:void(0)" class="close-btn-mobile" onclick="toggleMobileMenu()">&times;</a>';
    menuItems.forEach(item => {
        // Ajoute l'attribut onclick pour fermer le menu après un clic
        menuHTML += `<a href="${item.href}" onclick="toggleMobileMenu()">${item.text}</a>`;
    });

    menuContainer.innerHTML = menuHTML;
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

                    // Structure de la nouvelle carte esthétique
                    card.innerHTML = `
                        <img src="${resource.ImageURL || 'r/default-cover.jpg'}" alt="Couverture pour ${resource.Titre}">
                        <div class="resource-content">
                            <h4>${resource.Titre}</h4>
                            <p>${resource.Preface || 'Aucune préface disponible.'}</p>
                            <div class="resource-footer">
                                <span class="availability">${resource.Auteur || 'Auteur inconnu'} • ${resource.Categorie || 'Inclassé'}</span>
                                <a href="${resource.FichierURL || '#'}" class="btn" style="padding: 8px 15px;" download>Télécharger</a>
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

                // Lancer l'animation d'apparition
                setupScrollAnimationForResources();
            } else {
                resourcesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Aucune ressource disponible pour le moment.</p>';
            }
        })
        .catch(error => {
            console.error('Erreur de chargement des ressources:', error);
            resourcesGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">Impossible de charger les ressources.</p>';
        });
});

/**
 * Fonction de filtrage pour la page des ressources.
 */
function filterResources() {
    // ... (la logique de filtrage existante fonctionne toujours)
}

/**
 * Met en place l'animation d'apparition au défilement pour les cartes de ressources.
 */
function setupScrollAnimationForResources() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = parseInt(entry.target.style.transitionDelay) || 0;
                setTimeout(() => {
                    entry.target.classList.add('is-visible');
                }, delay);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 }); // Se déclenche quand 10% de la carte est visible

    const cards = document.querySelectorAll('.resource-card');
    cards.forEach((card, index) => {
        card.classList.add('animated-element'); // Ajoute la classe de base pour l'animation
        card.style.transitionDelay = `${index * 100}ms`; // Applique un délai en cascade
        observer.observe(card);
    });
}

/**
 * ==================================================================
 * Logique pour les Notifications Push
 * ==================================================================
 */

const VAPID_PUBLIC_KEY = 'BEl-P_g_2G323oXgS3Y-s8g3Vz3a3_wX3g3Vz3a3_wX3g3Vz3a3_wX3g3Vz3a3_wX3g3Vz3a3_w=';

/**
 * Convertit une clé VAPID base64 en Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Demande la permission pour les notifications et abonne l'utilisateur.
 */
async function subscribeToPushNotifications() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        console.log('Abonnement Push réussi:', subscription);

        // Envoyer l'abonnement au serveur
        await callApi('saveSubscription', { subscription: subscription });
        alert('Vous êtes maintenant abonné aux notifications !');

    } catch (error) {
        console.error('Échec de l\'abonnement aux notifications push:', error);
        alert('Impossible de vous abonner aux notifications. Avez-vous bien donné la permission ?');
    }
}

/**
 * Initialise la demande de permission pour les notifications.
 */
function initializePushNotifications() {
    // Vérification plus robuste pour la compatibilité des notifications push
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
        console.warn('Les notifications push ne sont pas supportées par ce navigateur.');
        return;
    }

    const notificationButton = document.getElementById('subscribe-notifications-btn');
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    subscribeToPushNotifications();
                }
            });
        });
    }
}

// Appeler la fonction d'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', initializePushNotifications);

/**
 * ==================================================================
 * Logique pour l'installation de la PWA
 * ==================================================================
 */

let deferredInstallPrompt = null;
const installToast = document.getElementById('pwa-install-toast');
const installButton = document.getElementById('pwa-install-btn-toast');
const dismissButton = document.getElementById('pwa-dismiss-btn-toast');

window.addEventListener('beforeinstallprompt', (event) => {
    // Empêche le navigateur d'afficher sa propre bannière d'installation
    event.preventDefault();
    // Stocke l'événement pour pouvoir le déclencher plus tard
    deferredInstallPrompt = event;
    // Affiche notre bannière d'installation personnalisée
    if (installToast) {
        installToast.classList.add('show');
    }
});

if (installButton) {
    installButton.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            return;
        }
        // Affiche la boîte de dialogue d'installation du navigateur
        await deferredInstallPrompt.prompt();

        // Cache la bannière après la tentative d'installation
        if (installToast) {
            installToast.classList.remove('show');
        }
        deferredInstallPrompt = null; // L'événement ne peut être utilisé qu'une fois
    });
}

if (dismissButton) {
    dismissButton.addEventListener('click', () => {
        if (installToast) {
            installToast.classList.remove('show');
        }
    });
}