/* stalltrack service worker: cache everything on first load, then work offline.
   Bump VERSION whenever any file changes so installed copies update. */
var VERSION = "stalltrack-v2";
var FILES = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png", "./icons/apple-touch-icon.png", "./icons/icon.svg",
  "./fonts/quicksand-latin-500-normal.woff2", "./fonts/quicksand-latin-600-normal.woff2", "./fonts/quicksand-latin-700-normal.woff2",
  "./fonts/figtree-latin-400-normal.woff2", "./fonts/figtree-latin-500-normal.woff2", "./fonts/figtree-latin-600-normal.woff2", "./fonts/figtree-latin-700-normal.woff2"
];

/* Safari refuses to serve a redirected response to a navigation.
   Cloudflare Pages redirects /index.html to /, so rebuild any redirected
   response as a plain one before it is cached or returned. */
function clean(res) {
  if (!res || !res.redirected) return Promise.resolve(res);
  return res.blob().then(function (body) {
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
  });
}

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(f, { cache: "reload" }).then(function (res) {
        if (!res.ok) throw new Error("precache failed: " + f);
        return clean(res).then(function (r) { return c.put(f, r); });
      });
    }));
  }).then(function () { return self.skipWaiting(); }));
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
    return fetch(e.request).then(clean).catch(function () {
      if (e.request.mode === "navigate") return caches.match("./index.html");
      return Response.error();
    });
  }));
});
