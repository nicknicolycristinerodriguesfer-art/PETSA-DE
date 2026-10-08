    /* =========================================================
   PetSaúde — Service Worker
   Estratégia:
   - App shell (HTML/CSS/JS/manifest/ícones): cache-first
   - Navegação: network-first com fallback pro cache
   - Requisições externas: ignora (não faz cache)
   ========================================================= */

const CACHE_NAME = "petsaude-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

/* ---------- INSTALL ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("[SW] Falha no install:", err))
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só lida com GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ignora requisições de outros domínios
  if (url.origin !== self.location.origin) return;

  // Navegação (abrir o app): network-first
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("./index.html"))
        )
    );
    return;
  }

  // Demais arquivos: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type !== "basic") return res;
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});

/* ---------- MENSAGENS (ex: forçar update) ---------- */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});