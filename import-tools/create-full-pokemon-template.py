import zipfile
from html import escape

output_path = r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa\import-tools\field-pokedex-full-pokemon-import-template.xlsx"

pokemon_headers = [
"id","entryId","pokedexNumber","name","category","type","elementType","dangerLevel","rarity",
"region","route","habitat","classification","height","weight",
"description","physicalCharacteristics","physiology","behaviorTemperament","diet","dietRestrictions",
"activityPattern","bestTimeToFind","observationDifficulty","conservationStatus","populationStatus",
"lifespan","lifeCycle","reproductionNesting","predators","prey","ecologicalRole","socialStructure","territoryRange",
"humanConflictRisk","domesticationStatus","domesticationDifficulty","trainingRisk","legalStatus","companionSuitability",
"survivalUse","handlingWarning","encounterAdvice","containmentRequirements","emergencyResponse","diseaseParasiteRisk","firstAid",
"lore","originStory","fieldNote","visualSymbol","image","audio","entryAuthor",
"tags","abilities","fieldBehaviors","weaknesses","resistances","signsOfPresence","equipment","temperamentTriggers","stressSicknessSigns",
"stats_power","stats_speed","stats_stealth","stats_danger","stats_usefulness","stats_food","stats_medicine","stats_identificationDifficulty","stats_reliability","stats_resourceCost","stats_speedOfOnset","stats_detectability","stats_preventability","stats_medicalPriority","stats_warmth",
"keyFacts_size","keyFacts_weight","keyFacts_tailLength","keyFacts_lifestyle","keyFacts_diet","keyFacts_habitat","keyFacts_lifespan","keyFacts_groupSize",
"scientificClassification_kingdom","scientificClassification_class","scientificClassification_order","scientificClassification_family","scientificClassification_genus","scientificClassification_species",
"fieldCapabilities_chargeLevel","fieldCapabilities_electricFieldRange","fieldCapabilities_burstSpeed","fieldCapabilities_dodgeSpeed","fieldCapabilities_jumpingHeight","fieldCapabilities_balance",
"evolutionFamily","evolutionGroup","evolutionStage","evolutionOrder","evolvesFrom","evolvesTo","evolutionTrigger","evolutionRequirement","evolutionItem","evolutionLevel","evolutionCondition","evolutionLocation","evolutionTimeOfDay","evolutionWeather","evolutionMoveKnown","evolutionTradeRequirement","evolutionNotes","babyForm","baseForm","stageOneForm","stageTwoForm","megaForm","gigantamaxForm","regionalForm","alternateForm","branchEvolution","branchCondition","relatedForms","showEvolutionTree",
"sourceName","sourceUrl","sourceNotes","importStatus","importNotes"
]

pikachu_sample = [
"pokemon-pikachu","PKMN-0025","#0025","Pikachu","animals","Electric Creature","electric","Medium","Uncommon",
"Kanto","Forest edges, grassy routes, storm-prone woodland","Woodlands, open grass, abandoned power areas, and regions with frequent electrical activity.","Mouse Pokemon / Electric Rodent","1 ft 4 in","13.2 lbs",
"A small electric creature known for storing electrical charge in its cheek sacs.","Small yellow rodent-like Pokemon with red cheek sacs and a lightning-shaped tail.","Stores electrical energy in specialized cheek sacs.","Alert, social, curious, and skittish when surprised.","Berries, fruit, seeds, and small field foods.","Avoid salty processed foods and exposed wiring.",
"Mostly diurnal, but activity increases before storms.","Early morning, late afternoon, or storm weather.","Moderate","Stable in known regions","Stable",
"Wild: 6 to 8 years. Managed care: 10 to 15 years.","Born as Pichu, matures into Pikachu, may evolve into Raichu with Thunder Stone.","Nests in dry burrows, hollow logs, cave pockets, or root systems.","Large ground predators and aerial hunters","Small insects, berries, seeds, fruit, and field scraps","Controls small insects and spreads seeds","Tight-knit colonies with shared warning signals","Small forest-edge range or colony area",
"Moderate","Semi-domesticated","High for wild adults, moderate if raised young","Electrical burns and startled discharge","Ownership may require electric-type handling certification","Potential companion with careful trust-building",
"Can warn of storms and electrical disturbance.","Do not grab barehanded. Avoid cheeks and tail.","Keep distance, stay calm, avoid sudden movement.","Grounded enclosure, rubberized flooring, insulated tools.","Avoid metal and standing water during discharge.","Low to moderate","Treat shock as serious and seek medical help.",
"Pikachu are alert, social, and highly reactive when frightened.","Early ranger accounts place the first confirmed Pikachu encounter near storm-charged caves.","If injured, keep calm, dry, and away from metal tools.","⚡","","","Ranger Field Log",
"pokemon; electric; creature; storm-active; shock-risk; kanto","Static; Lightning Rod","Discharges electricity when startled; Raises ears when detecting movement","Ground-type threats; Mud; Exhaustion","Electric shock; Some flying threats","Static buildup; Scorch marks; High-pitched calls","Insulated gloves; Nonconductive blanket; Dry boots","Loud thunder; Sudden grabbing; Touching cheeks or tail","Cheek sacs flickering unevenly; Tail held low; Refusing food",
"4","5","3","3","4","","","","","","","","","","",
"Height: 1 ft 4 in","13.2 lbs","Approx. 0.3 m","Storm-active, highly social","Omnivorous forager","Forest edges and storm-prone woodland","Wild: 6 to 8 years. Managed care: 10 to 15 years","Small groups to colonies of up to 30",
"Animalia","Mammalia-like Electric Fauna","Rodentia Fulminis","Muridae Electrica","Pika","Pika fulmen",
"Capable of strong defensive discharge","Short range, strongest close up","Fast short-distance movement","High","Moderate","Tail assists balance and signaling",
"Pikachu Evolution Family","Pikachu Line","Base","2","Pichu","Raichu","Thunder Stone","Expose Pikachu to a Thunder Stone","Thunder Stone","","","","","","","","Primary field form. Strong companion potential with trained handlers.","Pichu","Pikachu","","Raichu","","","Alolan Raichu","","Alolan Raichu","Thunder Stone in Alola","Pichu; Pikachu; Raichu; Alolan Raichu","TRUE",
"Ranger Field Log","","Sample row. Replace with your real source notes.","Ready","Sample row only"
]

evolution_mainline_headers = ["familyEntryId","familyName","subtitle","stageOrder","name","stage","types","symbol","methodToNext","note"]
evolution_mainline_rows = [
evolution_mainline_headers,
["pokemon-pikachu","Pikachu Evolution Family","Evolution Tree - Electric Type","1","Pichu","Baby","Electric","⚡","High Friendship","Small and unstable. Electrical output is harder to control."],
["pokemon-pikachu","Pikachu Evolution Family","Evolution Tree - Electric Type","2","Pikachu","Base","Electric","⚡","Thunder Stone","Primary field form. Strong companion potential with trained handlers."],
["pokemon-pikachu","Pikachu Evolution Family","Evolution Tree - Electric Type","3","Raichu","Final","Electric","⚡","","Standard final evolution with stronger electrical output."]
]

evolution_variant_headers = ["familyEntryId","from","method","targetName","targetStage","targetTypes","targetSymbol","targetNote"]
evolution_variant_rows = [
evolution_variant_headers,
["pokemon-pikachu","Pikachu","Thunder Stone in Alola","Alolan Raichu","Regional Variant","Electric; Psychic","⚡","Regional branch connected to Alolan conditions."]
]

readme_rows = [
["Field Pokedex Pokemon Import Template"],
["Use the Pokemon Entries sheet as the main sheet."],
["One row equals one Pokemon or field guide entry."],
["Do not change the column names."],
["Use semicolons for list fields."],
["Example list: pokemon; electric; kanto"],
["category should usually be animals for Pokemon."],
["elementType controls future page themes."],
["Use electric for all electric Pokemon."],
["Evolution can be filled in on the Pokemon Entries sheet, and later the importer can also use Evolution Mainline and Evolution Variants for cleaner trees."],
["This workbook is only a template. It does not change the app yet."]
]

allowed_rows = [
["Field","Allowed or suggested values"],
["category","animals; plants; hazards; water; shelter; medical"],
["elementType","normal; fire; water; electric; grass; ice; fighting; poison; ground; flying; psychic; bug; rock; ghost; dragon; dark; steel; fairy"],
["dangerLevel","Low; Medium; High; Extreme"],
["rarity","Common; Uncommon; Rare; Very Rare; Legendary; Mythic"],
["stats","Use 0 to 5"],
["list separator","Use semicolon between items"],
["showEvolutionTree","TRUE or FALSE"]
]

mapping_rows = [
["Excel Column Pattern","App JSON Field","Notes"],
["id","id","Must be unique"],
["entryId","entryId","Field guide ID"],
["pokedexNumber","pokedexNumber","Example: #0025"],
["name","name","Display name"],
["category","category","Pokemon should usually be animals"],
["elementType","elementType","Controls type themes"],
["tags","tags","Split by semicolon"],
["abilities","abilities","Split by semicolon"],
["fieldBehaviors","fieldBehaviors","Split by semicolon"],
["weaknesses","weaknesses","Split by semicolon"],
["resistances","resistances","Split by semicolon"],
["signsOfPresence","signsOfPresence","Split by semicolon"],
["equipment","equipment","Split by semicolon"],
["temperamentTriggers","temperamentTriggers","Split by semicolon"],
["stressSicknessSigns","stressSicknessSigns","Split by semicolon"],
["stats_*","stats.*","Converted into the stats object"],
["keyFacts_*","keyFacts.*","Converted into the keyFacts object"],
["scientificClassification_*","scientificClassification.*","Converted into scientificClassification"],
["fieldCapabilities_*","fieldCapabilities.*","Converted into fieldCapabilities"],
["evolution fields","evolutionTree","Used later to build the evolution tree"]
]

guide_rows = [["Category","Column","Purpose"]]
for col in pokemon_headers:
    if col in ["id","entryId","pokedexNumber","name","category","type","elementType","dangerLevel","rarity"]:
        cat = "Core Identity"
    elif col in ["region","route","habitat","classification","height","weight"]:
        cat = "Location and Basic Field Info"
    elif col in ["description","physicalCharacteristics","physiology"]:
        cat = "Overview and Physical Detail"
    elif col in ["behaviorTemperament","diet","dietRestrictions","activityPattern","bestTimeToFind","observationDifficulty","conservationStatus","populationStatus","lifespan","lifeCycle","reproductionNesting","predators","prey","ecologicalRole","socialStructure","territoryRange"]:
        cat = "Biology and Ecology"
    elif col in ["humanConflictRisk","domesticationStatus","domesticationDifficulty","trainingRisk","legalStatus","companionSuitability"]:
        cat = "Human Use, Legal, and Domestication"
    elif col in ["survivalUse","handlingWarning","encounterAdvice","containmentRequirements","emergencyResponse","diseaseParasiteRisk","firstAid"]:
        cat = "Safety and Survival"
    elif col in ["lore","originStory","fieldNote","visualSymbol","image","audio","entryAuthor"]:
        cat = "Lore, Notes, and Media"
    elif col in ["tags","abilities","fieldBehaviors","weaknesses","resistances","signsOfPresence","equipment","temperamentTriggers","stressSicknessSigns"]:
        cat = "Lists"
    elif col.startswith("stats_"):
        cat = "Stats"
    elif col.startswith("keyFacts_"):
        cat = "Key Facts"
    elif col.startswith("scientificClassification_"):
        cat = "Scientific Classification"
    elif col.startswith("fieldCapabilities_"):
        cat = "Field Capabilities"
    elif col.startswith("evolution") or col in ["babyForm","baseForm","stageOneForm","stageTwoForm","megaForm","gigantamaxForm","regionalForm","alternateForm","branchEvolution","branchCondition","relatedForms","showEvolutionTree","evolvesFrom","evolvesTo"]:
        cat = "Evolution"
    elif col.startswith("source") or col.startswith("import"):
        cat = "Import and Sources"
    else:
        cat = "Other"
    guide_rows.append([cat,col,""])

source_rows = [
["entryId","sourceName","sourceType","sourceUrl","sourceNotes","lastChecked"],
["PKMN-0025","Example source","Game data / field notes","","Replace this sample source later",""]
]

sheets = [
("README", readme_rows),
("Pokemon Entries", [pokemon_headers, pikachu_sample]),
("Evolution Mainline", evolution_mainline_rows),
("Evolution Variants", evolution_variant_rows),
("Allowed Values", allowed_rows),
("Column Guide", guide_rows),
("App Field Mapping", mapping_rows),
("Sources", source_rows)
]

def col_letter(n):
    result = ""
    while n:
        n, rem = divmod(n - 1, 26)
        result = chr(65 + rem) + result
    return result

def sheet_xml(rows):
    xml = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
    xml.append('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">')
    xml.append('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>')
    xml.append('<sheetData>')
    for r_idx, row in enumerate(rows, 1):
        xml.append(f'<row r="{r_idx}">')
        for c_idx, value in enumerate(row, 1):
            cell = f"{col_letter(c_idx)}{r_idx}"
            text = "" if value is None else str(value)
            xml.append(f'<c r="{cell}" t="inlineStr"><is><t>{escape(text)}</t></is></c>')
        xml.append('</row>')
    xml.append('</sheetData></worksheet>')
    return "".join(xml)

content_types = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
content_types.append('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">')
content_types.append('<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>')
content_types.append('<Default Extension="xml" ContentType="application/xml"/>')
content_types.append('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>')
for i in range(1, len(sheets) + 1):
    content_types.append(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
content_types.append('</Types>')

workbook = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
workbook.append('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>')
for i, (name, _) in enumerate(sheets, 1):
    workbook.append(f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>')
workbook.append('</sheets></workbook>')

rels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
rels.append('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">')
rels.append('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>')
rels.append('</Relationships>')

workbook_rels = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>']
workbook_rels.append('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">')
for i in range(1, len(sheets) + 1):
    workbook_rels.append(f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>')
workbook_rels.append('</Relationships>')

with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", "".join(content_types))
    z.writestr("_rels/.rels", "".join(rels))
    z.writestr("xl/workbook.xml", "".join(workbook))
    z.writestr("xl/_rels/workbook.xml.rels", "".join(workbook_rels))
    for i, (_, rows) in enumerate(sheets, 1):
        z.writestr(f"xl/worksheets/sheet{i}.xml", sheet_xml(rows))

print(output_path)
