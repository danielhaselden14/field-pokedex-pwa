import json
import re
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
DATA = PROJECT / "data"
POKEMON_DIR = DATA / "pokemon"
FIELD_DIR = DATA / "field-entries"
INDEX = DATA / "entries-index.json"
APP = PROJECT / "app.js"
HTML = PROJECT / "index.html"
SW = PROJECT / "service-worker.js"
STAMP = "20260517-163508"

def slug(value):
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "unknown"

def as_text(value):
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(as_text(v) for v in value)
    if isinstance(value, dict):
        return " ".join(as_text(v) for v in value.values())
    return str(value)

def normalize_type(value):
    text = str(value or "").strip().lower()
    text = text.replace("&", "and")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-type$", "", text)
    return text

def make_index_entry(entry, detail_path):
    searchable_parts = [
        entry.get("id"),
        entry.get("entryId"),
        entry.get("pokedexNumber"),
        entry.get("name"),
        entry.get("category"),
        entry.get("type"),
        entry.get("elementType"),
        entry.get("dangerLevel"),
        entry.get("rarity"),
        entry.get("region"),
        entry.get("route"),
        entry.get("habitat"),
        entry.get("classification"),
        entry.get("height"),
        entry.get("weight"),
        entry.get("behaviorTemperament"),
        entry.get("diet"),
        entry.get("activityPattern"),
        entry.get("bestTimeToFind"),
        entry.get("observationDifficulty"),
        entry.get("conservationStatus"),
        entry.get("description"),
        entry.get("lore"),
        entry.get("survivalUse"),
        entry.get("handlingWarning"),
        entry.get("encounterAdvice"),
        entry.get("firstAid"),
        entry.get("companionSuitability"),
        entry.get("fieldNote"),
        entry.get("entryAuthor"),
        entry.get("tags"),
        entry.get("equipment"),
        entry.get("abilities"),
        entry.get("fieldBehaviors"),
        entry.get("weaknesses"),
        entry.get("resistances"),
        entry.get("signsOfPresence"),
        entry.get("temperamentTriggers"),
        entry.get("stressSicknessSigns"),
        entry.get("stats"),
        entry.get("keyFacts"),
        entry.get("scientificClassification"),
        entry.get("fieldCapabilities"),
        entry.get("evolutionTree"),
    ]

    search_text = " ".join(as_text(part) for part in searchable_parts).lower()

    return {
        "id": entry.get("id", ""),
        "entryId": entry.get("entryId", ""),
        "pokedexNumber": entry.get("pokedexNumber", ""),
        "name": entry.get("name", ""),
        "category": entry.get("category", ""),
        "type": entry.get("type", ""),
        "elementType": entry.get("elementType", ""),
        "dangerLevel": entry.get("dangerLevel", ""),
        "rarity": entry.get("rarity", ""),
        "region": entry.get("region", ""),
        "route": entry.get("route", ""),
        "habitat": entry.get("habitat", ""),
        "classification": entry.get("classification", ""),
        "height": entry.get("height", ""),
        "weight": entry.get("weight", ""),
        "behaviorTemperament": entry.get("behaviorTemperament", ""),
        "diet": entry.get("diet", ""),
        "activityPattern": entry.get("activityPattern", ""),
        "bestTimeToFind": entry.get("bestTimeToFind", ""),
        "observationDifficulty": entry.get("observationDifficulty", ""),
        "conservationStatus": entry.get("conservationStatus", ""),
        "description": entry.get("description", ""),
        "lore": entry.get("lore", ""),
        "survivalUse": entry.get("survivalUse", ""),
        "handlingWarning": entry.get("handlingWarning", ""),
        "encounterAdvice": entry.get("encounterAdvice", ""),
        "firstAid": entry.get("firstAid", ""),
        "companionSuitability": entry.get("companionSuitability", ""),
        "fieldNote": entry.get("fieldNote", ""),
        "entryAuthor": entry.get("entryAuthor", ""),
        "visualSymbol": entry.get("visualSymbol", ""),
        "image": entry.get("image", ""),
        "tags": entry.get("tags", []),
        "equipment": entry.get("equipment", []),
        "abilities": entry.get("abilities", []),
        "fieldBehaviors": entry.get("fieldBehaviors", []),
        "weaknesses": entry.get("weaknesses", []),
        "resistances": entry.get("resistances", []),
        "signsOfPresence": entry.get("signsOfPresence", []),
        "stats": entry.get("stats", None),
        "detailPath": detail_path,
        "searchText": search_text
    }

def load_entries_from_folder(folder, folder_url):
    entries = []

    if not folder.exists():
        return entries

    for path in sorted(folder.glob("*.json")):
        entry = json.loads(path.read_text(encoding="utf-8-sig"))

        if not entry.get("id"):
            entry["id"] = slug(path.stem)
        else:
            entry["id"] = slug(entry["id"])

        if entry.get("elementType"):
            entry["elementType"] = normalize_type(entry["elementType"])

        detail_path = f"./data/{folder_url}/{path.name}"
        entry["detailPath"] = detail_path

        path.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")
        entries.append(make_index_entry(entry, detail_path))

    return entries

pokemon_entries = load_entries_from_folder(POKEMON_DIR, "pokemon")
field_entries = load_entries_from_folder(FIELD_DIR, "field-entries")

index_entries = field_entries + pokemon_entries
index_entries.sort(key=lambda e: (e.get("category", ""), e.get("name", "")))

seen = set()
for entry in index_entries:
    entry_id = entry.get("id")
    if entry_id in seen:
        raise SystemExit(f"Duplicate id found while rebuilding index: {entry_id}")
    seen.add(entry_id)

INDEX.write_text(json.dumps(index_entries, ensure_ascii=False, indent=2), encoding="utf-8")

html = HTML.read_text(encoding="utf-8-sig")
html = re.sub(r"styles\.css\?v=[^\"']+", f"styles.css?v={STAMP}", html)
html = re.sub(r"app\.js\?v=[^\"']+", f"app.js?v={STAMP}", html)
HTML.write_text(html, encoding="utf-8")

app = APP.read_text(encoding="utf-8-sig")
app = re.sub(r"entries-index\.json\?v=[^\"']+", f"entries-index.json?v={STAMP}", app)
app = re.sub(r"entries\.json\?v=[^\"']+", f"entries-index.json?v={STAMP}", app)
APP.write_text(app, encoding="utf-8")

cache_files = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.json",
    "./data/entries-index.json",
]

old_entries = DATA / "entries.json"
if old_entries.exists():
    cache_files.append("./data/entries.json")

for folder in [POKEMON_DIR, FIELD_DIR]:
    if folder.exists():
        for path in sorted(folder.glob("*.json")):
            cache_files.append("./" + path.relative_to(PROJECT).as_posix())

icons = PROJECT / "icons"
if icons.exists():
    for path in sorted(icons.glob("*")):
        if path.is_file():
            cache_files.append("./" + path.relative_to(PROJECT).as_posix())

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

print("")
print("Index and cache rebuilt.")
print(f"Pokemon files indexed: {len(pokemon_entries)}")
print(f"Field entry files indexed: {len(field_entries)}")
print(f"Total entries indexed: {len(index_entries)}")
print(f"Cached files listed: {len(cache_files)}")











