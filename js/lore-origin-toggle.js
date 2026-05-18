(function () {
  const CARD_SELECTORS = [
    "section",
    "article",
    ".card",
    ".detail-card",
    ".entry-card",
    ".info-card",
    ".field-card",
    ".data-card",
    ".panel",
    ".content-card"
  ].join(",");

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

  function clean(value) {
    return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getTargetLabel(card) {
    const heading = card.querySelector(HEADING_SELECTORS);
    if (!heading) return null;

    const text = clean(heading.textContent);

    if (text === "lore" || text.includes("lore")) return "lore";
    if (text === "origin story" || text.includes("origin story")) return "origin story";

    return null;
  }

  function unwrapOld(card) {
    const oldWrapper = card.querySelector(".lore-origin-collapse-content");
    if (!oldWrapper) return;

    while (oldWrapper.firstChild) {
      oldWrapper.parentNode.insertBefore(oldWrapper.firstChild, oldWrapper);
    }

    oldWrapper.remove();

    card.querySelectorAll(".lore-origin-toggle").forEach(function (btn) {
      btn.remove();
    });

    delete card.dataset.loreOriginEnhanced;
  }

  function enhanceCard(card) {
    if (!card || card.dataset.loreOriginEnhanced === "true") return;
    if (card.closest("nav, header, footer")) return;

    const label = getTargetLabel(card);
    if (!label) return;

    const heading = card.querySelector(HEADING_SELECTORS);
    if (!heading) return;

    const fullText = clean(card.textContent);
    if (fullText.length < 280) return;

    unwrapOld(card);

    const wrapper = document.createElement("div");
    wrapper.className = "lore-origin-collapse-content is-collapsed";

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
    button.className = "lore-origin-toggle";
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
    card.dataset.loreOriginEnhanced = "true";
  }

  function enhanceAll() {
    document.querySelectorAll(CARD_SELECTORS).forEach(enhanceCard);
  }

  let timer = null;
  function scheduleEnhance() {
    clearTimeout(timer);
    timer = setTimeout(enhanceAll, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceAll);
  } else {
    enhanceAll();
  }

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
