import json
import os
import re
import shutil
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
POKEMON_DIR = PROJECT / "data" / "pokemon"
BACKUP = Path(os.environ["FIELD_POKEDEX_BACKUP_FOLDER"])
SELECTED = os.environ["FIELD_POKEDEX_SELECTED_JSONS"].split("|")

POKEMON_DIR.mkdir(parents=True, exist_ok=True)
BACKUP.mkdir(parents=True, exist_ok=True)

def slug(value):
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "unknown"

def normalize_type(value):
    text = str(value or "").strip().lower()
    text = text.replace("&", "and")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-type$", "", text)
    return text

def split_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    if not text:
        return []
    return [part.strip() for part in re.split(r"[;\n|]+", text) if part.strip()]

def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

def prepare_entry(entry, source_path):
    if not isinstance(entry, dict):
        raise SystemExit(f"{source_path.name} must contain one Pokemon object or a list of Pokemon objects.")

    name = str(entry.get("name") or "").strip()
    raw_id = str(entry.get("id") or "").strip()

    if not name and not raw_id:
        raise SystemExit(f"{source_path.name} needs at least a name or id field.")

    if not name:
        name = raw_id.replace("pokemon-", "").replace("-", " ").title()
        entry["name"] = name

    entry_id = slug(raw_id) if raw_id else "pokemon-" + slug(name)

    if not entry_id.startswith("pokemon-"):
        entry_id = "pokemon-" + slug(name)

    entry["id"] = entry_id
    entry["category"] = entry.get("category") or "animals"

    if entry.get("elementType"):
        entry["elementType"] = normalize_type(entry.get("elementType"))

    tags = split_list(entry.get("tags"))
    tag_check = [tag.lower() for tag in tags]

    if "pokemon" not in tag_check and "pokémon" not in tag_check:
        tags.insert(0, "pokemon")

    if entry.get("elementType") and entry.get("elementType") not in [tag.lower() for tag in tags]:
        tags.append(entry.get("elementType"))

    entry["tags"] = tags

    destination = POKEMON_DIR / f"{entry_id}.json"

    if destination.exists():
        shutil.copy2(destination, BACKUP / destination.name)

    entry["detailPath"] = f"./data/pokemon/{destination.name}"

    write_json(destination, entry)
    return destination

written = []

for file_name in SELECTED:
    source = Path(file_name)
    data = read_json(source)

    if isinstance(data, list):
        for item in data:
            written.append(prepare_entry(item, source))
    else:
        written.append(prepare_entry(data, source))

print("")
print("Pokemon JSON files added or updated locally:")
for path in written:
    print(" - " + str(path))
