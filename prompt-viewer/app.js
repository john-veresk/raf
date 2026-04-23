/* RAF Prompt Dossier · viewer
 * Reads window.RAF_PROMPTS (produced by generate.mjs) and renders the
 * selected mode + variant with per-section colour coding.
 */
(function () {
  "use strict";

  const data = window.RAF_PROMPTS;
  if (!data) {
    document.body.innerHTML =
      '<p style="padding:40px;font-family:monospace">prompts-data.js not loaded · run <code>node prompt-viewer/generate.mjs</code></p>';
    return;
  }

  /* ---------- section categories (drive the colour coding) ---------- */
  // Each pattern is matched (case-insensitive) against heading text.
  // Order matters: first match wins.
  const SECTION_CATS = [
    { key: "commit",      label: "Git / outcome file",    cssVar: "--sec-commit",  pattern: /git instructions|write outcome file/i },
    { key: "retry",       label: "Retry context",         cssVar: "--sec-retry",   pattern: /retry context/i },
    { key: "deps",        label: "Dependency context",    cssVar: "--sec-deps",    pattern: /dependency context|^task \d+$/i },
    { key: "principles",  label: "Planning principles",   cssVar: "--sec-pass",    pattern: /planning principles/i },
    { key: "template",    label: "Plan template",         cssVar: "--sec-plan",    pattern: /plan template|frontmatter fields|template fields/i },
    { key: "risks",       label: "Failure / warnings",    cssVar: "--sec-risk",    pattern: /on failure|risks|warnings/i },
    { key: "rules",       label: "Rules / dependencies",  cssVar: "--sec-rule",    pattern: /^rules$|dependency rules|^dependencies$/i },
    { key: "workflow",    label: "Workflow steps",        cssVar: "--sec-flow",    pattern: /workflow|explore the codebase|interview the user|create plan files|confirm completion|^instructions$|step \d|your mission/i },
    { key: "location",    label: "Project / task header", cssVar: "--sec-code",    pattern: /project location|task information|amendment mode/i },
    { key: "existing",    label: "Existing tasks",        cssVar: "--sec-code",    pattern: /existing tasks|protected \(completed\)|modifiable/i },
    { key: "context",     label: "Project context",       cssVar: "--sec-context", pattern: /project context/i },
  ];

  const DEFAULT_CAT = {
    key: "body",
    label: "Body",
    cssVar: "--ink-soft",
  };

  function categorize(heading) {
    for (const cat of SECTION_CATS) {
      if (cat.pattern.test(heading)) return cat;
    }
    return DEFAULT_CAT;
  }

  /* ---------- text → annotated HTML ---------- */
  function escape(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function revealWhitespace(s) {
    // Wrap tabs and trailing spaces for the "reveal whitespace" toggle.
    return s
      .replace(/\t/g, '<span class="ws-tab">\t</span>')
      .replace(/( +)(?=\n|$)/g, (m) => `<span class="ws-space">${m}</span>`);
  }

  // Annotate a prompt string as HTML with per-line section tagging.
  // Returns { html, counts: {catKey: lineCount} }
  function annotate(text) {
    const lines = text.split("\n");
    const counts = {};
    let currentCat = DEFAULT_CAT;
    let inFence = false;
    const out = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const headingMatch = !inFence && /^(#{1,4})\s+(.+?)\s*$/.exec(raw);
      const fenceMatch = /^```/.test(raw);

      let lineCat = currentCat;
      let headingHere = false;

      if (headingMatch) {
        const headingText = headingMatch[2];
        currentCat = categorize(headingText);
        lineCat = currentCat;
        headingHere = true;
      } else if (fenceMatch) {
        inFence = !inFence;
      }

      counts[lineCat.key] = (counts[lineCat.key] || 0) + 1;

      const styleVars = `--m-fg: var(${lineCat.cssVar}); --m-bg: ${hexToRgba(
        cssVarToHex(lineCat.cssVar),
        0.08,
      )};`;

      const markClass = headingHere
        ? "mark mark--heading"
        : fenceMatch
          ? "mark mark--codefence"
          : inFence || isLineInCategory(raw, lineCat)
            ? "mark mark--block"
            : "mark";

      const rendered = revealWhitespace(escape(raw === "" ? " " : raw));

      out.push(
        `<span class="line" data-section="${lineCat.key}"><span class="${markClass}" style="${styleVars}">${rendered}</span></span>`,
      );
    }

    return { html: out.join("\n"), counts };
  }

  // Give blank lines the same background as their section (keeps the coloured
  // strip continuous). Currently every line gets .mark--block when non-heading
  // and not in fence; this helper is a hook for future refinement.
  function isLineInCategory(_raw, _cat) {
    return true;
  }

  /* ---------- colour variable helpers ---------- */
  // Resolve a --sec-* variable to its computed hex so we can derive
  // a translucent background without another CSS variable.
  const _cssVarCache = {};
  function cssVarToHex(name) {
    if (_cssVarCache[name]) return _cssVarCache[name];
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    _cssVarCache[name] = v || "#141210";
    return _cssVarCache[name];
  }

  function hexToRgba(hex, alpha) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return `rgba(20,18,16,${alpha})`;
    const r = parseInt(m[1], 16);
    const g = parseInt(m[2], 16);
    const b = parseInt(m[3], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* ---------- state ---------- */
  const state = {
    modeKey: "planning",
    variantKey: null, // resolved on mode change
    muted: new Set(),
    soloed: null,
  };

  /* ---------- DOM refs ---------- */
  const $ = (id) => document.getElementById(id);
  const modeTabs = $("mode-tabs");
  const variantList = $("variant-list");
  const legend = $("legend");
  const meta = $("meta");
  const kicker = $("mode-kicker");
  const headline = $("mode-headline");
  const deck = $("mode-deck");
  const systemPart = $("system-part");
  const userPart = $("user-part");
  const systemBody = $("system-body");
  const userBody = $("user-body");
  const systemStats = $("system-stats");
  const userStats = $("user-stats");

  /* ---------- render ---------- */
  function renderModeTabs() {
    const keys = Object.keys(data.modes);
    modeTabs.innerHTML = keys
      .map((k, i) => {
        const m = data.modes[k];
        const n = String(i + 1).padStart(2, "0");
        return `<button class="mode-tab" role="tab" data-mode="${k}" aria-selected="${
          k === state.modeKey
        }"><span class="mode-tab__num">No. ${n}</span>${m.label}</button>`;
      })
      .join("");
    modeTabs.querySelectorAll(".mode-tab").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });
  }

  function setMode(key) {
    state.modeKey = key;
    const first = Object.keys(data.modes[key].variants)[0];
    state.variantKey = first;
    state.muted = new Set();
    state.soloed = null;
    modeTabs.querySelectorAll(".mode-tab").forEach((b) => {
      b.setAttribute("aria-selected", b.dataset.mode === key);
    });
    renderVariants();
    renderMeta();
    renderDossier();
  }

  function renderVariants() {
    const mode = data.modes[state.modeKey];
    const entries = Object.entries(mode.variants);
    variantList.innerHTML = entries
      .map(([key, v], i) => {
        const n = String(i + 1).padStart(2, "0");
        return `<button class="variant-btn" data-variant="${key}" aria-pressed="${
          key === state.variantKey
        }"><span class="variant-btn__ordinal">${n}</span><span>${v.label}</span></button>`;
      })
      .join("");
    variantList.querySelectorAll(".variant-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.variantKey = btn.dataset.variant;
        variantList.querySelectorAll(".variant-btn").forEach((b) => {
          b.setAttribute("aria-pressed", b.dataset.variant === state.variantKey);
        });
        renderDossier();
      });
    });
  }

  function renderMeta() {
    const s = data.sample;
    const rows = [
      ["Project", s.projectPath],
      ["Mode", data.modes[state.modeKey].label],
      ["Source", "src/prompts/" + state.modeKey + ".ts"],
    ];
    meta.innerHTML = rows
      .map(
        ([k, v]) =>
          `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`,
      )
      .join("");
  }

  function renderDossier() {
    const mode = data.modes[state.modeKey];
    const variant = mode.variants[state.variantKey];

    kicker.textContent = `${mode.label} · ${variant.label}`;
    headline.textContent = titleFor(state.modeKey, state.variantKey);
    deck.textContent = mode.description;

    // system prompt (optional — execution has only userMessage)
    const hasSystem = typeof variant.systemPrompt === "string" && variant.systemPrompt.length > 0;
    if (hasSystem) {
      systemPart.style.display = "";
      const { html, counts: sysCounts } = annotate(variant.systemPrompt);
      systemBody.innerHTML = html;
      systemStats.textContent = statsLine(variant.systemPrompt);
      var allCounts = sysCounts;
    } else {
      systemPart.style.display = "none";
      var allCounts = {};
    }

    const { html: userHtml, counts: userCounts } = annotate(variant.userMessage);
    userBody.innerHTML = userHtml;
    userStats.textContent = statsLine(variant.userMessage);

    // merge counts
    for (const k in userCounts) {
      allCounts[k] = (allCounts[k] || 0) + userCounts[k];
    }

    renderLegend(allCounts);
    applySectionFilters();
  }

  function titleFor(modeKey, variantKey) {
    const titles = {
      planning: "Teach Claude the planning discipline.",
      execution: "Hand one task, with its context, to the executor.",
      amend: "Fold new work into a project already underway.",
    };
    return titles[modeKey] || data.modes[modeKey].label;
  }

  function statsLine(text) {
    const lines = text.split("\n").length;
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return `${lines.toLocaleString()} lines · ${words.toLocaleString()} words · ${chars.toLocaleString()} chars`;
  }

  function renderLegend(counts) {
    // Show every cat that appears in the prompt, plus body.
    const cats = [...SECTION_CATS, DEFAULT_CAT].filter(
      (c) => counts[c.key] > 0,
    );
    legend.innerHTML = cats
      .map((c) => {
        const hex = cssVarToHex(c.cssVar || "--ink");
        const muted = state.muted.has(c.key);
        const solo = state.soloed === c.key;
        return `<li class="legend__item" data-cat="${c.key}" data-muted="${muted}" data-solo="${solo}" style="--swatch: ${hex}">
          <span class="legend__swatch"></span>
          <span>${escape(c.label)}</span>
          <span class="legend__count">${counts[c.key]}</span>
        </li>`;
      })
      .join("");

    legend.querySelectorAll(".legend__item").forEach((li) => {
      // click → toggle mute; shift-click or long-press → solo
      li.addEventListener("click", (ev) => {
        const key = li.dataset.cat;
        if (ev.shiftKey || ev.altKey) {
          state.soloed = state.soloed === key ? null : key;
        } else {
          if (state.muted.has(key)) state.muted.delete(key);
          else state.muted.add(key);
        }
        renderLegend(counts);
        applySectionFilters();
      });
      li.addEventListener("dblclick", () => {
        state.soloed = state.soloed === li.dataset.cat ? null : li.dataset.cat;
        renderLegend(counts);
        applySectionFilters();
      });
    });
  }

  function applySectionFilters() {
    const bodies = [systemBody, userBody];
    bodies.forEach((body) => {
      body.querySelectorAll(".line").forEach((el) => {
        const key = el.dataset.section;
        const mutedByToggle = state.muted.has(key);
        const mutedBySolo = state.soloed && state.soloed !== key;
        el.classList.toggle("muted", mutedByToggle || mutedBySolo);
      });
    });
  }

  /* ---------- view toggles ---------- */
  $("toggle-wrap").addEventListener("change", (e) => {
    document.body.classList.toggle("no-wrap", !e.target.checked);
  });
  $("toggle-whitespace").addEventListener("change", (e) => {
    document.body.classList.toggle("show-ws", e.target.checked);
  });
  $("toggle-linenos").addEventListener("change", (e) => {
    document.body.classList.toggle("show-linenos", e.target.checked);
  });

  /* ---------- boot ---------- */
  function boot() {
    // Masthead metadata
    const d = new Date(data.generatedAt);
    $("generated-at").textContent = d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    $("issue-no").textContent = String(
      Object.values(data.modes).reduce(
        (acc, m) => acc + Object.keys(m.variants).length,
        0,
      ),
    ).padStart(3, "0");

    state.variantKey = Object.keys(data.modes[state.modeKey].variants)[0];
    renderModeTabs();
    renderVariants();
    renderMeta();
    renderDossier();
  }

  boot();
})();
