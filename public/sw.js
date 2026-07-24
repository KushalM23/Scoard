const CACHE_VERSION = "scoard-v1";
const APP_SHELL = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((cache) =>
      cache.addAll(["/", "/manifest.webmanifest", OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_SHELL, RUNTIME_CACHE, STATIC_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    [".css", ".js", ".woff2", ".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"].some((extension) =>
      url.pathname.endsWith(extension),
    );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isSameOrigin(request)) {
    return;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match("/")) ||
          (await caches.match(OFFLINE_URL)),
        ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const update = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || update;
      }),
    );
  }
});
