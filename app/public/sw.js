// Service Worker do Aegrofin.
// HTML/navegação = NETWORK-FIRST (quando online, sempre pega a versão nova → some o problema
// de "ficou preso na versão antiga"). Demais arquivos (com hash no nome) = cache-first.
const CACHE = "aegro-cache-v3";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  const ehHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (ehHTML) {
    // network-first: garante atualização quando há internet
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
        return res;
      } catch (_) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match("index.html")) || (await cache.match("./")) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // assets (com hash) = cache-first com atualização em segundo plano
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) {
      fetch(req).then((r) => { if (r && r.status === 200 && r.type === "basic") cache.put(req, r.clone()); }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
      return res;
    } catch (_) { return new Response("Offline", { status: 503 }); }
  })());
});
