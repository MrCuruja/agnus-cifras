/* Ágnus Cifras — cache de arquivos públicos do PWA (não armazena dados pessoais). */
const VERSION = 'agnus-shell-v1';
const SHELL = new URL('./index.html', self.registration.scope).href;
const CDN = 'agnus-public-modules-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(async cache => {
    try { const response = await fetch(SHELL, {cache:'reload'}); if(response.ok) await cache.put(SHELL, response); } catch (_) {}
  }));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('agnus-') && k !== VERSION && k !== CDN).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  // Nunca interceptar Firebase Auth/Firestore, endpoints privados ou imagens dos usuários.
  if(request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname)){
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if(response.ok) {
          const cache = await caches.open(VERSION);
          await cache.put(SHELL, response.clone());
        }
        return response;
      } catch (_) {
        return (await caches.match(SHELL)) || Response.error();
      }
    })());
    return;
  }
  // Apenas módulos públicos e versionados do SDK; as requisições de dados seguem na rede.
  if(url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/10.12.2/')){
    event.respondWith((async () => {
      const cache = await caches.open(CDN);
      const saved = await cache.match(request);
      if(saved) return saved;
      const response = await fetch(request);
      if(response.ok || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    })());
  }
});
