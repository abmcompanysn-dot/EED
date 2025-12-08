const STATIC_CACHE_NAME = 'lumiere-du-futur-static-v2';
const DYNAMIC_CACHE_NAME = 'lumiere-du-futur-dynamic-v2';

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

// Installation du Service Worker : mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Mise en cache des ressources statiques');
        return cache.addAll(urlsToCache);
      })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // CORRECTION : Si la requête n'est pas GET, on la laisse passer au réseau sans l'intercepter.
  // C'est la seule vérification nécessaire pour les requêtes POST.
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Stratégie "Stale-While-Revalidate" pour les pages HTML et les assets locaux (CSS/JS)
  if (url.origin === self.origin && (request.destination === 'document' || request.destination === 'script' || request.destination === 'style')) {
    event.respondWith(staleWhileRevalidate(request));
  } 
  // Stratégie "Cache First" pour les autres ressources (images, vidéos, polices)
  else {
    event.respondWith(cacheFirst(request));
  }
});

// Stratégie : Cache d'abord, puis réseau (pour les images, polices, etc.)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Gérer l'échec de la requête réseau (ex: hors ligne)
    console.error('Fetch failed; returning offline fallback.', error);
    // Optionnel: retourner une image ou une page de fallback
    return new Response(null, { status: 404 });
  }
}

// Stratégie : Stale-While-Revalidate (pour HTML, CSS, JS)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const fetchedResponsePromise = fetch(request).then(res => {
    cache.put(request, res.clone());
    return res;
  });
  return cachedResponse || fetchedResponsePromise;
}

// Nettoyage des anciens caches lors de l'activation
self.addEventListener('activate', event => {
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.respondWith(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
// --- Logique pour les Notifications Push (inchangée) ---
self.addEventListener('push', event => {
  const data = event.data.json();
  console.log('Notification push reçue:', data);
  const options = {
    body: data.body,
    icon: 'r/icons/icon-192x192.png',
    badge: 'r/icons/icon-192x192.png',
    data: {
      url: data.url || '/'
    }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
