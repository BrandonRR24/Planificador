/* Service worker del Planificador.
   Regla clave: la página SIEMPRE se pide primero a la red.
   Así una actualización se ve al recargar, sin desinstalar nada.
   El caché solo entra cuando no hay internet. */
const VERSION = "planificador-v3";
const BASE = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  // addAll falla entero si un archivo no existe; por eso va uno por uno.
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("message", e => { if (e.data === "actualizar") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const esPagina = req.mode === "navigate" || req.destination === "document";

  if (esPagina) {
    // Red primero: si hay señal, siempre ves la última versión publicada.
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(VERSION).then(c => c.put("./index.html", copia));
        return res;
      }).catch(() => caches.match("./index.html").then(hit => hit || caches.match("./")))
    );
    return;
  }

  // Todo lo demás (tipografías, íconos): caché primero, se refresca por detrás.
  e.respondWith(
    caches.match(req).then(hit => {
      const red = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return res;
      }).catch(() => hit);
      return hit || red;
    })
  );
});
