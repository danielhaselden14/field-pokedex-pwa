const CACHE_NAME = "field-pokedex-20260517-190822";

const FILES_TO_CACHE = [
  "./",
  "./app.js",
  "./assets/images/pokemon/beedrill/.gitkeep",
  "./assets/images/pokemon/blastoise/.gitkeep",
  "./assets/images/pokemon/bulbasaur/.gitkeep",
  "./assets/images/pokemon/butterfree/.gitkeep",
  "./assets/images/pokemon/caterpie/.gitkeep",
  "./assets/images/pokemon/charizard/.gitkeep",
  "./assets/images/pokemon/charmander/.gitkeep",
  "./assets/images/pokemon/charmander/charmander-anatomy.png",
  "./assets/images/pokemon/charmander/charmander-display.png",
  "./assets/images/pokemon/charmeleon/.gitkeep",
  "./assets/images/pokemon/ivysaur/.gitkeep",
  "./assets/images/pokemon/kakuna/.gitkeep",
  "./assets/images/pokemon/metapod/.gitkeep",
  "./assets/images/pokemon/squirtle/.gitkeep",
  "./assets/images/pokemon/venusaur/.gitkeep",
  "./assets/images/pokemon/wartortle/.gitkeep",
  "./assets/images/pokemon/weedle/.gitkeep",
  "./data/entries.json",
  "./data/entries-index.json",
  "./data/field-entries/hazard-hypothermia.json",
  "./data/field-entries/plant-cattail.json",
  "./data/field-entries/shelter-windbreak.json",
  "./data/field-entries/water-boiling.json",
  "./data/pokemon/pokemon-bulbasaur.json",
  "./data/pokemon/pokemon-charizard.json",
  "./data/pokemon/pokemon-charmander.json",
  "./data/pokemon/pokemon-charmeleon.json",
  "./data/pokemon/Pokemon-Gastly.json",
  "./data/pokemon/pokemon-ivysaur.json",
  "./data/pokemon/pokemon-pikachu.json",
  "./data/pokemon/pokemon-squirtle.json",
  "./data/pokemon/pokemon-venusaur.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./manifest.json",
  "./styles.css",
  "./voice-search.js"
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
