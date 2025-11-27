const CACHE_NAME = "utsalapp-cache-v1";

const PRECACHE_URLS = ["/", "/index.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resClone);
        });
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/")),
      ),
  );
});
