/* BikeBuddy service worker — para gumana offline at ma-install sa cellphone.
   Network-first: laging pinakabagong files kapag may internet, cache kapag wala. */
const CACHE = 'bikebuddy-v2';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest',
  'css/style.css',
  'js/i18n.js', 'js/storage.js', 'js/notifications.js', 'js/auth.js', 'js/settings.js',
  'js/client.js', 'js/admin.js', 'js/app.js',
  'images/logo.svg', 'images/hero-riders.png', 'images/icon-192.png', 'images/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
