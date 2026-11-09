const cacheName = "DefaultCompany-BBI-1.1-660b1df0e01bf55b3d12aefc308a60db.data";
const persistentCachePrefixes = ["UnityCache_", "bbi-agent-bundles-"];
const contentToCache = [
    "Build/d0946a25cfad885b321dea79d2eb8592.loader.js",
    "Build/20e92424f7af05aaead674a5f0e09e9f.framework.js",
    "Build/660b1df0e01bf55b3d12aefc308a60db.data",
    "Build/48231bf49dcbe384c5ba4259691f1330.wasm",
    "TemplateData/style.css"

];

self.addEventListener('install', function (e) {
    console.log('[Service Worker] Install');
    self.skipWaiting();
    
    e.waitUntil((async function () {
      const cache = await caches.open(cacheName);
      console.log('[Service Worker] Caching all: app shell and content');
      await cache.addAll(contentToCache);
    })());
});

self.addEventListener('activate', function (e) {
    e.waitUntil((async function () {
      const names = await caches.keys();
      await Promise.all(names.filter(isStaleCache).map(function (name) { return caches.delete(name); }));
      await self.clients.claim();
    })());
});

function isStaleCache(name) {
    if (name === cacheName) { return false; }
    return !persistentCachePrefixes.some(function (prefix) { return name.indexOf(prefix) === 0; });
}

function isCacheableResponse(request, response) {
    return response.ok && !new URL(request.url).pathname.endsWith('.bundle');
}

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) { return; }

    e.respondWith((async function () {
      let response = await caches.match(e.request);
      if (response) { return response; }

      response = await fetch(e.request);
      if (isCacheableResponse(e.request, response)) {
        const cache = await caches.open(cacheName);
        cache.put(e.request, response.clone()).catch(function () {});
      }
      return response;
    })());
});
