import re
from pathlib import Path

PROJECT = Path(r"C:\Users\danie\OneDrive\Desktop\field-pokedex-pwa")
APP = PROJECT / "app.js"
HTML = PROJECT / "index.html"
SW = PROJECT / "service-worker.js"
REBUILD = PROJECT / "import-tools" / "rebuild-index-and-cache.py"
STAMP = "20260516-235007"

app = APP.read_text(encoding="utf-8-sig")

new_render = r'''function isMeaningfulEvolutionValue(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  const emptyValues = [
    "",
    "none",
    "none known",
    "no known",
    "unknown",
    "n/a",
    "na",
    "not applicable",
    "not listed",
    "not listed yet",
    "no evolution",
    "no evolutions",
    "does not evolve",
    "doesn't evolve",
    "no regional variant",
    "no regional variants",
    "none currently known"
  ];

  return !emptyValues.includes(text);
}

function cleanEvolutionNodeList(nodes) {
  if (!nodes || !Array.isArray(nodes)) {
    return [];
  }

  return nodes.filter((node) => {
    return node && isMeaningfulEvolutionValue(node.name);
  });
}

function cleanEvolutionVariantList(variants) {
  if (!variants || !Array.isArray(variants)) {
    return [];
  }

  return variants.filter((variant) => {
    return (
      variant &&
      variant.target &&
      isMeaningfulEvolutionValue(variant.target.name)
    );
  });
}

function renderEvolutionTree(entry) {
  const card = document.querySelector("#evolution-tree-card");
  const title = document.querySelector("#evolution-family-title");
  const subtitle = document.querySelector("#evolution-family-subtitle");
  const tree = document.querySelector("#detail-evolution-tree");
  const evolutionJumpButton = document.querySelector('[data-jump-target="evolution-tree-card"]');

  if (!card || !tree) {
    return;
  }

  tree.innerHTML = "";

  const rawEvolutionTree = entry.evolutionTree || null;
  const mainLine = cleanEvolutionNodeList(rawEvolutionTree ? rawEvolutionTree.mainLine : []);
  const variants = cleanEvolutionVariantList(rawEvolutionTree ? rawEvolutionTree.variants : []);

  const hasRealEvolutionData = mainLine.length > 1 || variants.length > 0;

  if (!hasRealEvolutionData) {
    card.classList.add("hidden");

    if (evolutionJumpButton) {
      evolutionJumpButton.classList.add("hidden");
    }

    return;
  }

  card.classList.remove("hidden");

  if (evolutionJumpButton) {
    evolutionJumpButton.classList.remove("hidden");
  }

  if (title) {
    title.textContent = rawEvolutionTree.familyName || entry.name + " Evolution Family";
  }

  if (subtitle) {
    subtitle.textContent = rawEvolutionTree.subtitle || "Evolution Tree";
  }

  const showcase = document.createElement("div");
  showcase.className = "evolution-showcase";

  if (mainLine.length > 0) {
    const mainLineContainer = document.createElement("div");
    mainLineContainer.className = "evolution-mainline";

    mainLine.forEach((evolution, index) => {
      mainLineContainer.appendChild(makeEvolutionNode(evolution, entry.name));

      if (index < mainLine.length - 1) {
        mainLineContainer.appendChild(makeEvolutionConnector(evolution.methodToNext));
      }
    });

    showcase.appendChild(mainLineContainer);
  }

  if (variants.length > 0) {
    const variantArea = document.createElement("div");
    variantArea.className = "evolution-variant-area";

    variants.forEach((variant) => {
      const variantRow = document.createElement("div");
      variantRow.className = "evolution-variant-row";

      const fromLabel = document.createElement("div");
      fromLabel.className = "variant-from-label";

      if (isMeaningfulEvolutionValue(variant.from)) {
        fromLabel.textContent = "Branch from " + variant.from;
      } else {
        fromLabel.textContent = "Branch from " + entry.name;
      }

      const connector = makeEvolutionConnector(variant.method);
      connector.classList.add("variant-connector");

      const targetNode = makeEvolutionNode(variant.target, entry.name);
      targetNode.classList.add("regional-variant-node");

      variantRow.appendChild(fromLabel);
      variantRow.appendChild(connector);
      variantRow.appendChild(targetNode);
      variantArea.appendChild(variantRow);
    });

    showcase.appendChild(variantArea);
  }

  tree.appendChild(showcase);
}'''

pattern = r'function renderEvolutionTree\(entry\) \{.*?\n\}\s*\n\s*function setKeyValueBlock'
replacement = new_render + "\n\nfunction setKeyValueBlock"

if not re.search(pattern, app, flags=re.S):
    raise SystemExit("Could not find renderEvolutionTree block in app.js.")

app = re.sub(pattern, replacement, app, count=1, flags=re.S)

app = re.sub(r'entries-index\.json\?v=[^"\']+', f"entries-index.json?v={STAMP}", app)
app = re.sub(r'entries\.json\?v=[^"\']+', f"entries-index.json?v={STAMP}", app)
APP.write_text(app, encoding="utf-8")

html = HTML.read_text(encoding="utf-8-sig")
html = re.sub(r'styles\.css\?v=[^"\']+', f"styles.css?v={STAMP}", html)
html = re.sub(r'app\.js\?v=[^"\']+', f"app.js?v={STAMP}", html)
HTML.write_text(html, encoding="utf-8")

sw = SW.read_text(encoding="utf-8-sig")
sw = re.sub(r'const CACHE_NAME = "field-pokedex-[^"]+";', f'const CACHE_NAME = "field-pokedex-{STAMP}";', sw)
SW.write_text(sw, encoding="utf-8")

if REBUILD.exists():
    rebuild = REBUILD.read_text(encoding="utf-8-sig")
    rebuild = re.sub(r'STAMP = "[^"]+"', f'STAMP = "{STAMP}"', rebuild)
    REBUILD.write_text(rebuild, encoding="utf-8")

print("Empty evolution and regional variant sections will now hide.")
