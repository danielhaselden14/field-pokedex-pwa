import json
import re
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
APP = PROJECT / "app.js"
INDEX_HTML = PROJECT / "index.html"
SW = PROJECT / "service-worker.js"
STAMP = "20260516-233745"

app = APP.read_text(encoding="utf-8-sig")

if "let fullEntryCache = {};" not in app:
    app = app.replace(
        "let allEntries = [];",
        "let allEntries = [];\nlet fullEntryCache = {};"
    )

helper = r'''
async function loadFullEntry(entry) {
  if (!entry) {
    return null;
  }

  if (!entry.detailPath) {
    return entry;
  }

  if (fullEntryCache[entry.id]) {
    return fullEntryCache[entry.id];
  }

  const response = await fetch(entry.detailPath);

  if (!response.ok) {
    throw new Error("Could not load detail file: " + entry.detailPath);
  }

  const fullEntry = await response.json();

  if (!fullEntry.detailPath) {
    fullEntry.detailPath = entry.detailPath;
  }

  fullEntryCache[entry.id] = fullEntry;
  return fullEntry;
}

'''

if "async function loadFullEntry(entry)" not in app:
    marker = "function makeEntryCard(entry) {"
    if marker not in app:
        raise SystemExit("Could not find makeEntryCard function.")
    app = app.replace(marker, helper + marker)

old_click = '''  card.addEventListener("click", () => {
    openEntryDetail(entry);
  });'''

new_click = '''  card.addEventListener("click", async () => {
    try {
      await openEntryDetail(entry);
    } catch (error) {
      console.error("Could not open entry detail:", error);
      alert("Could not open this entry detail file. Check the matching JSON file in the data folder.");
    }
  });'''

if old_click in app:
    app = app.replace(old_click, new_click)

app = app.replace("function openEntryDetail(entry) {", "async function openEntryDetail(entry) {")

open_marker = '''async function openEntryDetail(entry) {
  clearGlobalSearchResults();'''

open_replacement = '''async function openEntryDetail(entry) {
  entry = await loadFullEntry(entry);

  if (!entry) {
    return;
  }

  clearGlobalSearchResults();'''

if open_marker in app and "entry = await loadFullEntry(entry);" not in app:
    app = app.replace(open_marker, open_replacement)

search_old = '''        entry.stats ? Object.keys(entry.stats).join(" ") : ""'''
search_new = '''        entry.stats ? Object.keys(entry.stats).join(" ") : "",
        entry.searchText || ""'''

if search_old in app and "entry.searchText ||" not in app:
    app = app.replace(search_old, search_new)

app = re.sub(r'fetch\("\./data/entries(?:-index)?\.json\?v=[^"]+"\)', f'fetch("./data/entries-index.json?v={STAMP}")', app)
app = re.sub(r'fetch\("\./data/entries(?:-index)?\.json"\)', f'fetch("./data/entries-index.json?v={STAMP}")', app)

APP.write_text(app, encoding="utf-8")

html = INDEX_HTML.read_text(encoding="utf-8-sig")
html = re.sub(r'styles\.css\?v=[^"]+', f'styles.css?v={STAMP}', html)
html = re.sub(r'app\.js\?v=[^"]+', f'app.js?v={STAMP}', html)
INDEX_HTML.write_text(html, encoding="utf-8")

cache_files = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./data/entries.json",
    "./data/entries-index.json",
]

for folder in [PROJECT / "data" / "pokemon", PROJECT / "data" / "field-entries"]:
    if folder.exists():
        for path in sorted(folder.glob("*.json")):
            rel = "./" + path.relative_to(PROJECT).as_posix()
            cache_files.append(rel)

sw = f'''const CACHE_NAME = "field-pokedex-{STAMP}";

const FILES_TO_CACHE = {json.dumps(cache_files, indent=2)};

self.addEventListener("install", (event) => {{
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {{
      return cache.addAll(FILES_TO_CACHE);
    }})
  );

  self.skipWaiting();
}});

self.addEventListener("activate", (event) => {{
  event.waitUntil(
    caches.keys().then((cacheNames) => {{
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }})
  );

  self.clients.claim();
}});

self.addEventListener("fetch", (event) => {{
  if (event.request.method !== "GET") {{
    return;
  }}

  event.respondWith(
    caches.match(event.request, {{ ignoreSearch: true }}).then((cachedResponse) => {{
      return cachedResponse || fetch(event.request);
    }})
  );
}});
'''

SW.write_text(sw, encoding="utf-8")

print("App switched to index/detail-file loading.")
print("Cached file count:", len(cache_files))
