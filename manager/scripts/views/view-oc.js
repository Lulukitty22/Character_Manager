/**
 * view-oc.js
 * Renders an Original Character or Roblox OC profile sheet as an HTML string.
 * Covers both the "oc" and "roblox_oc" character types.
 *
 * Exports: ViewOc.buildHTML(characterData) → HTML string
 */

const ViewOc = (() => {

  // ─── Public Entry Point ──────────────────────────────────────────────────────

  function buildHTML(character) {
    const identity   = character.identity   || {};
    const appearance = character.appearance || {};
    const spells     = character.spells     || [];
    const spellSlots = character.spellSlots || {};
    const abilities  = character.abilities  || [];
    const inventory  = character.inventory  || [];
    const currency   = character.currency   || {};
    const resources  = character.customResources || [];
    const roblox     = character.roblox     || null;
    const type       = character.type       || "oc";
    const isRoblox   = type === "roblox_oc";

    return `
      <div class="sheet-root sheet-oc ${isRoblox ? "sheet-roblox" : ""}">
        ${renderHeader(character, identity, isRoblox)}
        ${renderAppearance(identity, appearance)}
        ${renderPersonality(character)}
        ${renderBackstory(character)}
        ${isRoblox && roblox ? renderRobloxSection(roblox) : ""}
        ${spells.length    ? renderSpells(spells, spellSlots)    : ""}
        ${abilities.length ? renderAbilities(abilities)          : ""}
        ${(inventory.length || Object.values(currency).some(v => v > 0)) ? renderInventory(inventory, currency) : ""}
        ${resources.length ? renderResources(resources)          : ""}
        ${character.notes  ? renderNotes(character)              : ""}
      </div>
    `;
  }

  // ─── Header ──────────────────────────────────────────────────────────────────

  function renderHeader(character, identity, isRoblox) {
    const name    = identity.name    || "(Unnamed)";
    const race    = identity.race    || "";
    const tags    = identity.tags    || [];
    const aliases = identity.aliases || [];
    const typeIcon  = isRoblox ? "🎮" : "✨";
    const typeLabel = isRoblox ? "Roblox OC" : "Original Character";

    const tagBadges   = tags.map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
    const aliasBadges = aliases.map(a => `<span class="sheet-alias">"${esc(a)}"</span>`).join(" ");

    const subtitleParts = [
      race           ? `<span class="sheet-subtitle-item">${esc(race)}</span>` : "",
      identity.age   ? `<span class="sheet-subtitle-item">${esc(identity.age)}</span>`    : "",
      identity.height ? `<span class="sheet-subtitle-item">${esc(identity.height)}</span>` : "",
      identity.origin ? `<span class="sheet-subtitle-item">${esc(identity.origin)}</span>` : "",
    ].filter(Boolean).join("");

    return `
      <div class="sheet-header">
        <div class="sheet-type-badge">${typeIcon} ${typeLabel}</div>
        <h1 class="sheet-character-name">${esc(name)}</h1>
        ${aliasBadges ? `<div class="sheet-aliases">${aliasBadges}</div>` : ""}
        ${subtitleParts ? `<div class="sheet-subtitle-row">${subtitleParts}</div>` : ""}
        ${tagBadges ? `<div class="sheet-tags">${tagBadges}</div>` : ""}
      </div>
    `;
  }

  // ─── Appearance ──────────────────────────────────────────────────────────────

  function renderAppearance(identity, appearance) {
    const description = appearance.description || "";
    const images      = (appearance.images || []).filter(img => img.url);
    if (!description && !images.length) return "";

    const imageGallery = images.length
      ? `<div class="sheet-image-gallery">${images.map(img =>
          `<figure class="sheet-image-figure">
            <img src="${escAttr(img.url)}" alt="${escAttr(img.label || "")}" class="sheet-image" loading="lazy" />
            ${img.label ? `<figcaption class="sheet-image-caption">${esc(img.label)}</figcaption>` : ""}
          </figure>`
        ).join("")}</div>`
      : "";

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🖼 Appearance</h2>
        ${imageGallery}
        ${description ? `<div class="sheet-prose sheet-appearance">${esc(description)}</div>` : ""}
      </section>
    `;
  }

  // ─── Personality ─────────────────────────────────────────────────────────────

  function renderPersonality(character) {
    if (!character.personality) return "";
    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">💭 Personality</h2>
        <div class="sheet-prose">${esc(character.personality)}</div>
      </section>
    `;
  }

  // ─── Backstory ───────────────────────────────────────────────────────────────

  function renderBackstory(character) {
    if (!character.backstory) return "";
    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📖 Backstory</h2>
        <div class="sheet-prose">${esc(character.backstory)}</div>
      </section>
    `;
  }

  // ─── Roblox Section ──────────────────────────────────────────────────────────

  function renderRobloxSection(roblox) {
    const catalogItems    = roblox.catalogItems    || [];
    const outfitCommands  = roblox.outfitCommands  || "";

    const hasContent = catalogItems.length || outfitCommands;
    if (!hasContent) return "";

    // Group catalog items by category
    const grouped = {};
    catalogItems.forEach(item => {
      const cat = item.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const categoryOrder = ["hair", "hat", "face", "shirt", "pants", "shoes", "accessory", "gear", "other"];
    const sortedCategories = [
      ...categoryOrder.filter(c => grouped[c]),
      ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)),
    ];

    const catalogHTML = sortedCategories.map(cat => {
      const items = grouped[cat];
      const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      const itemLinks = items.map(item => {
        const name = item.name || "(Unnamed item)";
        if (item.url) {
          return `<a href="${escAttr(item.url)}" class="sheet-roblox-item-link" target="_blank" rel="noopener noreferrer">${esc(name)}</a>`;
        }
        return `<span class="sheet-roblox-item-name">${esc(name)}</span>`;
      }).join("");
      return `
        <div class="sheet-roblox-category">
          <span class="sheet-roblox-category-label">${esc(catLabel)}</span>
          <div class="sheet-roblox-item-list">${itemLinks}</div>
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎮 Roblox Outfit</h2>
        ${catalogItems.length ? `
        <div class="sheet-roblox-catalog">
          ${catalogHTML}
        </div>` : ""}
        ${outfitCommands ? `
        <div class="sheet-outfit-commands">
          <div class="sheet-outfit-commands-label text-muted text-sm">Outfit Commands</div>
          <pre class="sheet-outfit-commands-pre">${esc(outfitCommands)}</pre>
        </div>` : ""}
      </section>
    `;
  }

  // ─── Spells ──────────────────────────────────────────────────────────────────

  function renderSpells(spells, spellSlots) {
    const grouped = {};
    spells.forEach(spell => {
      const lvl = spell.level ?? 0;
      if (!grouped[lvl]) grouped[lvl] = [];
      grouped[lvl].push(spell);
    });

    const levelGroups = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b)
      .map(level => {
        const levelLabel = level === 0 ? "Cantrips" : `Level ${level}`;
        const slot = spellSlots[level];
        const slotDisplay = slot
          ? ` <span class="sheet-spell-slot-tracker">${renderSlotPips(slot.current, slot.max)}</span>`
          : "";
        const entries = grouped[level].map(spell => renderSpellEntry(spell)).join("");
        return `
          <div class="sheet-spell-level-group">
            <div class="sheet-spell-level-header">
              <span class="sheet-spell-level-label">${levelLabel}</span>
              ${slotDisplay}
            </div>
            ${entries}
          </div>
        `;
      }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">✨ Spells</h2>
        ${levelGroups}
      </section>
    `;
  }

  function renderSlotPips(current, max) {
    let pips = "";
    for (let i = 1; i <= max; i++) {
      pips += `<span class="sheet-slot-pip ${i <= current ? "filled" : ""}"></span>`;
    }
    return `<span class="sheet-slot-pips">${pips}</span><span class="sheet-slot-count text-muted">${current}/${max}</span>`;
  }

  function renderSpellEntry(spell) {
    const components = (spell.components || []).join(", ");
    const details    = [
      spell.castingTime ? `Cast: ${esc(spell.castingTime)}` : "",
      spell.range       ? `Range: ${esc(spell.range)}`       : "",
      components        ? `Components: ${esc(components)}`   : "",
      spell.duration    ? `Duration: ${esc(spell.duration)}` : "",
    ].filter(Boolean).join("  ·  ");
    const tags = (spell.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");

    return `
      <div class="sheet-spell-entry">
        <div class="sheet-spell-prepared-dot ${spell.prepared ? "prepared" : ""}"></div>
        <div class="sheet-spell-content">
          <div class="sheet-spell-name">
            ${esc(spell.name || "(Unnamed spell)")}
            ${spell.school ? `<span class="sheet-spell-school text-muted">${esc(spell.school)}</span>` : ""}
          </div>
          ${details ? `<div class="sheet-spell-details text-muted text-sm">${details}</div>` : ""}
          ${spell.description ? `<div class="sheet-spell-desc text-sm">${esc(spell.description)}</div>` : ""}
          ${tags ? `<div class="sheet-spell-tags">${tags}</div>` : ""}
        </div>
      </div>
    `;
  }

  // ─── Abilities ───────────────────────────────────────────────────────────────

  function renderAbilities(abilities) {
    const entries = abilities.map(ability => {
      const typeBadge   = ability.type ? `<span class="sheet-ability-type-badge">${esc(ability.type.replace(/_/g, " "))}</span>` : "";
      const activeBadge = ability.active ? `<span class="sheet-ability-active-badge">Active</span>` : "";
      const tags        = (ability.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
      return `
        <div class="sheet-ability-entry">
          <div class="sheet-ability-header">
            <span class="sheet-ability-name">${esc(ability.name || "(Unnamed)")}</span>
            ${typeBadge}
            ${activeBadge}
          </div>
          ${ability.description ? `<div class="sheet-ability-desc text-sm">${esc(ability.description)}</div>` : ""}
          ${tags ? `<div class="sheet-ability-tags">${tags}</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚡ Abilities &amp; Traits</h2>
        <div class="sheet-ability-list">${entries}</div>
      </section>
    `;
  }

  // ─── Inventory ───────────────────────────────────────────────────────────────

  function renderInventory(inventory, currency) {
    const hasCurrency = currency && Object.values(currency).some(v => v > 0);

    const rows = inventory.map(item => {
      const attunedBadge = item.attuned ? `<span class="sheet-attuned-badge">Attuned</span>` : "";
      const typeBadge    = item.type    ? `<span class="sheet-item-type-badge">${esc(item.type)}</span>` : "";
      const tags         = (item.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
      const qty          = item.quantity != null && item.quantity !== 1 ? `<span class="sheet-item-qty">×${item.quantity}</span>` : "";
      return `
        <div class="sheet-item-row">
          <div class="sheet-item-main">
            <span class="sheet-item-name">${esc(item.name || "(Unnamed)")}</span>
            ${qty}
            ${typeBadge}
            ${attunedBadge}
          </div>
          ${item.description ? `<div class="sheet-item-desc text-sm text-muted">${esc(item.description)}</div>` : ""}
          ${tags ? `<div class="sheet-item-tags">${tags}</div>` : ""}
        </div>
      `;
    }).join("");

    const currencyOrder = [["pp","Platinum"],["gp","Gold"],["ep","Electrum"],["sp","Silver"],["cp","Copper"]];
    const currencyPills = hasCurrency
      ? currencyOrder.filter(([k]) => (currency[k] || 0) > 0).map(([k, label]) =>
          `<span class="sheet-currency-pill"><span class="sheet-currency-amount">${currency[k]}</span><span class="sheet-currency-label">${label}</span></span>`
        ).join("")
      : "";

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎒 Inventory</h2>
        ${hasCurrency ? `<div class="sheet-currency-row">${currencyPills}</div>` : ""}
        ${rows ? `<div class="sheet-item-list">${rows}</div>` : ""}
      </section>
    `;
  }

  // ─── Resources ───────────────────────────────────────────────────────────────

  function renderResources(resources) {
    const blocks = resources.map(res => {
      const percent  = res.max > 0 ? Math.round((res.current / res.max) * 100) : 0;
      const barClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
      return `
        <div class="sheet-resource-block">
          <div class="sheet-resource-header">
            <span class="sheet-resource-name">${esc(res.name || "Resource")}</span>
            <span class="sheet-resource-values">${res.current} / ${res.max}</span>
          </div>
          <div class="hp-bar-track" style="margin-bottom:var(--space-2)">
            <div class="hp-bar-fill ${barClass}" style="width:${percent}%"></div>
          </div>
          ${(res.log || []).length > 0 ? `
          <div class="sheet-resource-log">
            ${res.log.slice(0, 6).map(entry => {
              const sign = entry.delta >= 0 ? "+" : "";
              const cls  = entry.delta >= 0 ? "sheet-log-positive" : "sheet-log-negative";
              return `<div class="sheet-log-entry">
                <span class="sheet-log-delta ${cls}">${sign}${entry.delta}</span>
                <span class="sheet-log-reason">${esc(entry.reason || "")}</span>
                <span class="sheet-log-date text-muted">${esc(entry.date || "")}</span>
              </div>`;
            }).join("")}
            ${res.log.length > 6 ? `<div class="text-muted text-sm" style="padding:var(--space-1) 0">…${res.log.length - 6} earlier entries</div>` : ""}
          </div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📊 Resources</h2>
        ${blocks}
      </section>
    `;
  }

  // ─── Notes ───────────────────────────────────────────────────────────────────

  function renderNotes(character) {
    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📝 Notes</h2>
        <div class="sheet-prose sheet-notes">${esc(character.notes)}</div>
      </section>
    `;
  }

  // ─── Escape Helpers ──────────────────────────────────────────────────────────

  function esc(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  return { buildHTML };

})();
