const cacheName = "DefaultCompany-BBI-1.1-1b546f3c95fe117a6bf52f615bdf49e0.data.unityweb";
const agentBundleCachePrefix = "bbi-agent-bundles-";
const persistentCachePrefixes = ["UnityCache_", agentBundleCachePrefix];
const contentToCache = [
    "Build/d295a8accc3009137a5adfe6e5e385c2.loader.js",
    "Build/5d7a5f83fcb1d365c784abcb5593b75a.framework.js.unityweb",
    "Build/1b546f3c95fe117a6bf52f615bdf49e0.data.unityweb",
    "Build/2d248498c3974cc100887fa3dc179027.wasm.unityweb",
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

async function matchOwnedCaches(request) {
    const appShellHit = await (await caches.open(cacheName)).match(request);
    if (appShellHit) { return appShellHit; }

    const names = await caches.keys();
    for (const name of names) {
        if (name.indexOf(agentBundleCachePrefix) !== 0) { continue; }
        const agentBundleHit = await (await caches.open(name)).match(request);
        if (agentBundleHit) { return agentBundleHit; }
    }
    return undefined;
}

function isCacheableResponse(request, response) {
    return response.ok && !new URL(request.url).pathname.endsWith('.bundle');
}

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) { return; }

    e.respondWith((async function () {
      let response = await matchOwnedCaches(e.request);
      if (response) { return response; }

      response = await fetch(e.request);
      if (isCacheableResponse(e.request, response)) {
        const cache = await caches.open(cacheName);
        cache.put(e.request, response.clone()).catch(function () {});
      }
      return response;
    })());
});
