const cacheName = "DefaultCompany-BBI-1.1-9f893815e63add1804118bbcc2106e56.data.unityweb";
const agentBundleCachePrefix = "bbi-agent-bundles-";
const persistentCachePrefixes = ["UnityCache_", agentBundleCachePrefix];
const contentToCache = [
    "Build/851e01ac8ad0b601990826ab82ce261c.loader.js",
    "Build/3a0d567463b117b8a02fff00ff72bb2b.framework.js.unityweb",
    "Build/9f893815e63add1804118bbcc2106e56.data.unityweb",
    "Build/9e4ed50c0306b355697b584491905bea.wasm.unityweb",
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

const contentHashPattern = /[0-9a-f]{32}/;
const agentApiPattern = /\/api\/(teacher|quiz|interview|career)\/(lectures|healthz|teacher|quiz|interview|advisor|upload|profile|stt)(\/|$)/;

function isAgentApiUrl(url) {
    return agentApiPattern.test(new URL(url).pathname);
}
const versionFileName = "version.json";

function isImmutableUrl(url) {
    return contentHashPattern.test(new URL(url).pathname);
}

function isCacheableResponse(request, response) {
    const pathname = new URL(request.url).pathname;
    return response.ok && !pathname.endsWith('.bundle') && !pathname.endsWith(versionFileName);
}

function storeIfCacheable(request, response) {
    if (!isCacheableResponse(request, response)) { return; }
    const copy = response.clone();
    caches.open(cacheName).then(function (cache) { return cache.put(request, copy); }).catch(function () {});
}

function revalidatingRequest(request) {
    if (request.mode === 'navigate') {
        return new Request(request.url, { cache: 'no-cache', credentials: 'same-origin' });
    }
    return new Request(request, { cache: 'no-cache' });
}

async function cacheFirst(request) {
    const cached = await matchOwnedCaches(request);
    if (cached) { return cached; }

    const response = await fetch(request);
    storeIfCacheable(request, response);
    return response;
}

async function networkFirst(request) {
    try {
        const response = await fetch(revalidatingRequest(request));
        storeIfCacheable(request, response);
        return response;
    } catch (error) {
        const cached = await matchOwnedCaches(request);
        if (cached) { return cached; }
        throw error;
    }
}

self.addEventListener('fetch', function (e) {
    if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) { return; }
    if (isAgentApiUrl(e.request.url)) { return; }

    e.respondWith(isImmutableUrl(e.request.url) ? cacheFirst(e.request) : networkFirst(e.request));
});
