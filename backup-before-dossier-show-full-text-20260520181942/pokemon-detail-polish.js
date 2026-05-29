(function () {
  const HEADING_SELECTORS = [
    "h1",
    "h2",
    "h3",
    "h4",
    ".card-title",
    ".section-title",
    ".detail-title",
    ".panel-title",
    ".entry-title"
  ].join(",");

  const CARD_SELECTORS = [
    ".card",
    ".detail-card",
    ".entry-card",
    ".info-card",
    ".field-card",
    ".data-card",
    ".panel",
    ".content-card",
    ".type-card",
    ".pokemon-card",
    ".detail-section",
    ".entry-section",
    "section",
    "article"
  ].join(",");

  function clean(value) {
    return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function isTargetHeading(text) {
    const value = clean(text);
    return value === "lore" || value === "origin story" || value === "origins";
  }

  function isRelatedHeading(text) {
    const value = clean(text);
    return value === "related entries" || value === "related entry" || value === "related";
  }

  function cardHasMultipleMainHeadings(card) {
    const headings = Array.from(card.querySelectorAll(HEADING_SELECTORS));
    const matches = headings.filter(function (heading) {
      const text = clean(heading.textContent);
      return isTargetHeading(text) || isRelatedHeading(text);
    });

    return matches.length > 1;
  }

  function findCardForHeading(heading) {
    let card = heading.closest(CARD_SELECTORS);

    if (!card) {
      card = heading.parentElement;
    }

    if (!card) return null;

    if (cardHasMultipleMainHeadings(card) && heading.parentElement) {
      card = heading.parentElement;
    }

    return card;
  }

  function unwrapExisting(card) {
    const oldWrapper = card.querySelector(".pokedex-collapse-content");
    if (oldWrapper) {
      while (oldWrapper.firstChild) {
        oldWrapper.parentNode.insertBefore(oldWrapper.firstChild, oldWrapper);
      }
      oldWrapper.remove();
    }

    card.querySelectorAll(".pokedex-collapse-toggle").forEach(function (button) {
      button.remove();
    });

    delete card.dataset.pokedexCollapseEnhanced;
  }

  function enhanceLoreOrOrigin(heading) {
    if (!isTargetHeading(heading.textContent)) return;

    const card = findCardForHeading(heading);
    if (!card) return;
    if (card.dataset.pokedexCollapseEnhanced === "true") return;
    if (card.closest("nav, header, footer")) return;

    const fullText = clean(card.textContent);
    if (fullText.length < 260) return;

    unwrapExisting(card);

    const wrapper = document.createElement("div");
    wrapper.className = "pokedex-collapse-content is-collapsed";

    let node = heading.nextSibling;
    const nodesToMove = [];

    while (node) {
      const next = node.nextSibling;
      nodesToMove.push(node);
      node = next;
    }

    nodesToMove.forEach(function (child) {
      wrapper.appendChild(child);
    });

    card.appendChild(wrapper);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pokedex-collapse-toggle";
    button.textContent = "Show more";

    button.addEventListener("click", function () {
      const expanded = wrapper.classList.toggle("is-expanded");
      wrapper.classList.toggle("is-collapsed", !expanded);
      button.textContent = expanded ? "Show less" : "Show more";

      if (!expanded) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    card.appendChild(button);
    card.dataset.pokedexCollapseEnhanced = "true";
  }

  function hideRelatedEntries(heading) {
    if (!isRelatedHeading(heading.textContent)) return;

    const card = findCardForHeading(heading);
    if (!card) return;
    if (card.closest("nav, header, footer")) return;

    card.classList.add("pokedex-related-hidden");
    card.setAttribute("hidden", "hidden");
  }

  function polishPokemonDetailScreens() {
    const headings = Array.from(document.querySelectorAll(HEADING_SELECTORS));

    headings.forEach(function (heading) {
      hideRelatedEntries(heading);
    });

    headings.forEach(function (heading) {
      enhanceLoreOrOrigin(heading);
    });
  }

  let timer = null;

  function schedulePolish() {
    clearTimeout(timer);
    timer = setTimeout(polishPokemonDetailScreens, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", polishPokemonDetailScreens);
  } else {
    polishPokemonDetailScreens();
  }

  window.addEventListener("hashchange", schedulePolish);
  window.addEventListener("popstate", schedulePolish);

  const observer = new MutationObserver(schedulePolish);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();

