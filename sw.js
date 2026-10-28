/* stalltrack service worker: cache everything on first load, then work offline.
   Bump VERSION whenever any file changes so installed copies update. */
var VERSION = "stalltrack-v1";
var FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./icons/icon.svg",
  "./fonts/quicksand-latin-500-normal.woff2", "./fonts/quicksand-latin-600-normal.woff2", "./fonts/quicksand-latin-700-normal.woff2",
  "./fonts/figtree-latin-400-normal.woff2", "./fonts/figtree-latin-500-normal.woff2", "./fonts/figtree-latin-600-normal.woff2", "./fonts/figtree-latin-700-normal.woff2"
];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // analytics etc. go straight to network
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).catch(function () {
      if (e.request.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    });
  }));
});
