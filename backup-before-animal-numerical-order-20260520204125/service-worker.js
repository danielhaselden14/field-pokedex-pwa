const CACHE_NAME = "field-pokedex-20260520181942";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./css/dossier-system.css",
  "./app.js",
  "./js/dossier-system.js",
  "./manifest.json",
  "./data/entries-index.json",
  "./data/entries.json",
  "./data/pokemon/pokemon-blastoise.json",
  "./data/pokemon/pokemon-bulbasaur.json",
  "./data/pokemon/pokemon-charizard.json",
  "./data/pokemon/pokemon-charmander.json",
  "./data/pokemon/pokemon-charmeleon.json",
  "./data/pokemon/pokemon-gastly.json",
  "./data/pokemon/pokemon-ivysaur.json",
  "./data/pokemon/pokemon-pikachu.json",
  "./data/pokemon/pokemon-squirtle.json",
  "./data/pokemon/pokemon-venusaur.json",
  "./data/pokemon/pokemon-wartortle.json",
  "./data/field-entries/hazard-hypothermia.json",
  "./data/field-entries/plant-cattail.json",
  "./data/field-entries/shelter-windbreak.json",
  "./data/field-entries/water-boiling.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});








