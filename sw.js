const CACHE_NAME = 'lumiere-du-futur-cache-v1';
// Liste des fichiers à mettre en cache dès l'installation.
const urlsToCache = [
  '/',
  'index.html',
  'apropos.html',
  'ministeres.html',
  'evenements.html',
  'demande-priere.html',
  'blog.html',
  'ressources.html',
  'live.html',
  'Boutique.html',
  'navbar.css',
  'footer.css',
  'theme.css',
  'main.js',
  'config.js',
  'r/LOGO.svg',
  'r/vid.mp4',
  'r/a.jpg',
  'r/b.jpg',
  'r/c.jpg',
  'r/p.png',
  'r/rs.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&family=Orbitron:wght@500;700&display=swap'
];

// Étape 1: Installation du Service Worker et mise en cache initiale
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        // addAll est atomique : si un fichier échoue, toute l'opération échoue.
        return cache.addAll(urlsToCache);
      })
  );
});

// Étape 2: Stratégie de cache "Cache d'abord, puis réseau"
// C'est ce qui rend l'application ultra-rapide et disponible hors ligne.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si la ressource est dans le cache, on la retourne directement.
        if (response) {
          return response;
        }
        // Sinon, on va la chercher sur le réseau.
        return fetch(event.request).then(
          networkResponse => {
            // On ne met en cache que les requêtes GET valides.
            if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
              return networkResponse;
            }
            // On clone la réponse car elle ne peut être lue qu'une fois.
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        );
      })
  );
});

// Étape 3: Nettoyage des anciens caches
// Cette étape est importante pour les mises à jour.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Si le cache n'est pas dans la liste blanche, on le supprime.
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
