let allEntries = [];
let fullEntryCache = {};
let currentDetailEntryId = null;
let previousScreenBeforeTag = "home";
let favoriteEntryIds = JSON.parse(localStorage.getItem("fieldPokedexFavorites") || "[]");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => {
        console.log("Service worker registered");
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

const navButtons = document.querySelectorAll(".nav-button");
const screens = document.querySelectorAll(".screen");
const categories = ["plants", "animals", "hazards", "water", "shelter", "medical"];

function normalizeElementType(typeName) {
  if (!typeName) {
    return "";
  }

  return String(typeName)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-type$/, "");
}
function clearEntryTheme() {
  document.body.classList.remove("electric-page-mode");

  Array.from(document.body.classList).forEach((className) => {
    if (className.startsWith("entry-type-")) {
      document.body.classList.remove(className);
    }
  });
}

function showScreen(screenName) {
  if (screenName !== "detail") {
    clearEntryTheme();
  }

  navButtons.forEach((navButton) => {
    navButton.classList.remove("active");
  });

  screens.forEach((screen) => {
    screen.classList.remove("active-screen");
  });

  const screenToShow = document.querySelector("#" + screenName + "-screen");

  if (screenToShow) {
    screenToShow.classList.add("active-screen");
  }
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetScreen = button.dataset.screen;

    showScreen(targetScreen);
    button.classList.add("active");
  });
});

function saveFavorites() {
  localStorage.setItem("fieldPokedexFavorites", JSON.stringify(favoriteEntryIds));
}

function isFavorite(entryId) {
  return favoriteEntryIds.includes(entryId);
}

function updateFavoriteButton(entryId) {
  function setupDetailJumpButtons() {
  const jumpButtons = document.querySelectorAll(".detail-jump-panel button");

  jumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.jumpTarget;
      const target = document.querySelector("#" + targetId);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

setupDetailJumpButtons();

const favoriteButton = document.querySelector("#favorite-entry-button");

  if (!favoriteButton) {
    return;
  }

  if (isFavorite(entryId)) {
    favoriteButton.textContent = "â˜… Saved Entry";
    favoriteButton.classList.add("saved");
  } else {
    favoriteButton.textContent = "â˜† Save Entry";
    favoriteButton.classList.remove("saved");
  }
}

function toggleFavorite(entryId) {
  if (!entryId) {
    return;
  }

  if (isFavorite(entryId)) {
    favoriteEntryIds = favoriteEntryIds.filter((id) => id !== entryId);
  } else {
    favoriteEntryIds.push(entryId);
  }

  saveFavorites();
  updateFavoriteButton(entryId);
  renderEntries(allEntries);
  renderFavorites(allEntries);
  renderTypes(allEntries);
}

function setText(selector, label, value) {
  const element = document.querySelector(selector);

  if (!element) {
    return;
  }

  if (value) {
    element.textContent = label ? label + ": " + value : value;
  } else {
    element.textContent = label ? label + ": Not listed yet" : "Not listed yet";
  }
}


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


function getEvolutionImageSource(evolution) {
  const matchingEntry = findEntryByNameOrId(evolution.name);

  return (
    evolution.image ||
    evolution.imagePath ||
    evolution.sprite ||
    (matchingEntry ? matchingEntry.image || matchingEntry.imagePath || matchingEntry.sprite : "")
  );
}
function makeEvolutionNode(evolution, currentEntryName) {
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

  const imageSource =
    evolution.image ||
    evolution.imagePath ||
    evolution.sprite ||
    (matchingEntry ? matchingEntry.image || matchingEntry.imagePath || matchingEntry.sprite : "");

  const symbol = document.createElement("div");
  symbol.className = "evolution-symbol";

  if (imageSource) {
    const image = document.createElement("img");
    image.src = imageSource;
    image.alt = evolution.name || "Evolution image";
    symbol.appendChild(image);
    symbol.classList.add("has-image");
  } else {
    const evolutionImageSource = getEvolutionImageSource(evolution);

  if (evolutionImageSource) {
    const evolutionImage = document.createElement("img");
    evolutionImage.src = evolutionImageSource;
    evolutionImage.alt = evolution.name || "Evolution image";
    symbol.appendChild(evolutionImage);
    symbol.classList.add("has-image");
  } else {
    symbol.textContent = evolution.symbol || "◆";
  }
  }

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
}

function makeEvolutionConnector(methodText) {
  const connector = document.createElement("div");
  connector.className = "evolution-connector";

  const method = document.createElement("span");
  method.className = "evolution-trigger";
  method.textContent = methodText || "Evolution";

  const arrow = document.createElement("div");
  arrow.className = "evolution-arrow";
  arrow.textContent = "Evolve";

  connector.appendChild(method);
  connector.appendChild(arrow);

  return connector;
}


function getEvolutionImageSource(evolution) {
  const matchingEntry = findEntryByNameOrId(evolution.name);

  return (
    evolution.image ||
    evolution.imagePath ||
    evolution.sprite ||
    (matchingEntry ? matchingEntry.image || matchingEntry.imagePath || matchingEntry.sprite : "")
  );
}
function makeEvolutionNode(evolution, currentEntryName) {
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

  const imageSource =
    evolution.image ||
    evolution.imagePath ||
    evolution.sprite ||
    (matchingEntry ? matchingEntry.image || matchingEntry.imagePath || matchingEntry.sprite : "");

  const symbol = document.createElement("div");
  symbol.className = "evolution-symbol";

  if (imageSource) {
    const image = document.createElement("img");
    image.src = imageSource;
    image.alt = evolution.name || "Evolution image";
    symbol.appendChild(image);
    symbol.classList.add("has-image");
  } else {
    const evolutionImageSource = getEvolutionImageSource(evolution);

  if (evolutionImageSource) {
    const evolutionImage = document.createElement("img");
    evolutionImage.src = evolutionImageSource;
    evolutionImage.alt = evolution.name || "Evolution image";
    symbol.appendChild(evolutionImage);
    symbol.classList.add("has-image");
  } else {
    symbol.textContent = evolution.symbol || "◆";
  }
  }

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
}

function makeEvolutionConnector(methodText) {
  const connector = document.createElement("div");
  connector.className = "evolution-connector";

  const method = document.createElement("span");
  method.className = "evolution-trigger";
  method.textContent = methodText || "Evolution";

  const arrow = document.createElement("div");
  arrow.className = "evolution-arrow";
  arrow.textContent = "Evolve";

  connector.appendChild(method);
  connector.appendChild(arrow);

  return connector;
}

function isMeaningfulEvolutionValue(value) {
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
}

function setKeyValueBlock(selector, dataObject) {
  const container = document.querySelector(selector);

  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!dataObject) {
    const emptyText = document.createElement("p");
    emptyText.textContent = "Not listed yet";
    container.appendChild(emptyText);
    return;
  }

  Object.keys(dataObject).forEach((key) => {
    const row = document.createElement("p");

    const cleanKey = key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (letter) => letter.toUpperCase());

    row.textContent = cleanKey + ": " + dataObject[key];
    container.appendChild(row);
  });
}

function setList(selector, items) {
  const list = document.querySelector(selector);

  if (!list) {
    return;
  }

  list.innerHTML = "";

  if (items && items.length > 0) {
    items.forEach((item) => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      list.appendChild(listItem);
    });
  } else {
    const listItem = document.createElement("li");
    listItem.textContent = "Not listed yet";
    list.appendChild(listItem);
  }
}

function formatTagName(tag) {
  if (!tag) {
    return "Unknown";
  }

  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderRelatedEntries(currentEntry) {
  const relatedList = document.querySelector("#detail-related-entries");

  if (!relatedList) {
    return;
  }

  relatedList.innerHTML = "";

  const currentTags = currentEntry.tags || [];

  const relatedEntries = allEntries
    .filter((entry) => entry.id !== currentEntry.id)
    .map((entry) => {
      const entryTags = entry.tags || [];
      let score = 0;

      if (entry.elementType && entry.elementType === currentEntry.elementType) {
        score += 5;
      }

      if (entry.category && entry.category === currentEntry.category) {
        score += 2;
      }

      entryTags.forEach((tag) => {
        if (currentTags.includes(tag)) {
          score += 1;
        }
      });

      return {
        entry,
        score
      };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((result) => result.entry);

  if (relatedEntries.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "entry-card";
    emptyCard.innerHTML = "<h3>No related entries yet</h3><p>As you add more PokÃ©mon, animals, hazards, tools, and plants, related entries will appear here automatically.</p>";
    relatedList.appendChild(emptyCard);
    return;
  }

  relatedEntries.forEach((entry) => {
    relatedList.appendChild(makeEntryCard(entry));
  });
}

function openTagResults(tag) {
  if (!tag) {
    return;
  }

  const activeScreen = document.querySelector(".screen.active-screen");

  if (activeScreen && activeScreen.id) {
    previousScreenBeforeTag = activeScreen.id.replace("-screen", "");
  }


  // CHARMANDER_MAIN_IMAGE_FORCE_FIX
  if (entry.name === "Charmander") {
    entry.image = "assets/images/pokemon/charmander/charmander-display.png";
    entry.imagePath = "assets/images/pokemon/charmander/charmander-display.png";
    entry.sprite = "assets/images/pokemon/charmander/charmander-display.png";
    entry.anatomyImage = "assets/images/pokemon/charmander/charmander-anatomy.png";
    entry.anatomyImagePath = "assets/images/pokemon/charmander/charmander-anatomy.png";
  }
  clearGlobalSearchResults();

  const title = document.querySelector("#tag-results-title");
  const subtitle = document.querySelector("#tag-results-subtitle");
  const list = document.querySelector("#tag-results-list");

  if (!title || !subtitle || !list) {
    return;
  }

  title.textContent = "#" + formatTagName(tag);
  subtitle.textContent = "Entries matching tag: " + tag;
  list.innerHTML = "";

  const matchingEntries = allEntries.filter((entry) => {
    const tags = entry.tags || [];

    return (
      tags.includes(tag) ||
      entry.elementType === tag ||
      entry.category === tag
    );
  });

  if (matchingEntries.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "entry-card";
    emptyCard.innerHTML = "<h3>No entries found</h3><p>This tag is ready for future PokÃ©mon, animals, and field entries.</p>";
    list.appendChild(emptyCard);
  }

  matchingEntries.forEach((entry) => {
    list.appendChild(makeEntryCard(entry));
  });

  showScreen("tag");
}

function renderTagStrip(container, tags, limit) {
  if (!container) {
    return;
  }

  container.innerHTML = "";

  if (!tags || tags.length === 0) {
    return;
  }

  const visibleTags = limit ? tags.slice(0, limit) : tags;

  visibleTags.forEach((tag) => {
    const chip = document.createElement("button");
    chip.className = "tag-chip";
    chip.type = "button";
    chip.textContent = tag;

    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      openTagResults(tag);
    });

    container.appendChild(chip);
  });
}


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

function makeEntryCard(entry) {
  const card = document.createElement("article");
  card.className = "entry-card clickable-card";

  if (isFavorite(entry.id)) {
    const favoriteBadge = document.createElement("span");
    favoriteBadge.className = "favorite-card-badge";
    favoriteBadge.textContent = "â˜… Saved";
    card.appendChild(favoriteBadge);
  }

  const title = document.createElement("h3");
  title.textContent = entry.name;

  const meta = document.createElement("p");
  meta.className = "entry-meta";
  meta.textContent = entry.type + " | Danger: " + entry.dangerLevel;

  const cardTags = document.createElement("div");
  cardTags.className = "card-tag-strip";
  renderTagStrip(cardTags, entry.tags, 4);

  const description = document.createElement("p");
  description.textContent = entry.description;

  const use = document.createElement("p");
  use.className = "survival-use";
  use.textContent = "Use: " + entry.survivalUse;

  const note = document.createElement("p");
  note.className = "field-note";
  note.textContent = "Field note: " + entry.fieldNote;

  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(cardTags);
  card.appendChild(description);
  card.appendChild(use);
  card.appendChild(note);

  card.addEventListener("click", async () => {
    try {
      await openEntryDetail(entry);
    } catch (error) {
      console.error("Could not open entry detail:", error);
      alert("Could not open this entry detail file. Check the matching JSON file in the data folder.");
    }
  });

  return card;
}

function clearGlobalSearchResults() {
  const searchInput = document.querySelector("#global-entry-search");
  const resultsHeader = document.querySelector("#global-search-results-header");
  const resultsList = document.querySelector("#global-search-results");

  if (searchInput) {
    searchInput.value = "";
  }

  if (resultsHeader) {
    resultsHeader.classList.add("hidden");
  }

  if (resultsList) {
    resultsList.classList.add("hidden");
    resultsList.innerHTML = "";
  }
}


function renderAnatomyImage(entry) {
  const anatomySource = entry.anatomyImage || entry.anatomyImagePath || entry.anatomy || "";
  const anatomyCard = document.querySelector("#detail-anatomy-card");
  const anatomyImg = document.querySelector("#detail-anatomy-image");
  const anatomyLink = document.querySelector("#detail-anatomy-link");
  const anatomyCaption = document.querySelector("#detail-anatomy-caption");

  if (!anatomyCard || !anatomyImg) {
    return;
  }

  if (anatomySource) {
    const cacheSafeSource = anatomySource + (anatomySource.includes("?") ? "&" : "?") + "v=" + Date.now();

    anatomyImg.src = cacheSafeSource;
    anatomyImg.alt = (entry.name || "Entry") + " anatomy plate";

    if (anatomyLink) {
      anatomyLink.href = anatomySource;
      anatomyLink.title = "Open full-size anatomy image";
    }

    if (anatomyCaption) {
      anatomyCaption.textContent = (entry.name || "Entry") + " biological anatomy reference. Tap or click the image to open it full-size.";
    }

    anatomyCard.classList.remove("hidden");
  } else {
    anatomyImg.removeAttribute("src");

    if (anatomyLink) {
      anatomyLink.href = "#";
    }

    anatomyCard.classList.add("hidden");
  }
}
async function openEntryDetail(entry) {
  entry = await loadFullEntry(entry);

  if (!entry) {
    return;
  }


  // CHARMANDER_MAIN_IMAGE_FORCE_FIX
  if (entry.name === "Charmander") {
    entry.image = "assets/images/pokemon/charmander/charmander-display.png";
    entry.imagePath = "assets/images/pokemon/charmander/charmander-display.png";
    entry.sprite = "assets/images/pokemon/charmander/charmander-display.png";
    entry.anatomyImage = "assets/images/pokemon/charmander/charmander-anatomy.png";
    entry.anatomyImagePath = "assets/images/pokemon/charmander/charmander-anatomy.png";
  }
  clearGlobalSearchResults();
  currentDetailEntryId = entry.id;
  updateFavoriteButton(currentDetailEntryId);

  setText("#detail-category", "", entry.category);
  setText("#detail-name", "", entry.name);
  setText("#detail-pokedex-number", "", entry.pokedexNumber);
  setText("#detail-description", "", entry.description);
  setKeyValueBlock("#detail-key-facts", entry.keyFacts);

  const detailTagStrip = document.querySelector("#detail-tag-strip");
  renderTagStrip(detailTagStrip, entry.tags);

  setText("#detail-entry-id", "Entry ID", entry.entryId || entry.id);
  setText("#detail-type", "Type", entry.type);
  setText("#detail-element-type", "Element Type", entry.elementType);
  setText("#detail-danger", "Danger", entry.dangerLevel);
  setText("#detail-rarity", "Rarity", entry.rarity);
  setText("#detail-region", "Region", entry.region);
  setText("#detail-route", "Route / Location", entry.route);

  setText("#detail-classification", "Classification", entry.classification);
  setKeyValueBlock("#detail-scientific-classification", entry.scientificClassification);
  setText("#detail-physical-characteristics", "", entry.physicalCharacteristics);
  setText("#detail-physiology", "", entry.physiology);
  setText("#detail-size", "Size / Weight", [entry.height, entry.weight].filter(Boolean).join(" / "));
  setText("#detail-observation-difficulty", "Observation Difficulty", entry.observationDifficulty);
  setText("#detail-conservation-status", "Conservation Status", entry.conservationStatus);
  setText("#detail-population-status", "Population Status", entry.populationStatus);
  setText("#detail-lifespan", "Lifespan", entry.lifespan);
  setText("#detail-life-cycle", "Life Cycle", entry.lifeCycle);
  setText("#detail-reproduction", "", entry.reproductionNesting);

  setText("#detail-habitat", "", entry.habitat);
  setList("#detail-temperament-triggers", entry.temperamentTriggers);
  setText("#detail-territory-range", "", entry.territoryRange);
  setText("#detail-predators", "Predators", entry.predators);
  setText("#detail-prey", "Prey / Food Chain Role", entry.prey);
  setText("#detail-ecological-role", "", entry.ecologicalRole);
  setText("#detail-behavior", "", entry.behaviorTemperament);
  setText("#detail-social-structure", "", entry.socialStructure);
  setText("#detail-diet", "", entry.diet);
  setText("#detail-diet-restrictions", "", entry.dietRestrictions);
  setText("#detail-activity-pattern", "Pattern", entry.activityPattern);
  setText("#detail-best-time", "Best Time to Find", entry.bestTimeToFind);
  setText("#detail-lore", "", entry.lore);
  setText("#detail-origin-story", "", entry.originStory);
  renderEvolutionTree(entry);
  renderRelatedEntries(entry);
  renderAnatomyImage(entry);
  setText("#detail-encounter-advice", "", entry.encounterAdvice);
  setText("#detail-warning", "", entry.handlingWarning);
  setText("#detail-containment-requirements", "", entry.containmentRequirements);
  setText("#detail-emergency-response", "", entry.emergencyResponse);
  setText("#detail-disease-risk", "", entry.diseaseParasiteRisk);
  setList("#detail-stress-signs", entry.stressSicknessSigns);
  setText("#detail-first-aid", "", entry.firstAid);
  setText("#detail-use", "", entry.survivalUse);
  setText("#detail-domestication-status", "", entry.domesticationStatus);
  setText("#detail-domestication-difficulty", "Difficulty", entry.domesticationDifficulty);
  setText("#detail-training-risk", "Training Risk", entry.trainingRisk);
  setText("#detail-legal-status", "", entry.legalStatus);
  setText("#detail-human-conflict-risk", "", entry.humanConflictRisk);
  setText("#detail-companion", "", entry.companionSuitability);
  setText("#detail-note", "", entry.fieldNote);
  setText("#detail-image-path", "Image Path", entry.image || entry.imagePath || entry.sprite || "Not added yet");
  setText("#detail-audio-path", "Audio / Cry Path", entry.audio || "Not added yet");
  setText("#detail-author", "Entry Author / Source", entry.entryAuthor);

  setList("#detail-equipment", entry.equipment);
  setKeyValueBlock("#detail-field-capabilities", entry.fieldCapabilities);
  setList("#detail-abilities", entry.abilities);
  setList("#detail-field-behaviors", entry.fieldBehaviors);
  setList("#detail-weaknesses", entry.weaknesses);
  setList("#detail-resistances", entry.resistances);
  setList("#detail-signs", entry.signsOfPresence);

  const statsPanel = document.querySelector("#detail-stats");

  if (statsPanel) {
    statsPanel.innerHTML = "";

    if (entry.stats) {
      Object.keys(entry.stats).forEach((statName) => {
        const statValue = entry.stats[statName];
        const safeValue = Math.max(0, Math.min(5, Number(statValue) || 0));
        const percent = safeValue * 20;

        const statRow = document.createElement("div");
        statRow.className = "stat-bar-row";

        const statLabel = document.createElement("div");
        statLabel.className = "stat-bar-label";

        const cleanStatName = statName
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (letter) => letter.toUpperCase());

        statLabel.innerHTML = "<span>" + cleanStatName + "</span><strong>" + safeValue + "/5</strong>";

        const statTrack = document.createElement("div");
        statTrack.className = "stat-bar-track";

        const statFill = document.createElement("div");
        statFill.className = "stat-bar-fill";
        statFill.style.width = percent + "%";

        statTrack.appendChild(statFill);
        statRow.appendChild(statLabel);
        statRow.appendChild(statTrack);
        statsPanel.appendChild(statRow);
      });
    } else {
      const emptyStat = document.createElement("p");
      emptyStat.textContent = "No stats listed yet";
      statsPanel.appendChild(emptyStat);
    }
  }

  const anatomySource = entry.anatomyImage || entry.anatomyImagePath || entry.anatomy || "";
  const anatomyCard = document.querySelector("#detail-anatomy-card");
  const anatomyImg = document.querySelector("#detail-anatomy-image");
  const anatomyCaption = document.querySelector("#detail-anatomy-caption");

  if (anatomyCard && anatomyImg) {
    if (anatomySource) {
      anatomyImg.src = anatomySource;
      anatomyImg.alt = entry.name + " anatomy plate";
      anatomyCard.classList.remove("hidden");

      if (anatomyCaption) {
        anatomyCaption.textContent = entry.name + " biological anatomy reference";
      }
    } else {
      anatomyImg.removeAttribute("src");
      anatomyCard.classList.add("hidden");
    }
  }
  const detailVisual = document.querySelector("#detail-visual");

  if (detailVisual) {
    detailVisual.innerHTML = "";

    const detailImageSource = entry.image || entry.imagePath || entry.sprite || "";

    if (detailImageSource) {
      const image = document.createElement("img");
      image.src = detailImageSource + "?v=" + Date.now();
      image.alt = entry.name || "Entry image";

      image.onerror = () => {
        detailVisual.innerHTML = "";
        detailVisual.textContent = entry.visualSymbol || "?";
        detailVisual.classList.remove("has-image");
        console.error("Main entry image failed to load:", detailImageSource);
      };

      detailVisual.appendChild(image);
      detailVisual.classList.add("has-image");
    } else {
      detailVisual.textContent = entry.visualSymbol || "?";
      detailVisual.classList.remove("has-image");
    }
  }
  const detailScreen = document.querySelector("#detail-screen");

  if (detailScreen) {
    Array.from(detailScreen.classList).forEach((className) => {
      if (className.startsWith("type-")) {
        detailScreen.classList.remove(className);
      }
    });

    const officialTypes = getOfficialTypesForEntry(entry);
    const preferredThemeType = getPreferredDetailThemeType(officialTypes);
    const themeTypes = preferredThemeType ? [preferredThemeType] : officialTypes;

    themeTypes.forEach((typeName) => {
      const safeType = normalizeElementType(typeName);

      if (!safeType) {
        return;
      }

      detailScreen.classList.add("type-" + safeType);
      document.body.classList.add("entry-type-" + safeType);

      if (safeType === "electric") {
        document.body.classList.add("electric-page-mode");
      }
    });
  }

  // V44_RUN_UNIVERSAL_IMAGES_BEFORE_SHOW_DETAIL
  applyUniversalPokemonImages(entry);
  showScreen("detail");
}

function renderEntries(entries) {
  categories.forEach((category) => {
    const screen = document.querySelector("#" + category + "-screen");

    if (!screen) {
      return;
    }

    const oldList = screen.querySelector(".entry-list");

    if (oldList) {
      oldList.remove();
    }

    const list = document.createElement("section");
    list.className = "card-grid entry-list";

    const matchingEntries = entries.filter((entry) => entry.category === category);

    if (matchingEntries.length === 0) {
      const emptyCard = document.createElement("article");
      emptyCard.className = "entry-card";
      emptyCard.innerHTML = "<h3>No entries yet</h3><p>This category is ready for future database entries.</p>";
      list.appendChild(emptyCard);
    }

    matchingEntries.forEach((entry) => {
      list.appendChild(makeEntryCard(entry));
    });

    screen.appendChild(list);
  });
}

// OFFICIAL_TYPE_HELPER_START
const OFFICIAL_POKEMON_TYPES = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice",
  "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
  "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"
];

const OFFICIAL_TYPE_ALIASES = {
  cold: "Ice",
  frost: "Ice",
  frozen: "Ice",
  nature: "Grass",
  plant: "Grass",
  plants: "Grass",
  flora: "Grass",
  venom: "Poison",
  toxic: "Poison",
  shadow: "Dark",
  wind: "Flying",
  air: "Flying",
  lightning: "Electric",
  thunder: "Electric",
  metal: "Steel",
  earth: "Ground",
  stone: "Rock"
};

function collectOfficialTypeText(value, output) {
  if (value === null || value === undefined) {
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectOfficialTypeText(item, output));
    return output;
  }

  if (typeof value === "object") {
    Object.values(value).forEach((item) => collectOfficialTypeText(item, output));
    return output;
  }

  output.push(String(value));
  return output;
}

function getOfficialTypesForEntry(entry) {
  const texts = [];

  [
    "officialTypes",
    "types",
    "type",
    "elementType",
    "elementalType",
    "elementalTypes",
    "elements",
    "fieldType",
    "fieldTypes",
    "tags",
    "category",
    "classification"
  ].forEach((key) => {
    if (entry && entry[key] !== undefined) {
      collectOfficialTypeText(entry[key], texts);
    }
  });

  const found = new Set();

  texts.forEach((rawText) => {
    const text = String(rawText || "")
      .replace(/[\/|,+;&:_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return;
    }

    OFFICIAL_POKEMON_TYPES.forEach((typeName) => {
      const pattern = new RegExp("(^|[^a-z])" + typeName + "([^a-z]|$)", "i");

      if (pattern.test(text)) {
        found.add(typeName);
      }
    });

    Object.keys(OFFICIAL_TYPE_ALIASES).forEach((alias) => {
      const pattern = new RegExp("(^|[^a-z])" + alias + "([^a-z]|$)", "i");

      if (pattern.test(text)) {
        found.add(OFFICIAL_TYPE_ALIASES[alias]);
      }
    });
  });

  return OFFICIAL_POKEMON_TYPES.filter((typeName) => found.has(typeName));
}

function getPreferredDetailThemeType(officialTypes) {
  if (!officialTypes || officialTypes.length === 0) {
    return "";
  }

  if (window.currentSelectedOfficialType && officialTypes.includes(window.currentSelectedOfficialType)) {
    return window.currentSelectedOfficialType;
  }

  const firstNonNormal = officialTypes.find((typeName) => typeName !== "Normal");

  return firstNonNormal || officialTypes[0];
}
// OFFICIAL_TYPE_HELPER_END
function formatTypeName(typeName) {
  if (!typeName) {
    return "Unknown";
  }

  return typeName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderTypes(entries, selectedType) {
  const typePanel = document.querySelector("#type-filter-panel");
  const typeResultsList = document.querySelector("#type-results-list");

  if (!typePanel || !typeResultsList) {
    return;
  }

  entries.forEach((entry) => {
    entry.officialTypes = getOfficialTypesForEntry(entry);
  });

  const availableTypes = OFFICIAL_POKEMON_TYPES.filter((typeName) => {
    return entries.some((entry) => {
      return entry.officialTypes && entry.officialTypes.includes(typeName);
    });
  });

  const activeType =
    selectedType && availableTypes.includes(selectedType)
      ? selectedType
      : availableTypes[0];

  window.currentSelectedOfficialType = activeType || "";

  typePanel.innerHTML = "";
  typeResultsList.innerHTML = "";

  availableTypes.forEach((typeName) => {
    const typeButton = document.createElement("button");
    typeButton.className = "type-filter-button";
    typeButton.textContent = typeName;

    if (typeName === activeType) {
      typeButton.classList.add("active");
    }

    typeButton.addEventListener("click", () => {
      renderTypes(entries, typeName);
    });

    typePanel.appendChild(typeButton);
  });

  const matchingEntries = entries.filter((entry) => {
    return entry.officialTypes && entry.officialTypes.includes(activeType);
  });

  if (matchingEntries.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "entry-card";
    emptyCard.innerHTML = "<h3>No entries found</h3><p>This type is ready for future entries.</p>";
    typeResultsList.appendChild(emptyCard);
    return;
  }

  matchingEntries.forEach((entry) => {
    typeResultsList.appendChild(makeEntryCard(entry));
  });
}

function renderFavorites(entries) {
  const favoritesScreen = document.querySelector("#favorites-screen");

  if (!favoritesScreen) {
    return;
  }

  const oldList = favoritesScreen.querySelector(".entry-list");

  if (oldList) {
    oldList.remove();
  }

  const list = document.createElement("section");
  list.className = "card-grid entry-list";

  const favoriteEntries = entries.filter((entry) => favoriteEntryIds.includes(entry.id));

  if (favoriteEntries.length === 0) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "entry-card";
    emptyCard.innerHTML = "<h3>No favorites saved</h3><p>Open an entry and tap Save Entry to store it here for offline use.</p>";
    list.appendChild(emptyCard);
  }

  favoriteEntries.forEach((entry) => {
    list.appendChild(makeEntryCard(entry));
  });

  favoritesScreen.appendChild(list);
}

function setupSearch(entries) {
  const searchInput = document.querySelector("#global-entry-search");
  const resultsHeader = document.querySelector("#global-search-results-header");
  const resultsList = document.querySelector("#global-search-results");

  if (!searchInput || !resultsHeader || !resultsList) {
    return;
  }

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();

    resultsList.innerHTML = "";

    if (query.length === 0) {
      resultsHeader.classList.add("hidden");
      resultsList.classList.add("hidden");
      return;
    }

    const matches = entries.filter((entry) => {
      const searchableText = [
        entry.id,
        entry.entryId,
        entry.pokedexNumber,
        entry.name,
        entry.category,
        entry.type,
        entry.elementType,
        entry.dangerLevel,
        entry.rarity,
        entry.region,
        entry.route,
        entry.habitat,
        entry.classification,
        entry.height,
        entry.weight,
        entry.behaviorTemperament,
        entry.diet,
        entry.activityPattern,
        entry.bestTimeToFind,
        entry.observationDifficulty,
        entry.conservationStatus,
        entry.description,
        entry.lore,
        entry.survivalUse,
        entry.handlingWarning,
        entry.encounterAdvice,
        entry.firstAid,
        entry.companionSuitability,
        entry.fieldNote,
        entry.tags ? entry.tags.join(" ") : "",
        entry.entryAuthor,
        entry.equipment ? entry.equipment.join(" ") : "",
        entry.abilities ? entry.abilities.join(" ") : "",
        entry.fieldBehaviors ? entry.fieldBehaviors.join(" ") : "",
        entry.weaknesses ? entry.weaknesses.join(" ") : "",
        entry.resistances ? entry.resistances.join(" ") : "",
        entry.signsOfPresence ? entry.signsOfPresence.join(" ") : "",
        entry.stats ? Object.keys(entry.stats).join(" ") : "",
        entry.searchText || ""
      ].join(" ").toLowerCase();

      return searchableText.includes(query);
    });

    resultsHeader.classList.remove("hidden");
    resultsList.classList.remove("hidden");

    if (matches.length === 0) {
      const emptyCard = document.createElement("article");
      emptyCard.className = "entry-card";
      emptyCard.innerHTML = "<h3>No matches</h3><p>Try searching for Pikachu, electric, water, shelter, Ice, plant, or hazard.</p>";
      resultsList.appendChild(emptyCard);
      return;
    }

    matches.forEach((entry) => {
      resultsList.appendChild(makeEntryCard(entry));
    });
  });
}

function setupDetailJumpButtons() {
  const jumpButtons = document.querySelectorAll(".detail-jump-panel button");

  jumpButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.jumpTarget;
      const target = document.querySelector("#" + targetId);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

setupDetailJumpButtons();

const favoriteButton = document.querySelector("#favorite-entry-button");

if (favoriteButton) {
  favoriteButton.addEventListener("click", () => {
    toggleFavorite(currentDetailEntryId);
  });
}

const backFromTagResultsButton = document.querySelector("#back-from-tag-results");

if (backFromTagResultsButton) {
  backFromTagResultsButton.addEventListener("click", () => {
    showScreen(previousScreenBeforeTag || "home");

    const matchingButton = document.querySelector('[data-screen="' + previousScreenBeforeTag + '"]');

    if (matchingButton) {
      matchingButton.classList.add("active");
    }
  });
}

const backButton = document.querySelector("#back-to-home");

if (backButton) {
  backButton.addEventListener("click", () => {
    showScreen("home");

    const homeButton = document.querySelector('[data-screen="home"]');

    if (homeButton) {
      homeButton.classList.add("active");
    }
  });
}

fetch("./data/entries-index.json?v=20260520-112943")
  .then((response) => response.json())
  .then((entries) => {
    allEntries = entries;
    renderEntries(allEntries);
    renderFavorites(allEntries);
    renderTypes(allEntries);
    setupSearch(allEntries);
  })
  .catch((error) => {
    console.error("Could not load entries:", error);
  });


















/* ===== v43 AUTOMATIC NAME-BASED POKEMON IMAGE SYSTEM ===== */

function fieldPokedexImageSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/♀/g, "-female")
    .replace(/♂/g, "-male")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFieldPokedexImagePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

function uniqueFieldPokedexPaths(paths) {
  const seen = new Set();

  return paths
    .map(normalizeFieldPokedexImagePath)
    .filter((path) => {
      if (!path || seen.has(path)) {
        return false;
      }

      seen.add(path);
      return true;
    });
}

function automaticPokemonImagePath(nameOrEntry, imageType) {
  const rawName = typeof nameOrEntry === "string"
    ? nameOrEntry
    : (nameOrEntry && (nameOrEntry.name || nameOrEntry.id || nameOrEntry.entryId));

  const slug = fieldPokedexImageSlug(rawName);

  if (!slug) {
    return "";
  }

  return "assets/images/pokemon/" + slug + "/" + slug + "-" + imageType + ".png";
}

function pokemonDisplayImageCandidates(entry) {
  return uniqueFieldPokedexPaths([
    automaticPokemonImagePath(entry, "display"),
    entry ? entry.image : "",
    entry ? entry.imagePath : "",
    entry ? entry.sprite : ""
  ]);
}

function pokemonAnatomyImageCandidates(entry) {
  return uniqueFieldPokedexPaths([
    automaticPokemonImagePath(entry, "anatomy"),
    entry ? entry.anatomyImage : "",
    entry ? entry.anatomyImagePath : "",
    entry ? entry.anatomy : ""
  ]);
}

function imageCacheSafeSource(path) {
  const cleanPath = normalizeFieldPokedexImagePath(path);

  if (!cleanPath) {
    return "";
  }

  return cleanPath + (cleanPath.includes("?") ? "&" : "?") + "v=" + Date.now();
}

function loadFirstWorkingImage(img, candidates, onSuccess, onFailure) {
  const cleanCandidates = uniqueFieldPokedexPaths(candidates);
  let index = 0;

  function tryNext() {
    if (index >= cleanCandidates.length) {
      if (onFailure) {
        onFailure();
      }
      return;
    }

    const candidate = cleanCandidates[index];
    index += 1;

    img.onload = () => {
      if (onSuccess) {
        onSuccess(candidate);
      }
    };

    img.onerror = () => {
      tryNext();
    };

    img.src = imageCacheSafeSource(candidate);
  }

  tryNext();
}

function renderDetailMainImage(entry) {
  const detailVisual = document.querySelector("#detail-visual");

  if (!detailVisual) {
    return;
  }

  detailVisual.innerHTML = "";

  const image = document.createElement("img");

  loadFirstWorkingImage(
    image,
    pokemonDisplayImageCandidates(entry),
    () => {
      image.alt = (entry && entry.name ? entry.name : "Entry") + " image";
      detailVisual.innerHTML = "";
      detailVisual.appendChild(image);
      detailVisual.classList.add("has-image");
    },
    () => {
      detailVisual.innerHTML = "";
      detailVisual.textContent = entry && entry.visualSymbol ? entry.visualSymbol : "?";
      detailVisual.classList.remove("has-image");
    }
  );
}

function renderAnatomyImage(entry) {
  const anatomyCard = document.querySelector("#detail-anatomy-card");
  const anatomyImg = document.querySelector("#detail-anatomy-image");
  const anatomyLink = document.querySelector("#detail-anatomy-link");
  const anatomyCaption = document.querySelector("#detail-anatomy-caption");

  if (!anatomyCard || !anatomyImg) {
    return;
  }

  loadFirstWorkingImage(
    anatomyImg,
    pokemonAnatomyImageCandidates(entry),
    (workingPath) => {
      anatomyImg.alt = (entry && entry.name ? entry.name : "Entry") + " anatomy plate";

      if (anatomyLink) {
        anatomyLink.href = normalizeFieldPokedexImagePath(workingPath);
        anatomyLink.title = "Open full-size anatomy image";
      }

      if (anatomyCaption) {
        anatomyCaption.textContent = (entry && entry.name ? entry.name : "Entry") + " biological anatomy reference. Tap or click the image to open it full-size.";
      }

      anatomyCard.classList.remove("hidden");
    },
    () => {
      anatomyImg.removeAttribute("src");

      if (anatomyLink) {
        anatomyLink.href = "#";
      }

      anatomyCard.classList.add("hidden");
    }
  );
}

function evolutionImageCandidates(evolution, matchingEntry) {
  return uniqueFieldPokedexPaths([
    automaticPokemonImagePath(evolution ? evolution.name : "", "display"),
    evolution ? evolution.image : "",
    evolution ? evolution.imagePath : "",
    evolution ? evolution.sprite : "",
    matchingEntry ? matchingEntry.image : "",
    matchingEntry ? matchingEntry.imagePath : "",
    matchingEntry ? matchingEntry.sprite : ""
  ]);
}

function makeEvolutionNode(evolution, currentEntryName) {
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

  const evolutionImage = document.createElement("img");

  loadFirstWorkingImage(
    evolutionImage,
    evolutionImageCandidates(evolution, matchingEntry),
    () => {
      evolutionImage.alt = (evolution && evolution.name ? evolution.name : "Evolution") + " image";
      symbol.innerHTML = "";
      symbol.appendChild(evolutionImage);
      symbol.classList.add("has-image");
    },
    () => {
      symbol.innerHTML = "";
      symbol.textContent = evolution.symbol || "◆";
      symbol.classList.remove("has-image");
    }
  );

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
}


/* ===== v44 UNIVERSAL DETAIL IMAGE AND ANATOMY OVERRIDE ===== */

function universalPokemonImageSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/♀/g, "-female")
    .replace(/♂/g, "-male")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function universalCleanImagePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
}

function universalUniqueImagePaths(paths) {
  const seen = new Set();

  return paths
    .map(universalCleanImagePath)
    .filter((path) => {
      if (!path || seen.has(path)) {
        return false;
      }

      seen.add(path);
      return true;
    });
}

function universalAutoPokemonImagePath(entryOrName, imageType) {
  const rawName = typeof entryOrName === "string"
    ? entryOrName
    : (entryOrName && (entryOrName.name || entryOrName.id || entryOrName.entryId));

  const slug = universalPokemonImageSlug(rawName);

  if (!slug) {
    return "";
  }

  return "assets/images/pokemon/" + slug + "/" + slug + "-" + imageType + ".png";
}

function universalCacheSafeImagePath(path) {
  const cleanPath = universalCleanImagePath(path);

  if (!cleanPath) {
    return "";
  }

  return cleanPath + (cleanPath.includes("?") ? "&" : "?") + "v=" + Date.now();
}

function universalTryImages(img, paths, onSuccess, onFailure) {
  const candidates = universalUniqueImagePaths(paths);
  let index = 0;

  function tryNext() {
    if (index >= candidates.length) {
      if (onFailure) {
        onFailure();
      }
      return;
    }

    const path = candidates[index];
    index += 1;

    img.onload = () => {
      if (onSuccess) {
        onSuccess(path);
      }
    };

    img.onerror = () => {
      tryNext();
    };

    img.src = universalCacheSafeImagePath(path);
  }

  tryNext();
}

function universalPokemonDisplayCandidates(entry) {
  return universalUniqueImagePaths([
    universalAutoPokemonImagePath(entry, "display"),
    entry ? entry.image : "",
    entry ? entry.imagePath : "",
    entry ? entry.sprite : ""
  ]);
}

function universalPokemonAnatomyCandidates(entry) {
  return universalUniqueImagePaths([
    universalAutoPokemonImagePath(entry, "anatomy"),
    entry ? entry.anatomyImage : "",
    entry ? entry.anatomyImagePath : "",
    entry ? entry.anatomy : ""
  ]);
}

function applyUniversalDetailImage(entry) {
  const detailVisual = document.querySelector("#detail-visual");

  if (!detailVisual) {
    return;
  }

  const image = document.createElement("img");

  universalTryImages(
    image,
    universalPokemonDisplayCandidates(entry),
    () => {
      detailVisual.innerHTML = "";
      image.alt = (entry && entry.name ? entry.name : "Entry") + " image";
      detailVisual.appendChild(image);
      detailVisual.classList.add("has-image");
    },
    () => {
      detailVisual.innerHTML = "";
      detailVisual.textContent = entry && entry.visualSymbol ? entry.visualSymbol : "?";
      detailVisual.classList.remove("has-image");
    }
  );
}

function applyUniversalAnatomyImage(entry) {
  const anatomyCard = document.querySelector("#detail-anatomy-card");
  const anatomyImg = document.querySelector("#detail-anatomy-image");
  const anatomyLink = document.querySelector("#detail-anatomy-link");
  const anatomyCaption = document.querySelector("#detail-anatomy-caption");

  if (!anatomyCard || !anatomyImg) {
    return;
  }

  universalTryImages(
    anatomyImg,
    universalPokemonAnatomyCandidates(entry),
    (workingPath) => {
      anatomyImg.alt = (entry && entry.name ? entry.name : "Entry") + " anatomy plate";

      if (anatomyLink) {
        anatomyLink.href = universalCleanImagePath(workingPath);
        anatomyLink.title = "Open full-size anatomy image";
      }

      if (anatomyCaption) {
        anatomyCaption.textContent = (entry && entry.name ? entry.name : "Entry") + " biological anatomy reference. Tap or click the image to open it full-size.";
      }

      anatomyCard.classList.remove("hidden");
    },
    () => {
      anatomyImg.removeAttribute("src");

      if (anatomyLink) {
        anatomyLink.href = "#";
      }

      anatomyCard.classList.add("hidden");
    }
  );
}

function applyUniversalPokemonImages(entry) {
  applyUniversalDetailImage(entry);
  applyUniversalAnatomyImage(entry);
}





