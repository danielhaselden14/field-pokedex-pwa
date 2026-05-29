(function () {
  let currentDossierEntry = null;
  let currentDossierData = null;
  let previousDossierScreen = "detail";

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function normalizeElementTypeLocal(typeName) {
    if (typeof normalizeElementType === "function") {
      return normalizeElementType(typeName);
    }

    return slugify(typeName).replace(/-type$/, "");
  }

  function clean(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.filter(Boolean).join(", ");
    if (typeof value === "object") return Object.values(value).filter(Boolean).join(", ");
    return String(value);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function markdownLite(value) {
    return escapeHtml(value)
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  function getEntryName(entry) {
    return clean(entry.name || entry.title || entry.commonName || entry.speciesName || entry.id || "Unknown Entry");
  }

  function getEntryNumber(entry) {
    return clean(entry.pokedexNumber || entry.number || entry.entryNumber || "");
  }

  function getEntryType(entry) {
    const typeText = clean(entry.elementType || entry.type || entry.types || "");
    return typeText;
  }

  function getEntryImage(entry) {
    return clean(entry.image || entry.imagePath || entry.sprite || entry.profileImage || "");
  }

  function getEntryAnatomy(entry) {
    return clean(entry.anatomyImage || entry.anatomyImagePath || entry.anatomy || entry.anatomyPlate || "");
  }

  function getDossierPath(entry) {
    if (entry.dossierPath) return entry.dossierPath;

    const id = slugify(entry.id || entry.entryId || entry.name);
    const name = slugify(entry.name || entry.title || entry.id);

    return "data/dossiers/" + (name || id) + "-dossier.json";
  }

  async function tryFetchJson(path) {
    try {
      const response = await fetch(path + (path.includes("?") ? "&" : "?") + "v=" + Date.now(), {
        cache: "no-store"
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  function buildFallbackDossier(entry) {
    const sections = [];

    if (entry.lore) {
      sections.push({
        title: "Dark Lore",
        type: "prose",
        content: entry.lore
      });
    }

    if (entry.originStory) {
      sections.push({
        title: "Origin Story",
        type: "prose",
        content: entry.originStory
      });
    }

    if (!sections.length) return null;

    return {
      id: slugify(entry.name || entry.id) + "-fallback-dossier",
      title: getEntryName(entry) + " Field Dossier",
      subtitle: "Expanded lore and historical record",
      sections
    };
  }

  async function getDossierForEntry(entry) {
    const path = getDossierPath(entry);
    const dossier = await tryFetchJson(path);

    if (dossier) {
      dossier.__path = path;
      return dossier;
    }

    return buildFallbackDossier(entry);
  }

  function ensureDossierButton(entry, dossier) {
    const favoriteButton = document.querySelector("#favorite-entry-button");
    const overview = document.querySelector("#detail-overview");

    document.querySelectorAll(".dossier-open-button").forEach((button) => button.remove());

    if (!entry || !dossier || !overview) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "dossier-open-button";
    button.textContent = "Open Field Dossier";

    button.addEventListener("click", () => {
      openDossierScreen(entry, dossier);
    });

    if (favoriteButton && favoriteButton.parentElement) {
      favoriteButton.insertAdjacentElement("afterend", button);
    } else {
      overview.appendChild(button);
    }

    softenMainLoreIfDossierExists();
  }

  function softenMainLoreIfDossierExists() {
    const lore = document.querySelector("#detail-lore");
    const origin = document.querySelector("#detail-origin-story");

    if (lore && lore.textContent.trim().length > 200) {
      lore.textContent = "Full lore record available in the Field Dossier.";
    }

    if (origin && origin.textContent.trim().length > 200) {
      origin.textContent = "Full historical origin record available in the Field Dossier.";
    }
  }

  function showScreenLocal(screenName) {
    if (typeof showScreen === "function") {
      showScreen(screenName);
      return;
    }

    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active-screen");
    });

    const screen = document.querySelector("#" + screenName + "-screen");
    if (screen) screen.classList.add("active-screen");
  }

  function clearDossierTheme() {
    const screen = document.querySelector("#dossier-screen");
    if (!screen) return;

    Array.from(screen.classList).forEach((className) => {
      if (className.startsWith("type-")) {
        screen.classList.remove(className);
      }
    });
  }

  function applyDossierTheme(entry) {
    const screen = document.querySelector("#dossier-screen");
    if (!screen) return;

    clearDossierTheme();

    const rawType = clean(entry.elementType || entry.type || (entry.types && entry.types[0]) || "");
    const firstType = rawType.split(/[\/,| ]+/).filter(Boolean)[0];
    const safeType = normalizeElementTypeLocal(firstType);

    if (safeType) {
      screen.classList.add("type-" + safeType);
    }
  }

  function renderHero(entry, dossier) {
    const hero = document.querySelector("#dossier-hero");
    if (!hero) return;

    const title = dossier.title || getEntryName(entry) + " Field Dossier";
    const subtitle = dossier.subtitle || "Expanded field record";
    const warning = dossier.warning || dossier.classification || "";

    hero.innerHTML = `
      <p class="eyebrow">Field Dossier</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(subtitle)}</p>
      <div class="dossier-meta">
        ${getEntryNumber(entry) ? `<span class="dossier-pill">${escapeHtml(getEntryNumber(entry))}</span>` : ""}
        ${getEntryType(entry) ? `<span class="dossier-pill">${escapeHtml(getEntryType(entry))}</span>` : ""}
        ${warning ? `<span class="dossier-pill">${escapeHtml(warning)}</span>` : ""}
      </div>
    `;
  }

  function renderImages(entry) {
    const wrap = document.querySelector("#dossier-media");
    if (!wrap) return;

    const mainImage = getEntryImage(entry);
    const anatomyImage = getEntryAnatomy(entry);

    wrap.innerHTML = "";

    if (mainImage) {
      const card = document.createElement("article");
      card.className = "dossier-image-card";
      card.innerHTML = `
        <h3>Field Image</h3>
        <a href="${escapeHtml(mainImage)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(mainImage)}?v=${Date.now()}" alt="${escapeHtml(getEntryName(entry))}">
        </a>
        <p>Tap or click to open full-size.</p>
      `;
      wrap.appendChild(card);
    }

    if (anatomyImage) {
      const card = document.createElement("article");
      card.className = "dossier-image-card";
      card.innerHTML = `
        <h3>Biological Anatomy Plate</h3>
        <a href="${escapeHtml(anatomyImage)}" target="_blank" rel="noopener">
          <img src="${escapeHtml(anatomyImage)}?v=${Date.now()}" alt="${escapeHtml(getEntryName(entry))} anatomy plate">
        </a>
        <p>Tap or click to open full-size.</p>
      `;
      wrap.appendChild(card);
    }
  }

  function renderEvolution(entry) {
    const card = document.querySelector("#dossier-evolution");
    if (!card) return;

    const tree = entry.evolutionTree || null;
    const mainLine = tree && Array.isArray(tree.mainLine) ? tree.mainLine : [];

    if (!mainLine.length) {
      card.innerHTML = `<h3>Evolution Record</h3><p class="dossier-empty">No evolution record listed for this entry.</p>`;
      return;
    }

    card.innerHTML = `
      <h3>${escapeHtml(tree.familyName || "Evolution Record")}</h3>
      <div class="dossier-evolution-line">
        ${mainLine.map((node) => {
          const types = Array.isArray(node.types) ? node.types.join(" / ") : clean(node.types);
          return `
            <section class="dossier-evolution-node">
              <h4>${escapeHtml(node.name || "Unknown")}</h4>
              <p><strong>Stage:</strong> ${escapeHtml(node.stage || "Unknown")}</p>
              ${types ? `<p><strong>Type:</strong> ${escapeHtml(types)}</p>` : ""}
              ${node.methodToNext ? `<p><strong>Next Trigger:</strong> ${escapeHtml(node.methodToNext)}</p>` : ""}
              ${node.note ? `<p>${escapeHtml(node.note)}</p>` : ""}
            </section>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderSection(section) {
    const card = document.createElement("article");
    card.className = "dossier-section-card";

    const title = section.title || "Dossier Section";
    const type = section.type || section.kind || "prose";

    if (type === "timeline" && Array.isArray(section.items)) {
      card.innerHTML = `
        <h3>${escapeHtml(title)}</h3>
        <div class="dossier-timeline">
          ${section.items.map((item) => `
            <div class="dossier-timeline-item">
              <span class="dossier-timeline-date">${escapeHtml(item.date || item.year || "")}</span>
              <div>${markdownLite(item.text || item.description || "")}</div>
            </div>
          `).join("")}
        </div>
      `;
      return card;
    }

    if ((type === "list" || type === "rules") && Array.isArray(section.items)) {
      card.innerHTML = `
        <h3>${escapeHtml(title)}</h3>
        <ul class="dossier-list">
          ${section.items.map((item) => `<li>${markdownLite(clean(item))}</li>`).join("")}
        </ul>
      `;
      return card;
    }

    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <div class="dossier-prose">${markdownLite(section.content || section.text || "")}</div>
    `;

    return card;
  }

  function renderSections(dossier) {
    const list = document.querySelector("#dossier-sections");
    if (!list) return;

    list.innerHTML = "";

    const sections = Array.isArray(dossier.sections) ? dossier.sections : [];

    if (!sections.length) {
      list.innerHTML = `<article class="dossier-section-card"><h3>No dossier sections found</h3><p class="dossier-empty">Add sections to this entry's dossier JSON file.</p></article>`;
      return;
    }

    sections.forEach((section) => {
      list.appendChild(renderSection(section));
    });
  }

  function openDossierScreen(entry, dossier) {
    currentDossierEntry = entry;
    currentDossierData = dossier;

    applyDossierTheme(entry);
    renderHero(entry, dossier);
    renderImages(entry);
    renderEvolution(entry);
    renderSections(dossier);

    showScreenLocal("dossier");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function setupForCurrentEntry(entry) {
    if (!entry) return;

    currentDossierEntry = entry;
    const dossier = await getDossierForEntry(entry);
    currentDossierData = dossier;

    ensureDossierButton(entry, dossier);
  }

  function wrapOpenEntryDetail() {
    if (typeof openEntryDetail !== "function") {
      setTimeout(wrapOpenEntryDetail, 250);
      return;
    }

    if (openEntryDetail.__dossierWrapped) return;

    const originalOpenEntryDetail = openEntryDetail;

    openEntryDetail = async function (entry) {
      let fullEntry = entry;

      try {
        if (typeof loadFullEntry === "function") {
          fullEntry = await loadFullEntry(entry);
        }
      } catch (error) {
        fullEntry = entry;
      }

      const result = await originalOpenEntryDetail.call(this, entry);

      setTimeout(() => setupForCurrentEntry(fullEntry), 150);
      setTimeout(() => setupForCurrentEntry(fullEntry), 600);

      return result;
    };

    openEntryDetail.__dossierWrapped = true;
  }

  function setupBackButtons() {
    document.addEventListener("click", (event) => {
      const back = event.target.closest("[data-dossier-back]");
      if (!back) return;

      event.preventDefault();
      showScreenLocal(previousDossierScreen);
      setTimeout(() => setupForCurrentEntry(currentDossierEntry), 100);
    });
  }

  function init() {
    wrapOpenEntryDetail();
    setupBackButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.fieldDossierSystem = {
    open: openDossierScreen,
    getCurrentEntry: () => currentDossierEntry,
    getCurrentDossier: () => currentDossierData
  };
})();
