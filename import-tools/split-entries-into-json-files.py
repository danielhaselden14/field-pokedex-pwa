import json
import re
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
DATA = PROJECT / "data"
SOURCE = DATA / "entries.json"
POKEMON_DIR = DATA / "pokemon"
FIELD_DIR = DATA / "field-entries"
INDEX = DATA / "entries-index.json"

POKEMON_DIR.mkdir(parents=True, exist_ok=True)
FIELD_DIR.mkdir(parents=True, exist_ok=True)

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

def is_pokemon(entry):
    tags = [str(t).lower() for t in entry.get("tags", []) if t]
    entry_id = str(entry.get("id", "")).lower()
    entry_type = str(entry.get("type", "")).lower()
    pokedex_number = str(entry.get("pokedexNumber", "")).lower()
    return (
        entry_id.startswith("pokemon-")
        or "pokemon" in tags
        or "pokémon" in tags
        or "pokemon" in entry_type
        or "pokémon" in entry_type
        or pokedex_number.startswith("#")
    )

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
        entry.get("stats"),
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

entries = json.loads(SOURCE.read_text(encoding="utf-8-sig"))

seen = set()
index_entries = []
pokemon_count = 0
field_count = 0

for entry in entries:
    entry_id = entry.get("id") or "entry-" + slug(entry.get("name", "unknown"))
    clean_id = slug(entry_id)

    if clean_id in seen:
        raise SystemExit(f"Duplicate ID after cleanup: {clean_id}")

    seen.add(clean_id)
    entry["id"] = clean_id

    if is_pokemon(entry):
        folder = POKEMON_DIR
        relative_path = f"./data/pokemon/{clean_id}.json"
        pokemon_count += 1
    else:
        folder = FIELD_DIR
        relative_path = f"./data/field-entries/{clean_id}.json"
        field_count += 1

    entry["detailPath"] = relative_path

    out_path = folder / f"{clean_id}.json"
    out_path.write_text(json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8")

    index_entries.append(make_index_entry(entry, relative_path))

INDEX.write_text(json.dumps(index_entries, ensure_ascii=False, indent=2), encoding="utf-8")

print("")
print("Split JSON structure created.")
print(f"Pokemon JSON files: {pokemon_count}")
print(f"Field entry JSON files: {field_count}")
print(f"Index entries: {len(index_entries)}")
print("")
print(f"Index file: {INDEX}")
print(f"Pokemon folder: {POKEMON_DIR}")
print(f"Field entries folder: {FIELD_DIR}")
