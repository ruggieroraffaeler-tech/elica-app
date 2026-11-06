/* Elica — service worker: rende l'app disponibile offline e gestisce gli aggiornamenti.
   VERSION e FILES vengono riscritti da tools/build.py: non modificarli a mano. */
const VERSION = '3.1.0-aa515f5b';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/app.js',
  'js/core.js',
  'js/version.js',
  'content/10-python.js',
  'content/20-palestra.js',
  'content/30-python-bio.js',
  'content/40-r.js',
  'content/50-bash.js',
  'content/60-git.js',
  'content/70-progetto.js',
  'fonts/Geist-Variable.woff2',
  'fonts/GeistMono-Variable.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];
const CACHE = 'elica-' + VERSION;
const RUNTIME = 'elica-runtime';

self.addEventListener('install', e => {
  // cache: 'reload' evita di salvare copie vecchie dalla cache HTTP del browser
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('elica-') && k !== CACHE && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // file dell'app: prima la cache (funziona offline), poi la rete
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).catch(() =>
        req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    );
    return;
  }

  // Python del Lab (Pyodide): scaricato la prima volta, poi disponibile offline
  if (url.href.startsWith('https://cdn.jsdelivr.net/pyodide/')) {
    e.respondWith(
      caches.open(RUNTIME).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })))
    );
  }
  // tutto il resto (es. API di GitHub per la sincronizzazione) va direttamente in rete
});
