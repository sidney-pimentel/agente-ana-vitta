// Service worker do Respira.
//
// Offline não é conveniência aqui, é requisito clínico: a fissura não espera 4G.
// O SOS precisa abrir no elevador, no subsolo, no avião, com o celular em modo econômico.

const CACHE = 'respira-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './src/main.js',
  './src/core/store.js',
  './src/core/stats.js',
  './src/core/program.js',
  './src/core/risk.js',
  './src/core/ui.js',
  './src/content/method.js',
  './src/content/values.js',
  './src/content/triggers.js',
  './src/content/fagerstrom.js',
  './src/content/health.js',
  './src/views/onboarding.js',
  './src/views/home.js',
  './src/views/programa.js',
  './src/views/sos.js',
  './src/views/deslize.js',
  './src/views/numeros.js',
  './src/views/tools.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: responde do cache na hora (o app abre em milissegundos,
// com ou sem rede) e atualiza o cache em segundo plano, para que a próxima abertura
// já traga a versão nova. Cache-first puro travaria o usuário numa versão antiga.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cacheado = await cache.match(e.request);
      const rede = fetch(e.request)
        .then((resp) => {
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        })
        .catch(() => null);

      return cacheado || (await rede) || cache.match('./index.html');
    })
  );
});
