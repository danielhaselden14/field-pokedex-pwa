import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
XLSX_PATH = PROJECT / "import-tools" / "upload.xlsx"
ENTRIES_PATH = PROJECT / "data" / "entries.json"

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"

def canon(value):
    return re.sub(r"[^a-z0-9]+", "", str(value or "").strip().lower())

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

def normalize_category(value):
    text = str(value or "").strip().lower()
    if not text:
        return "animals"
    if "animal" in text or "creature" in text or "pokemon" in text:
        return "animals"
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    aliases = {
        "plant": "plants",
        "plants": "plants",
        "hazard": "hazards",
        "hazards": "hazards",
        "water": "water",
        "shelter": "shelter",
        "medical": "medical",
        "medicine": "medical",
    }
    return aliases.get(text, text)

def split_list(value):
    if value is None:
        return []
    text = str(value).strip()
    if not text:
        return []
    parts = re.split(r"[;\n|]+", text)
    return [p.strip() for p in parts if p.strip()]

def clean_text(value):
    if value is None:
        return ""
    text = str(value).strip()
    if text.endswith(".0") and re.fullmatch(r"\d+\.0", text):
        text = text[:-2]
    return text

def score(value):
    text = clean_text(value)
    if not text:
        return None
    try:
        number = float(text)
        if number < 0:
            number = 0
        if number > 5:
            number = 5
        if number.is_integer():
            return int(number)
        return number
    except ValueError:
        return None

def truthy(value):
    text = clean_text(value).lower()
    return text in ["true", "yes", "y", "1", "show", "include"]

def read_xlsx_sheets(path):
    with zipfile.ZipFile(path, "r") as z:
        shared_strings = []
        if "xl/sharedStrings.xml" in z.namelist():
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall(f"{{{NS_MAIN}}}si"):
                shared_strings.append("".join(t.text or "" for t in si.iter(f"{{{NS_MAIN}}}t")))

        workbook = ET.fromstring(z.read("xl/workbook.xml"))
        rels_root = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))

        rels = {}
        for rel in rels_root.findall(f"{{{NS_PACKAGE_REL}}}Relationship"):
            rid = rel.attrib.get("Id")
            target = rel.attrib.get("Target")
            if target.startswith("/"):
                full_target = target.lstrip("/")
            elif target.startswith("xl/"):
                full_target = target
            else:
                full_target = "xl/" + target
            rels[rid] = full_target

        sheets = {}
        sheets_node = workbook.find(f"{{{NS_MAIN}}}sheets")
        for sheet in sheets_node.findall(f"{{{NS_MAIN}}}sheet"):
            name = sheet.attrib.get("name")
            rid = sheet.attrib.get(f"{{{NS_REL}}}id")
            target = rels.get(rid)
            if not target or target not in z.namelist():
                continue

            root = ET.fromstring(z.read(target))
            rows = []
            for row in root.iter(f"{{{NS_MAIN}}}row"):
                values_by_col = {}
                max_col = 0
                for cell in row.findall(f"{{{NS_MAIN}}}c"):
                    ref = cell.attrib.get("r", "")
                    letters = re.sub(r"[^A-Z]", "", ref.upper())
                    col_num = 0
                    for ch in letters:
                        col_num = col_num * 26 + (ord(ch) - 64)
                    if col_num == 0:
                        continue
                    max_col = max(max_col, col_num)

                    cell_type = cell.attrib.get("t")
                    value = ""

                    if cell_type == "s":
                        v = cell.find(f"{{{NS_MAIN}}}v")
                        if v is not None and v.text is not None:
                            idx = int(v.text)
                            if 0 <= idx < len(shared_strings):
                                value = shared_strings[idx]
                    elif cell_type == "inlineStr":
                        is_node = cell.find(f"{{{NS_MAIN}}}is")
                        if is_node is not None:
                            value = "".join(t.text or "" for t in is_node.iter(f"{{{NS_MAIN}}}t"))
                    else:
                        v = cell.find(f"{{{NS_MAIN}}}v")
                        if v is not None and v.text is not None:
                            value = v.text

                    values_by_col[col_num] = clean_text(value)

                if max_col:
                    rows.append([values_by_col.get(i, "") for i in range(1, max_col + 1)])

            sheets[name] = rows

        return sheets

def find_sheet(sheets, possible_names):
    wanted = {canon(n) for n in possible_names}
    for name, rows in sheets.items():
        if canon(name) in wanted:
            return rows
    return None

def rows_as_dicts(rows):
    if not rows:
        return []
    headers = [clean_text(h) for h in rows[0]]
    output = []
    for raw_values in rows[1:]:
        if not any(clean_text(v) for v in raw_values):
            continue
        raw = {}
        lookup = {}
        for i, header in enumerate(headers):
            if not header:
                continue
            value = clean_text(raw_values[i] if i < len(raw_values) else "")
            raw[header] = value
            lookup[canon(header)] = value
        output.append({"raw": raw, "lookup": lookup})
    return output

def get(row, *names):
    for name in names:
        value = row["lookup"].get(canon(name), "")
        if clean_text(value):
            return clean_text(value)
    return ""

def make_obj(row, fields):
    obj = {}
    for app_key, column_names in fields:
        value = get(row, *column_names)
        if value:
            obj[app_key] = value
    return obj or None

def make_stats(row):
    stat_fields = [
        ("power", ["stats_power", "appStatsPower"]),
        ("speed", ["stats_speed", "appStatsSpeed"]),
        ("stealth", ["stats_stealth", "appStatsStealth"]),
        ("danger", ["stats_danger", "appStatsDanger"]),
        ("usefulness", ["stats_usefulness", "appStatsUsefulness"]),
        ("food", ["stats_food"]),
        ("medicine", ["stats_medicine"]),
        ("identificationDifficulty", ["stats_identificationDifficulty"]),
        ("reliability", ["stats_reliability"]),
        ("resourceCost", ["stats_resourceCost"]),
        ("speedOfOnset", ["stats_speedOfOnset"]),
        ("detectability", ["stats_detectability"]),
        ("preventability", ["stats_preventability"]),
        ("medicalPriority", ["stats_medicalPriority"]),
        ("warmth", ["stats_warmth"]),
    ]
    stats = {}
    for key, names in stat_fields:
        for name in names:
            val = score(get(row, name))
            if val is not None:
                stats[key] = val
                break
    return stats or None

def build_evolution_maps(sheets):
    main_rows = rows_as_dicts(find_sheet(sheets, ["Evolution Mainline", "Evolution_Mainline"]) or [])
    variant_rows = rows_as_dicts(find_sheet(sheets, ["Evolution Variants", "Evolution_Variants"]) or [])

    main_map = {}
    variant_map = {}

    for row in main_rows:
        family_id = get(row, "familyEntryId", "entryId", "id")
        if not family_id:
            continue
        main_map.setdefault(family_id, []).append(row)

    for row in variant_rows:
        family_id = get(row, "familyEntryId", "entryId", "id")
        if not family_id:
            continue
        variant_map.setdefault(family_id, []).append(row)

    return main_map, variant_map

def build_evolution_tree(entry, row, main_map, variant_map):
    entry_id = entry["id"]
    show_tree = truthy(get(row, "showEvolutionTree")) or bool(get(row, "evolutionFamily")) or entry_id in main_map

    if not show_tree:
        return None

    main_rows = main_map.get(entry_id, [])
    variant_rows = variant_map.get(entry_id, [])

    if main_rows:
        def order_value(r):
            try:
                return int(float(get(r, "stageOrder", "evolutionOrder") or "999"))
            except ValueError:
                return 999

        main_rows = sorted(main_rows, key=order_value)
        first = main_rows[0]

        main_line = []
        for evo_row in main_rows:
            name = get(evo_row, "name")
            if not name:
                continue
            main_line.append({
                "name": name,
                "stage": get(evo_row, "stage") or "Unknown Stage",
                "types": split_list(get(evo_row, "types")),
                "symbol": get(evo_row, "symbol") or entry.get("visualSymbol") or "◆",
                "methodToNext": get(evo_row, "methodToNext"),
                "note": get(evo_row, "note", "evolutionNotes")
            })

        variants = []
        for variant_row in variant_rows:
            target_name = get(variant_row, "targetName")
            if not target_name:
                continue
            variants.append({
                "from": get(variant_row, "from"),
                "method": get(variant_row, "method"),
                "target": {
                    "name": target_name,
                    "stage": get(variant_row, "targetStage") or "Regional Variant",
                    "types": split_list(get(variant_row, "targetTypes")),
                    "symbol": get(variant_row, "targetSymbol") or entry.get("visualSymbol") or "◆",
                    "note": get(variant_row, "targetNote")
                }
            })

        return {
            "familyName": get(first, "familyName") or get(row, "evolutionFamily") or entry["name"] + " Evolution Family",
            "subtitle": get(first, "subtitle") or "Evolution Tree",
            "mainLine": main_line,
            "variants": variants
        }

    form_names = []
    form_sources = [
        ("babyForm", "Baby"),
        ("baseForm", "Base"),
        ("stageOneForm", "Stage One"),
        ("stageTwoForm", "Stage Two"),
        ("megaForm", "Mega"),
        ("gigantamaxForm", "Gigantamax"),
        ("regionalForm", "Regional Variant"),
        ("alternateForm", "Alternate Form"),
    ]

    seen = set()
    for col, stage in form_sources:
        for name in split_list(get(row, col)):
            key = canon(name)
            if key and key not in seen:
                seen.add(key)
                form_names.append((name, stage))

    if not form_names:
        related = split_list(get(row, "relatedForms"))
        for name in related:
            key = canon(name)
            if key and key not in seen:
                seen.add(key)
                form_names.append((name, "Related Form"))

    if not form_names:
        form_names = [(entry["name"], get(row, "evolutionStage") or "Base")]

    main_line = []
    for index, (name, stage) in enumerate(form_names):
        method = ""
        if canon(name) == canon(entry["name"]):
            method = get(row, "evolutionTrigger", "evolutionRequirement", "evolutionItem", "evolutionCondition")
        main_line.append({
            "name": name,
            "stage": stage,
            "types": [entry.get("elementType", "").title()] if entry.get("elementType") else [],
            "symbol": entry.get("visualSymbol") or "◆",
            "methodToNext": method,
            "note": get(row, "evolutionNotes") if canon(name) == canon(entry["name"]) else ""
        })

    variants = []
    branch_name = get(row, "branchEvolution")
    if branch_name:
        variants.append({
            "from": get(row, "name"),
            "method": get(row, "branchCondition"),
            "target": {
                "name": branch_name,
                "stage": "Branch Evolution",
                "types": [entry.get("elementType", "").title()] if entry.get("elementType") else [],
                "symbol": entry.get("visualSymbol") or "◆",
                "note": get(row, "evolutionNotes")
            }
        })

    return {
        "familyName": get(row, "evolutionFamily") or entry["name"] + " Evolution Family",
        "subtitle": "Evolution Tree",
        "mainLine": main_line,
        "variants": variants
    }

def make_entry(row, main_map, variant_map):
    name = get(row, "name")
    if not name:
        return None

    entry_id = get(row, "id") or "pokemon-" + slug(name)

    entry = {
        "id": entry_id,
        "entryId": get(row, "entryId") or entry_id.upper(),
        "pokedexNumber": get(row, "pokedexNumber"),
        "name": name,
        "category": normalize_category(get(row, "category")),
        "type": get(row, "type") or "Pokemon",
        "elementType": normalize_type(get(row, "elementType")),
        "dangerLevel": get(row, "dangerLevel") or "Not listed yet",
        "rarity": get(row, "rarity") or "Not listed yet",
        "region": get(row, "region"),
        "route": get(row, "route", "locationNotes"),
        "habitat": get(row, "habitat"),
        "classification": get(row, "classification"),
        "height": get(row, "height"),
        "weight": get(row, "weight"),
        "behaviorTemperament": get(row, "behaviorTemperament", "temperament"),
        "diet": get(row, "diet"),
        "activityPattern": get(row, "activityPattern"),
        "bestTimeToFind": get(row, "bestTimeToFind"),
        "observationDifficulty": get(row, "observationDifficulty"),
        "conservationStatus": get(row, "conservationStatus"),
        "populationStatus": get(row, "populationStatus"),
        "description": get(row, "description", "summary"),
        "lore": get(row, "lore"),
        "survivalUse": get(row, "survivalUse"),
        "handlingWarning": get(row, "handlingWarning"),
        "encounterAdvice": get(row, "encounterAdvice"),
        "firstAid": get(row, "firstAid"),
        "companionSuitability": get(row, "companionSuitability"),
        "abilities": split_list(get(row, "abilities")),
        "fieldBehaviors": split_list(get(row, "fieldBehaviors")) or split_list(get(row, "moves")),
        "weaknesses": split_list(get(row, "weaknesses")),
        "resistances": split_list(get(row, "resistances")),
        "signsOfPresence": split_list(get(row, "signsOfPresence")),
        "equipment": split_list(get(row, "equipment")) or split_list(get(row, "suggestedEquipment")),
        "stats": make_stats(row),
        "fieldNote": get(row, "fieldNote"),
        "visualSymbol": get(row, "visualSymbol") or "◆",
        "image": get(row, "image") or get(row, "sprite"),
        "audio": get(row, "audio"),
        "entryAuthor": get(row, "entryAuthor", "sourceName"),
        "originStory": get(row, "originStory"),
        "evolutionLine": [],
        "evolutionTree": None,
        "tags": split_list(get(row, "tags")),
        "scientificClassification": make_obj(row, [
            ("kingdom", ["scientificClassification_kingdom", "scientificKingdom"]),
            ("class", ["scientificClassification_class", "scientificClass"]),
            ("order", ["scientificClassification_order", "scientificOrder"]),
            ("family", ["scientificClassification_family", "scientificFamily"]),
            ("genus", ["scientificClassification_genus", "scientificGenus"]),
            ("species", ["scientificClassification_species", "scientificSpecies"]),
        ]),
        "humanConflictRisk": get(row, "humanConflictRisk"),
        "domesticationStatus": get(row, "domesticationStatus"),
        "prey": get(row, "prey"),
        "temperamentTriggers": split_list(get(row, "temperamentTriggers")),
        "territoryRange": get(row, "territoryRange"),
        "lifeCycle": get(row, "lifeCycle"),
        "containmentRequirements": get(row, "containmentRequirements") or get(row, "containmentMethod"),
        "ecologicalRole": get(row, "ecologicalRole"),
        "diseaseParasiteRisk": get(row, "diseaseParasiteRisk"),
        "reproductionNesting": get(row, "reproductionNesting"),
        "predators": get(row, "predators"),
        "emergencyResponse": get(row, "emergencyResponse"),
        "legalStatus": get(row, "legalStatus"),
        "stressSicknessSigns": split_list(get(row, "stressSicknessSigns")),
        "lifespan": get(row, "lifespan"),
        "socialStructure": get(row, "socialStructure"),
        "fieldCapabilities": make_obj(row, [
            ("chargeLevel", ["fieldCapabilities_chargeLevel", "fieldCapabilitiesChargeLevel"]),
            ("electricFieldRange", ["fieldCapabilities_electricFieldRange", "fieldCapabilitiesElectricFieldRange"]),
            ("burstSpeed", ["fieldCapabilities_burstSpeed", "fieldCapabilitiesBurstSpeed"]),
            ("dodgeSpeed", ["fieldCapabilities_dodgeSpeed", "fieldCapabilitiesDodgeSpeed"]),
            ("jumpingHeight", ["fieldCapabilities_jumpingHeight", "fieldCapabilitiesJumpingHeight"]),
            ("balance", ["fieldCapabilities_balance", "fieldCapabilitiesBalance"]),
        ]),
        "trainingRisk": get(row, "trainingRisk"),
        "physiology": get(row, "physiology"),
        "keyFacts": make_obj(row, [
            ("size", ["keyFacts_size", "keyFactsSize"]),
            ("weight", ["keyFacts_weight", "keyFactsWeight"]),
            ("tailLength", ["keyFacts_tailLength", "keyFactsTailLength"]),
            ("lifestyle", ["keyFacts_lifestyle", "keyFactsLifestyle"]),
            ("diet", ["keyFacts_diet", "keyFactsDiet"]),
            ("habitat", ["keyFacts_habitat", "keyFactsHabitat"]),
            ("lifespan", ["keyFacts_lifespan", "keyFactsLifespan"]),
            ("groupSize", ["keyFacts_groupSize", "keyFactsGroupSize", "groupSize"]),
        ]),
        "domesticationDifficulty": get(row, "domesticationDifficulty"),
        "physicalCharacteristics": get(row, "physicalCharacteristics"),
        "dietRestrictions": get(row, "dietRestrictions"),
    }

    if not entry["tags"]:
        tags = ["pokemon"]
        if entry["elementType"]:
            tags.append(entry["elementType"])
        if entry["region"]:
            tags.append(slug(entry["region"]))
        entry["tags"] = tags

    if not entry["description"]:
        entry["description"] = "No description listed yet."

    entry["evolutionTree"] = build_evolution_tree(entry, row, main_map, variant_map)

    if entry["evolutionTree"] and entry["evolutionTree"].get("mainLine"):
        entry["evolutionLine"] = [
            {
                "name": n.get("name", ""),
                "stage": n.get("stage", ""),
                "method": n.get("methodToNext", ""),
                "note": n.get("note", "")
            }
            for n in entry["evolutionTree"]["mainLine"]
        ]

    return entry

sheets = read_xlsx_sheets(XLSX_PATH)
pokemon_rows = rows_as_dicts(find_sheet(sheets, ["Pokemon Entries", "Pokemon_Entries"]) or [])

if not pokemon_rows:
    raise SystemExit("Could not find a sheet named Pokemon Entries with data.")

main_map, variant_map = build_evolution_maps(sheets)

imported = []
seen_ids = set()

for row in pokemon_rows:
    status = get(row, "importStatus", "appImportStatus").lower()
    if status in ["skip", "do not import", "no"]:
        continue

    entry = make_entry(row, main_map, variant_map)
    if not entry:
        continue

    if entry["id"] in seen_ids:
        raise SystemExit(f"Duplicate imported id found in Excel: {entry['id']}")

    seen_ids.add(entry["id"])
    imported.append(entry)

if not imported:
    raise SystemExit("No Pokemon rows were imported. Check that the Pokemon Entries sheet has names and is not marked Skip.")

existing = []
if ENTRIES_PATH.exists():
    existing = json.loads(ENTRIES_PATH.read_text(encoding="utf-8-sig"))

imported_ids = {entry["id"] for entry in imported}

preserved = []
for entry in existing:
    if entry.get("id") in imported_ids:
        continue
    preserved.append(entry)

combined = preserved + imported

ENTRIES_PATH.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")

print("")
print("Excel import complete.")
print(f"Imported or replaced Pokemon entries: {len(imported)}")
print(f"Preserved existing entries: {len(preserved)}")
print(f"Total entries now in entries.json: {len(combined)}")
print("")
print("Imported names:")
for entry in imported:
    print(" - " + entry["name"] + " [" + entry["id"] + "]")
