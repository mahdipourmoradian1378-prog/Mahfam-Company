/* Mahfam catalogue – offline support.
   If you ever replace the page images, change the version below (e.g. v3) here AND in index.html (CACHE_NAME)
   so phones fetch the new ones. */
const CACHE = "mahfam-v3";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["./", "index.html", "manifest.webmanifest", "icon-192.png"])).catch(() => {})
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mahfam-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\.pdf$/i.test(url.pathname)) return;                 // the big PDF always uses the network
  if (req.headers.has("range")) return;                     // resumed downloads go straight to the network

  // page images: the page saves them itself; here we only serve a saved copy if there is one
  if (/\/pages(-m|-hq)\//.test(url.pathname)) return;            // phone images: the page downloads and saves them itself
  if (/\/pages\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  // the page itself: newest version when online, saved copy when offline
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});
