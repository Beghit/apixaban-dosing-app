// Service Worker for Zapixan Dosing Guide PWA
const CACHE_NAME = 'zapixan-dosing-cache-v3';
const OFFLINE_URL = 'offline.html';
const PRECACHE_URLS = [
  './',
  './index.html',
  './isio.png',
  './manifest.json',
  OFFLINE_URL
];

// Install event - cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy with network fallback
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle requests for HTML pages
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(OFFLINE_URL) || 
                 caches.match('./index.html');
        })
    );
    return;
  }

  // For all other requests
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Clone the request for network fetch
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || 
                response.type !== 'basic') {
              return response;
            }
            
            // Clone response for caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Special handling for CSS/JS files
            if (event.request.url.endsWith('.css')) {
              return new Response('body { background: #0f172a; color: white; }', 
                { headers: { 'Content-Type': 'text/css' }});
            }
            return null;
          });
      })
  );
});

// Background sync example (optional)
self.addEventListener('sync', event => {
  if (event.tag === 'log-interaction') {
    console.log('Background sync triggered');
  }
});
