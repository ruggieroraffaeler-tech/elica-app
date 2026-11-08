/* =====================================================================
   LC Performance - Service Worker
   Salva sul telefono i file dell'app (HTML, JS, CSS, font, logo) così
   l'app si apre anche con rete scarsa o assente.
   I DATI (scheda, carichi...) NON passano da qui: li gestisce l'app
   (src/lib/offline.js) con cache e coda di invio.
   Se modifichi questo file, aumenta il numero di versione qui sotto.
   ===================================================================== */
const VERSION = 'v2';
const SHELL_CACHE = `lc-shell-${VERSION}`;
const RUNTIME_CACHE = `lc-runtime-${VERSION}`;
const KEEP_CACHES = [SHELL_CACHE, RUNTIME_CACHE, 'lc-pdfs-v1'];
const SHELL_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/favicon-light.svg', '/favicon-dark.svg', '/favicon.ico', '/apple-touch-icon.png', '/icon-192.png', '/logo-light.png', '/logo-dark.png'];
const NAVIGATION_TIMEOUT_MS = 3500;
const MAX_RUNTIME_ENTRIES = 80;

const EXTERNAL_ASSET_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'customer-assets.emergentagent.com', // logo LC
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('lc-') && !KEEP_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((k) => cache.delete(k)));
  }
};

// event.waitUntil può fallire se la risposta è già stata consegnata: in quel caso
// lasciamo semplicemente finire il salvataggio in cache.
const safeWaitUntil = (event, promise) => {
  try {
    event.waitUntil(promise);
  } catch (e) {
    /* ignore */
  }
};

const putInCache = async (cacheName, request, response) => {
  if (!response || (response.status !== 200 && response.type !== 'opaque')) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  if (cacheName === RUNTIME_CACHE) trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
};

// Pagine: prima la rete (versione aggiornata), ma se la rete è lenta/assente
// dopo pochi secondi si usa la copia salvata.
const handleNavigation = (event) => {
  const networkPromise = fetch(event.request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        safeWaitUntil(event, putInCache(SHELL_CACHE, '/index.html', copy));
      }
      return response;
    });

  return new Promise((resolve) => {
    let settled = false;
    const useCache = async () => {
      if (settled) return;
      const cached = (await caches.match('/index.html')) || (await caches.match('/'));
      if (cached && !settled) {
        settled = true;
        resolve(cached);
      }
    };
    const timer = setTimeout(useCache, NAVIGATION_TIMEOUT_MS);
    networkPromise
      .then((response) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(response);
        }
      })
      .catch(async () => {
        clearTimeout(timer);
        await useCache();
        if (!settled) {
          settled = true;
          resolve(new Response('<h1>Sei offline</h1><p>Apri l\'app almeno una volta con la rete per salvarla sul telefono.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }));
        }
      });
  });
};

// File con hash nel nome (/static/js/main.abc123.js): non cambiano mai -> prima la cache
const cacheFirst = async (event) => {
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  safeWaitUntil(event, putInCache(RUNTIME_CACHE, event.request, response.clone()));
  return response;
};

// Font e logo: si usa subito la copia salvata e intanto si aggiorna in background
const staleWhileRevalidate = async (event) => {
  const cached = await caches.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      safeWaitUntil(event, putInCache(RUNTIME_CACHE, event.request, response.clone()));
      return response;
    })
    .catch(() => cached);
  return cached || network;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Le chiamate API le gestisce l'app (cache + coda offline): qui non le tocchiamo
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/')) return;

  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/static/')) {
    event.respondWith(cacheFirst(event));
    return;
  }

  if (EXTERNAL_ASSET_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  if (url.origin === self.location.origin && /\.(png|jpg|jpeg|svg|ico|webp|json)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
