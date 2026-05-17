(() => {
  "use strict";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  let recognition = null;
  let listening = false;
  let hideTimer = null;
  let forcedStopTimer = null;
  let pokemonNamesPromise = null;

  const manualVoiceAliases = {
    "ghastly": "Gastly",
    "gasly": "Gastly",
    "gas lee": "Gastly",
    "gaslee": "Gastly",
    "ghostly": "Gastly",
    "nine tails": "Ninetales",
    "ninetails": "Ninetales",
    "mr mime": "Mr. Mime",
    "mister mime": "Mr. Mime",
    "mime junior": "Mime Jr.",
    "far fetched": "Farfetch'd",
    "farfetchd": "Farfetch'd",
    "sir fetched": "Sirfetch'd",
    "ho oh": "Ho-Oh",
    "hoho": "Ho-Oh",
    "porygon two": "Porygon2",
    "porygon 2": "Porygon2",
    "porygon z": "Porygon-Z",
    "jangmo o": "Jangmo-o",
    "hakamo o": "Hakamo-o",
    "kommo o": "Kommo-o"
  };

  function normalizeKey(text) {
    return (text || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/pokémon/g, "pokemon")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactKey(text) {
    return normalizeKey(text).replace(/\s+/g, "");
  }

  function speechKey(text) {
    let key = compactKey(text);

    key = key
      .replace(/^gh/, "g")
      .replace(/ph/g, "f")
      .replace(/ck/g, "k")
      .replace(/qu/g, "kw")
      .replace(/ee$/, "y")
      .replace(/ie$/, "y")
      .replace(/lee$/, "ly")
      .replace(/leigh$/, "ly");

    return key;
  }

  function cleanTranscript(text) {
    return normalizeKey(text)
      .replace(/\b(pokemon|pokedex)\b/g, "")
      .replace(/^(search for|look up|find|show me|open|pull up|bring up)\s+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function levenshtein(a, b) {
    a = a || "";
    b = b || "";

    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;

        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + cost,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }

    return matrix[b.length][a.length];
  }

  function similarity(a, b) {
    a = a || "";
    b = b || "";

    if (!a || !b) return 0;
    if (a === b) return 1;

    const maxLength = Math.max(a.length, b.length);
    const distance = levenshtein(a, b);

    return 1 - distance / maxLength;
  }

  function extractNamesFromIndex(data) {
    const names = new Set();

    function walk(value) {
      if (!value) return;

      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }

      if (typeof value === "object") {
        if (typeof value.name === "string") names.add(value.name);
        if (typeof value.title === "string") names.add(value.title);
        if (typeof value.displayName === "string") names.add(value.displayName);

        Object.values(value).forEach(walk);
      }
    }

    walk(data);

    return [...names].filter(Boolean);
  }

  async function getPokemonNames() {
    if (pokemonNamesPromise) return pokemonNamesPromise;

    pokemonNamesPromise = fetch("data/entries-index.json?voice=" + Date.now())
      .then(response => response.ok ? response.json() : [])
      .then(data => extractNamesFromIndex(data))
      .catch(() => []);

    return pokemonNamesPromise;
  }

  async function getBestVoiceMatch(spokenText) {
    const cleaned = cleanTranscript(spokenText);
    const aliasKey = normalizeKey(cleaned);
    const aliasCompact = compactKey(cleaned);

    const names = await getPokemonNames();

    const nameLookup = new Map();
    names.forEach(name => {
      nameLookup.set(normalizeKey(name), name);
      nameLookup.set(compactKey(name), name);
      nameLookup.set(speechKey(name), name);
    });

    const aliasTarget = manualVoiceAliases[aliasKey] || manualVoiceAliases[aliasCompact];

    if (aliasTarget) {
      const exactTarget = names.find(name => compactKey(name) === compactKey(aliasTarget));
      return {
        original: cleaned,
        matched: exactTarget || aliasTarget,
        corrected: compactKey(cleaned) !== compactKey(aliasTarget)
      };
    }

    if (nameLookup.has(aliasKey)) {
      return {
        original: cleaned,
        matched: nameLookup.get(aliasKey),
        corrected: false
      };
    }

    if (nameLookup.has(aliasCompact)) {
      return {
        original: cleaned,
        matched: nameLookup.get(aliasCompact),
        corrected: compactKey(cleaned) !== compactKey(nameLookup.get(aliasCompact))
      };
    }

    const spokenNormal = compactKey(cleaned);
    const spokenSpeech = speechKey(cleaned);

    if (spokenNormal.length < 3 || names.length === 0) {
      return {
        original: cleaned,
        matched: cleaned,
        corrected: false
      };
    }

    let best = {
      name: cleaned,
      score: 0
    };

    for (const name of names) {
      const nameNormal = compactKey(name);
      const nameSpeech = speechKey(name);

      let score = Math.max(
        similarity(spokenNormal, nameNormal),
        similarity(spokenSpeech, nameSpeech)
      );

      if (nameNormal.startsWith(spokenNormal) || spokenNormal.startsWith(nameNormal)) {
        score = Math.max(score, 0.88);
      }

      if (spokenNormal[0] === nameNormal[0]) {
        score += 0.04;
      }

      if (score > best.score) {
        best = { name, score };
      }
    }

    const threshold = spokenNormal.length <= 4 ? 0.82 : 0.68;

    if (best.score >= threshold) {
      return {
        original: cleaned,
        matched: best.name,
        corrected: compactKey(cleaned) !== compactKey(best.name)
      };
    }

    return {
      original: cleaned,
      matched: cleaned,
      corrected: false
    };
  }

  function findSearchInput() {
    const inputs = [...document.querySelectorAll("input")];

    return inputs.find((input) => {
      const haystack = [
        input.type,
        input.id,
        input.name,
        input.className,
        input.placeholder,
        input.getAttribute("aria-label")
      ].join(" ").toLowerCase();

      return haystack.includes("search") ||
        haystack.includes("pokemon") ||
        haystack.includes("pokémon") ||
        haystack.includes("pokedex") ||
        haystack.includes("pokédex");
    }) || document.querySelector("input[type='search']") || document.querySelector("input") || null;
  }

  function setInputValue(input, value) {
    input.focus();

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      input.value = value;
    }

    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      composed: true,
      inputType: "insertText",
      data: value
    }));

    input.dispatchEvent(new Event("change", { bubbles: true }));

    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: value.slice(-1) || "a",
      bubbles: true
    }));

    input.dispatchEvent(new KeyboardEvent("keyup", {
      key: value.slice(-1) || "a",
      bubbles: true
    }));
  }

  function submitSearch(input) {
    const form = input.closest("form");

    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }

    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true
    }));

    input.dispatchEvent(new KeyboardEvent("keyup", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true
    }));
  }

  function setStatus(status, text, stayVisible = false) {
    status.textContent = text;
    status.classList.add("show");

    clearTimeout(hideTimer);

    if (!stayVisible) {
      hideTimer = setTimeout(() => {
        status.classList.remove("show");
      }, 6500);
    }
  }

  function injectStyles() {
    if (document.getElementById("field-pokedex-voice-search-style")) return;

    const style = document.createElement("style");
    style.id = "field-pokedex-voice-search-style";
    style.textContent = `
      .voice-search-button {
        margin-left: .45rem;
        min-width: 2.6rem;
        min-height: 2.6rem;
        border-radius: 999px;
        border: 1px solid rgba(171, 255, 171, .45);
        background: radial-gradient(circle at 35% 25%, rgba(211, 255, 211, .95), rgba(46, 122, 58, .95) 45%, rgba(16, 45, 20, .98));
        color: #071407;
        font-size: 1.1rem;
        font-weight: 900;
        cursor: pointer;
        box-shadow: 0 0 0 .12rem rgba(157, 255, 157, .16), 0 0 1rem rgba(88, 255, 118, .22);
        vertical-align: middle;
      }

      .voice-search-button.listening {
        animation: voicePulse 1s ease-in-out infinite;
        background: radial-gradient(circle at 35% 25%, #ffffff, #82ff8f 42%, #145d24);
      }

      .voice-search-status {
        display: inline-block;
        margin-left: .5rem;
        padding: .25rem .55rem;
        border-radius: 999px;
        background: rgba(8, 29, 11, .94);
        color: #d8ffd8;
        border: 1px solid rgba(166, 255, 166, .25);
        font-size: .8rem;
        opacity: 0;
        transform: translateY(-2px);
        transition: opacity .2s ease, transform .2s ease;
        pointer-events: none;
      }

      .voice-search-status.show {
        opacity: 1;
        transform: translateY(0);
      }

      @keyframes voicePulse {
        0%, 100% {
          box-shadow: 0 0 0 .12rem rgba(157, 255, 157, .2), 0 0 1rem rgba(88, 255, 118, .35);
        }
        50% {
          box-shadow: 0 0 0 .35rem rgba(157, 255, 157, .08), 0 0 2rem rgba(88, 255, 118, .7);
        }
      }

      @media (max-width: 520px) {
        .voice-search-button {
          min-width: 2.4rem;
          min-height: 2.4rem;
          margin-left: .35rem;
        }

        .voice-search-status {
          display: block;
          width: fit-content;
          margin-top: .4rem;
          margin-left: 0;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function buildRecognition(button, status, input) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      listening = true;
      button.classList.add("listening");
      setStatus(status, "Listening. Say a Pokémon name...", true);

      clearTimeout(forcedStopTimer);
      forcedStopTimer = setTimeout(() => {
        try {
          if (listening) recognition.stop();
        } catch {}
      }, 8000);
    };

    recognition.onend = () => {
      listening = false;
      button.classList.remove("listening");
      clearTimeout(forcedStopTimer);
    };

    recognition.onerror = (event) => {
      clearTimeout(forcedStopTimer);

      if (event.error === "no-speech") {
        setStatus(status, "I did not hear anything.");
      } else if (event.error === "not-allowed") {
        setStatus(status, "Microphone permission is blocked.");
      } else if (event.error === "network") {
        setStatus(status, "Speech recognition network error.");
      } else {
        setStatus(status, "Voice error: " + event.error);
      }
    };

    recognition.onresult = (event) => {
      let bestTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];

        for (let a = 0; a < result.length; a++) {
          const candidate = result[a].transcript || "";

          if (candidate.trim().length > bestTranscript.trim().length) {
            bestTranscript = candidate;
          }
        }
      }

      if (!bestTranscript.trim()) {
        setStatus(status, "I heard something, but not words.");
        return;
      }

      getBestVoiceMatch(bestTranscript).then(match => {
        const query = match.matched;

        if (!query) {
          setStatus(status, "I heard something, but not a usable Pokémon name.");
          return;
        }

        if (match.corrected) {
          setStatus(status, "Heard: " + match.original + "  >  " + query);
        } else {
          setStatus(status, "Heard: " + query);
        }

        const currentInput = findSearchInput() || input;
        setInputValue(currentInput, query);

        setTimeout(() => {
          submitSearch(currentInput);
        }, 150);

        try {
          recognition.stop();
        } catch {}
      });
    };
  }

  function attachVoiceSearch() {
    const input = findSearchInput();

    if (!input || document.querySelector(".voice-search-button")) return;

    injectStyles();

    const button = document.createElement("button");
    button.type = "button";
    button.className = "voice-search-button";
    button.title = "Search Pokémon by voice";
    button.setAttribute("aria-label", "Search Pokémon by voice");
    button.textContent = "🎙️";

    const status = document.createElement("span");
    status.className = "voice-search-status";
    status.setAttribute("aria-live", "polite");

    input.insertAdjacentElement("afterend", status);
    input.insertAdjacentElement("afterend", button);

    if (!SpeechRecognition) {
      button.disabled = true;
      button.title = "Voice search is not supported in this browser";
      setStatus(status, "Voice search not supported here.");
      return;
    }

    buildRecognition(button, status, input);

    button.addEventListener("click", () => {
      try {
        if (listening) {
          recognition.stop();
        } else {
          buildRecognition(button, status, input);
          recognition.start();
        }
      } catch {
        setStatus(status, "Voice search is already starting.");
      }
    });
  }

  getPokemonNames();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachVoiceSearch);
  } else {
    attachVoiceSearch();
  }

  window.addEventListener("hashchange", () => setTimeout(attachVoiceSearch, 150));

  const observer = new MutationObserver(() => attachVoiceSearch());
  observer.observe(document.body, { childList: true, subtree: true });
})();
