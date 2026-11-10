/* ============================================================================
   Caspian Engineering Toolbox — Service Worker (به‌روزرسانی خودکار)
   استراتژی:
     - HTML → Network-First (هر بار آخرین نسخه گرفته شود → به‌روزرسانی خودکار)
     - سایر فایل‌ها → Cache-First با به‌روزرسانی پس‌زمینه
   ============================================================================ */
const VERSION = 'caspian-toolbox-v1.1.0';
const CACHE = VERSION;

const CORE = [
  './',
  './index.html',
  './theme.css',
  './bridge.js',
  './capacity.html',
  './pressure.html',
  './app.js',
  './prices.js',
  './catalog.js',
  './firebase-config.js',
  './manifest.json',
  './version.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './lib/vazirmatn.css',
  './lib/html2canvas.min.js',
  './lib/qrcode.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // درخواست‌های cross-origin (CDN فونت/کتابخانه) را دست نمی‌زنیم
  if (url.origin !== self.location.origin) return;

  const isHTML = (req.headers.get('accept') || '').includes('text/html') ||
                 /\.html?$/.test(url.pathname) || /\/$/.test(url.pathname);

  if (isHTML) {
    // Network-First → به‌روزرسانی خودکار محتوا
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-First + به‌روزرسانی پس‌زمینه
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached || null);
      return cached || network;
    })
  );
});

self.addEventListener('message', (e) => {
  const d = e.data;
  if (d === 'SKIP_WAITING' || (d && d.type === 'SKIP_WAITING')) self.skipWaiting();
  if (d === 'CLEAR_CACHE' || (d && d.type === 'CLEAR_CACHE')) {
    caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))));
  }
  if (d === 'GET_VERSION' || (d && d.type === 'GET_VERSION')) {
    e.source && e.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});
