import re
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
APP = PROJECT / "app.js"
CSS = PROJECT / "styles.css"
HTML = PROJECT / "index.html"
SW = PROJECT / "service-worker.js"
REBUILD = PROJECT / "import-tools" / "rebuild-index-and-cache.py"
STAMP = "20260516-234759"

app = APP.read_text(encoding="utf-8-sig")

helper = r'''
function normalizeEntryLookupValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findEntryByNameOrId(value) {
  const target = normalizeEntryLookupValue(value);

  if (!target) {
    return null;
  }

  return allEntries.find((entry) => {
    const possibleMatches = [
      entry.id,
      entry.entryId,
      entry.name,
      entry.pokedexNumber
    ];

    return possibleMatches.some((possibleValue) => {
      return normalizeEntryLookupValue(possibleValue) === target;
    });
  }) || null;
}

'''

if "function findEntryByNameOrId(value)" not in app:
    marker = "function makeEvolutionNode(evolution, currentEntryName) {"
    if marker not in app:
        raise SystemExit("Could not find makeEvolutionNode in app.js.")
    app = app.replace(marker, helper + marker, 1)

new_function = r'''function makeEvolutionNode(evolution, currentEntryName) {
  const node = document.createElement("div");
  node.className = "evolution-family-node";

  if (evolution.name === currentEntryName) {
    node.classList.add("current-evolution");
  }

  const matchingEntry = findEntryByNameOrId(evolution.name);

  if (matchingEntry) {
    node.classList.add("clickable-evolution-node");
    node.setAttribute("role", "button");
    node.setAttribute("tabindex", "0");
    node.title = "Open " + matchingEntry.name;

    const openMatchingEntry = async () => {
      try {
        await openEntryDetail(matchingEntry);
      } catch (error) {
        console.error("Could not open evolution entry:", error);
        alert("Could not open this evolution entry. Check that the matching JSON file exists and the index has been rebuilt.");
      }
    };

    node.addEventListener("click", (event) => {
      event.stopPropagation();
      openMatchingEntry();
    });

    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMatchingEntry();
      }
    });
  }

  const symbol = document.createElement("div");
  symbol.className = "evolution-symbol";
  symbol.textContent = evolution.symbol || "◆";

  const name = document.createElement("h4");
  name.textContent = evolution.name;

  const stage = document.createElement("p");
  stage.className = "evolution-stage";
  stage.textContent = evolution.stage || "Unknown Stage";

  const types = document.createElement("div");
  types.className = "evolution-type-pills";

  if (evolution.types && evolution.types.length > 0) {
    evolution.types.forEach((typeName) => {
      const pill = document.createElement("span");
      pill.textContent = typeName;
      types.appendChild(pill);
    });
  }

  const note = document.createElement("p");
  note.className = "evolution-note";
  note.textContent = evolution.note || "";

  node.appendChild(symbol);
  node.appendChild(name);
  node.appendChild(stage);
  node.appendChild(types);
  node.appendChild(note);

  return node;
}'''

pattern = r'function makeEvolutionNode\(evolution, currentEntryName\) \{.*?return node;\s*\}'
matches = re.findall(pattern, app, flags=re.S)

if not matches:
    raise SystemExit("Could not patch makeEvolutionNode.")

app = re.sub(pattern, new_function, app, flags=re.S)

APP.write_text(app, encoding="utf-8")

css = CSS.read_text(encoding="utf-8-sig")

css_add = r'''

/* ===== CLICKABLE EVOLUTION NODES ===== */

.clickable-evolution-node {
  cursor: pointer;
}

.clickable-evolution-node:hover {
  transform: translateY(-3px);
  border-color: rgba(216, 247, 184, 0.9);
  box-shadow:
    0 0 22px rgba(216, 247, 184, 0.26),
    inset 0 0 18px rgba(216, 247, 184, 0.08);
}

.clickable-evolution-node:focus {
  outline: 2px solid #d8f7b8;
  outline-offset: 3px;
}

body.electric-page-mode .clickable-evolution-node:hover,
#detail-screen.type-electric .clickable-evolution-node:hover {
  border-color: rgba(255, 231, 45, 0.95);
  box-shadow:
    0 0 26px rgba(255, 231, 45, 0.42),
    0 0 34px rgba(0, 190, 255, 0.18),
    inset 0 0 20px rgba(255, 231, 45, 0.1);
}

body.electric-page-mode .clickable-evolution-node:focus,
#detail-screen.type-electric .clickable-evolution-node:focus {
  outline: 2px solid #ffe72d;
}
'''

if "CLICKABLE EVOLUTION NODES" not in css:
    css = css.rstrip() + css_add + "\n"

CSS.write_text(css, encoding="utf-8")

html = HTML.read_text(encoding="utf-8-sig")
html = re.sub(r'styles\.css\?v=[^"\']+', f"styles.css?v={STAMP}", html)
html = re.sub(r'app\.js\?v=[^"\']+', f"app.js?v={STAMP}", html)
HTML.write_text(html, encoding="utf-8")

app = APP.read_text(encoding="utf-8-sig")
app = re.sub(r'entries-index\.json\?v=[^"\']+', f"entries-index.json?v={STAMP}", app)
app = re.sub(r'entries\.json\?v=[^"\']+', f"entries-index.json?v={STAMP}", app)
APP.write_text(app, encoding="utf-8")

if REBUILD.exists():
    rebuild_text = REBUILD.read_text(encoding="utf-8-sig")
    rebuild_text = re.sub(r'STAMP = "[^"]+"', f'STAMP = "{STAMP}"', rebuild_text)
    REBUILD.write_text(rebuild_text, encoding="utf-8")

print("Clickable evolution patch added.")
