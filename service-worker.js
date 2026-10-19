const CACHE_NAME = 'sispa-v2-v1';
const PRECACHE_URLS = [
  '/sispa-v2/index.html',
  '/sispa-v2/assets/css/style.css',
  '/sispa-v2/assets/js/config.js',
  '/sispa-v2/assets/js/supabase.js',
  '/sispa-v2/assets/js/auth.js',
  '/sispa-v2/assets/js/ui.js',
  '/sispa-v2/assets/js/app.js',
  '/sispa-v2/favicon.svg'
];

// 1. Install: Simpan file inti ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// 2. Activate: Hapus cache lama jika ada update
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch: Strategi Cache-First untuk file statis
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Jangan cache request ke Supabase (biarkan online/offline ditangani JS)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((response) => {
        // Simpan file baru ke cache jika berhasil di-fetch
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        // Fallback jika offline dan file tidak ada di cache
        if (event.request.mode === 'navigate') {
          return caches.match('/sispa-v2/index.html');
        }
      });
    })
  );
});
