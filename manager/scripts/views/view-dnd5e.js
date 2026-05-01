/**
 * view-dnd5e.js
 * Renders a full D&D 5e Player Character sheet as an HTML string.
 *
 * Exports: ViewDnd5e.buildHTML(characterData) → HTML string
 */

const ViewDnd5e = (() => {

  // ─── Public Entry Point ──────────────────────────────────────────────────────

  function buildHTML(character) {
    const identity  = character.identity  || {};
    const dnd       = character.dnd       || {};
    const spells    = character.spells    || [];
    const spellSlots = character.spellSlots || {};
    const abilities = character.abilities || [];
    const inventory = character.inventory || [];
    const currency  = character.currency  || {};
    const resources = character.customResources || [];
    const appearance = character.appearance || {};

    return `
      <div class="sheet-root sheet-dnd5e">
        ${renderHeader(character, identity, dnd)}
        ${renderIdentityDetails(identity, appearance, character)}
        ${renderCombatBlock(dnd)}
        ${renderAbilityScores(dnd)}
        ${renderSavingThrows(dnd)}
        ${renderSkills(dnd)}
        ${renderSpells(spells, spellSlots, dnd)}
        ${renderAbilities(abilities)}
        ${renderInventory(inventory, currency)}
        ${renderResources(dnd, resources)}
        ${renderFeatsAndMulticlass(dnd)}
        ${renderNotes(character)}
      </div>
    `;
  }

  // ─── Header ──────────────────────────────────────────────────────────────────

  function renderHeader(character, identity, dnd) {
    const name     = identity.name    || "(Unnamed)";
    const race     = identity.race    || "";
    const tags     = identity.tags    || [];
    const aliases  = identity.aliases || [];

    const classLine = buildClassLine(dnd);
    const tagBadges = tags.map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
    const aliasBadges = aliases.map(a => `<span class="sheet-alias">"${esc(a)}"</span>`).join(" ");

    return `
      <div class="sheet-header">
        <div class="sheet-type-badge">⚔️ D&amp;D 5e — Player Character</div>
        <h1 class="sheet-character-name">${esc(name)}</h1>
        ${aliasBadges ? `<div class="sheet-aliases">${aliasBadges}</div>` : ""}
        <div class="sheet-subtitle-row">
          ${classLine  ? `<span class="sheet-subtitle-item">${esc(classLine)}</span>` : ""}
          ${race       ? `<span class="sheet-subtitle-item">${esc(race)}</span>` : ""}
          ${dnd.background ? `<span class="sheet-subtitle-item">${esc(dnd.background)}</span>` : ""}
          ${dnd.alignment  ? `<span class="sheet-subtitle-item">${esc(dnd.alignment)}</span>`  : ""}
        </div>
        ${tagBadges ? `<div class="sheet-tags">${tagBadges}</div>` : ""}
      </div>
    `;
  }

  function buildClassLine(dnd) {
    if (!dnd.class) return "";
    const primary = [dnd.class, dnd.subclass].filter(Boolean).join(" / ");
    const lvl     = dnd.level ? `Level ${dnd.level}` : "";
    const multi   = (dnd.multiclass || []).map(mc =>
      [mc.class, mc.subclass, mc.level ? `Lv.${mc.level}` : ""].filter(Boolean).join(" / ")
    );
    return [primary + (lvl ? ` — ${lvl}` : ""), ...multi].join("  +  ");
  }

  // ─── Identity Details ────────────────────────────────────────────────────────

  function renderIdentityDetails(identity, appearance, character) {
    const fields = [
      ["Race",   identity.race],
      ["Age",    identity.age],
      ["Height", identity.height],
      ["Origin", identity.origin],
    ].filter(([, v]) => v);

    const identityRows = fields.map(([label, value]) =>
      `<div class="sheet-identity-row"><span class="sheet-identity-label">${label}</span><span class="sheet-identity-value">${esc(value)}</span></div>`
    ).join("");

    const images = (appearance.images || []).filter(img => img.url);
    const imageGallery = images.length
      ? `<div class="sheet-image-gallery">${images.map(img =>
          `<figure class="sheet-image-figure">
            <img src="${escAttr(img.url)}" alt="${escAttr(img.label || "")}" class="sheet-image" loading="lazy" />
            ${img.label ? `<figcaption class="sheet-image-caption">${esc(img.label)}</figcaption>` : ""}
          </figure>`
        ).join("")}</div>`
      : "";

    const hasDetails = identityRows || appearance.description || character.personality || character.backstory || imageGallery;
    if (!hasDetails) return "";

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📖 Identity</h2>
        ${identityRows ? `<div class="sheet-identity-grid">${identityRows}</div>` : ""}
        ${imageGallery}
        ${appearance.description ? `<div class="sheet-prose sheet-appearance"><strong>Appearance:</strong> ${esc(appearance.description)}</div>` : ""}
        ${character.personality  ? `<div class="sheet-prose"><strong>Personality:</strong> ${esc(character.personality)}</div>` : ""}
        ${character.backstory    ? `<div class="sheet-prose"><strong>Backstory:</strong> ${esc(character.backstory)}</div>` : ""}
      </section>
    `;
  }

  // ─── Combat Block ────────────────────────────────────────────────────────────

  function renderCombatBlock(dnd) {
    if (!dnd.hp && !dnd.acModes) return "";

    const hp      = dnd.hp || { max: 0, current: 0, temp: 0 };
    const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";

    const activeAc = (dnd.acModes || []).find(m => m.active) || (dnd.acModes || [])[0];
    const profBonus = dnd.proficiencyBonus || 2;
    const spellAbility = dnd.spellcastingAbility || "";
    const stats = dnd.stats || {};
    const spellModScore = spellAbility ? (stats[spellAbility]?.score ?? 10) : 10;
    const spellMod = Schema.getAbilityModifier(spellModScore);
    const spellSaveDc = spellAbility ? (8 + profBonus + spellMod) : null;
    const spellAttack = spellAbility ? (profBonus + spellMod) : null;

    const allAcModes = (dnd.acModes || []).map(m => `
      <div class="sheet-ac-mode ${m.active ? "active" : ""}">
        <span class="sheet-ac-value">${m.value}</span>
        <span class="sheet-ac-label">${esc(m.label)}</span>
      </div>
    `).join("");

    const speed = dnd.speed || { walk: 30 };
    const speedParts = Object.entries(speed)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<span class="sheet-speed-item"><span class="sheet-speed-value">${v}</span><span class="sheet-speed-label">${k}</span></span>`)
      .join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚔️ Combat</h2>

        <div class="sheet-hp-block">
          <div class="sheet-hp-numbers">
            <span class="sheet-hp-current">${hp.current}</span>
            <span class="sheet-hp-sep">/</span>
            <span class="sheet-hp-max">${hp.max}</span>
            <span class="sheet-hp-label">HP</span>
            ${hp.temp > 0 ? `<span class="sheet-hp-temp">+${hp.temp} temp</span>` : ""}
          </div>
          <div class="hp-bar-track sheet-hp-bar">
            <div class="hp-bar-fill ${hpClass}" style="width:${percent}%"></div>
          </div>
        </div>

        <div class="sheet-combat-row">
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${activeAc ? activeAc.value : "—"}</div>
            <div class="sheet-stat-label">Armour Class</div>
          </div>
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${Schema.formatModifier(dnd.initiative || 0)}</div>
            <div class="sheet-stat-label">Initiative</div>
          </div>
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${Schema.formatModifier(profBonus)}</div>
            <div class="sheet-stat-label">Prof. Bonus</div>
          </div>
          ${spellSaveDc !== null ? `
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${spellSaveDc}</div>
            <div class="sheet-stat-label">Spell Save DC</div>
          </div>
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${Schema.formatModifier(spellAttack)}</div>
            <div class="sheet-stat-label">Spell Attack</div>
          </div>
          ` : ""}
        </div>

        ${allAcModes ? `<div class="sheet-ac-modes">${allAcModes}</div>` : ""}

        ${speedParts ? `<div class="sheet-speed-row">${speedParts}</div>` : ""}
      </section>
    `;
  }

  // ─── Ability Scores ──────────────────────────────────────────────────────────

  function renderAbilityScores(dnd) {
    const stats = dnd.stats || Schema.createDefaultDndStats?.() || {};
    const abilityNames = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };
    const fullNames    = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };
    const spellAbil    = dnd.spellcastingAbility || "";

    const boxes = Object.entries(abilityNames).map(([key, abbr]) => {
      const score    = stats[key]?.score ?? 10;
      const modifier = Schema.getAbilityModifier(score);
      const isSpell  = key === spellAbil;
      return `
        <div class="sheet-ability-box ${isSpell ? "sheet-ability-spellcasting" : ""}" title="${fullNames[key]}">
          <div class="sheet-ability-abbr">${abbr}</div>
          <div class="sheet-ability-score">${score}</div>
          <div class="sheet-ability-mod">${Schema.formatModifier(modifier)}</div>
          ${isSpell ? `<div class="sheet-ability-spellmark">✦</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎲 Ability Scores</h2>
        <div class="sheet-ability-grid">${boxes}</div>
        ${spellAbil ? `<p class="text-muted text-sm" style="margin-top:var(--space-2)">✦ Spellcasting ability</p>` : ""}
      </section>
    `;
  }

  // ─── Saving Throws ───────────────────────────────────────────────────────────

  function renderSavingThrows(dnd) {
    const stats        = dnd.stats || {};
    const profBonus    = dnd.proficiencyBonus || 2;
    const profList     = dnd.savingThrowProficiencies || [];
    const abilityNames = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const rows = Object.entries(abilityNames).map(([key, label]) => {
      const score    = stats[key]?.score ?? 10;
      const baseMod  = Schema.getAbilityModifier(score);
      const proficient = profList.includes(key);
      const total    = proficient ? baseMod + profBonus : baseMod;
      return `
        <div class="sheet-save-row">
          <span class="sheet-prof-dot ${proficient ? "proficient" : ""}"></span>
          <span class="sheet-save-bonus">${Schema.formatModifier(total)}</span>
          <span class="sheet-save-label">${label}</span>
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section sheet-section-half">
        <h2 class="sheet-section-title">🛡 Saving Throws</h2>
        <div class="sheet-save-list">${rows}</div>
      </section>
    `;
  }

  // ─── Skills ──────────────────────────────────────────────────────────────────

  function renderSkills(dnd) {
    const stats     = dnd.stats || {};
    const profBonus = dnd.proficiencyBonus || 2;
    const profList  = dnd.skillProficiencies || [];

    const rows = Schema.SKILLS.map(({ skill, ability }) => {
      const profEntry  = profList.find(p => p.skill === skill);
      const isProficient = !!profEntry;
      const isExpert     = profEntry?.expertise ?? false;

      const score    = stats[ability]?.score ?? 10;
      const baseMod  = Schema.getAbilityModifier(score);
      const bonus    = isExpert ? baseMod + profBonus * 2 : isProficient ? baseMod + profBonus : baseMod;
      const dotClass = isExpert ? "expert" : isProficient ? "proficient" : "";
      const label    = skill.charAt(0).toUpperCase() + skill.slice(1);
      const abilLabel = ability.toUpperCase().slice(0, 3);

      return `
        <div class="sheet-skill-row">
          <span class="sheet-prof-dot ${dotClass}"></span>
          <span class="sheet-skill-bonus">${Schema.formatModifier(bonus)}</span>
          <span class="sheet-skill-label">${label}</span>
          <span class="sheet-skill-ability text-muted">${abilLabel}</span>
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section sheet-section-half">
        <h2 class="sheet-section-title">🎯 Skills</h2>
        <div class="sheet-skill-list">${rows}</div>
      </section>
    `;
  }

  // ─── Spells ──────────────────────────────────────────────────────────────────

  function renderSpells(spells, spellSlots, dnd) {
    if (!spells.length) return "";

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

        const spellEntries = grouped[level].map(spell => renderSpellEntry(spell)).join("");
        return `
          <div class="sheet-spell-level-group">
            <div class="sheet-spell-level-header">
              <span class="sheet-spell-level-label">${levelLabel}</span>
              ${slotDisplay}
            </div>
            ${spellEntries}
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
    const name       = spell.name || "(Unnamed spell)";
    const school     = spell.school || "";
    const components = (spell.components || []).join(", ");
    const prepared   = spell.prepared;

    const details = [
      spell.castingTime ? `<span>Cast: ${esc(spell.castingTime)}</span>` : "",
      spell.range       ? `<span>Range: ${esc(spell.range)}</span>`       : "",
      components        ? `<span>Components: ${esc(components)}</span>`   : "",
      spell.duration    ? `<span>Duration: ${esc(spell.duration)}</span>` : "",
    ].filter(Boolean).join("  ·  ");

    const tags = (spell.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");

    return `
      <div class="sheet-spell-entry">
        <div class="sheet-spell-prepared-dot ${prepared ? "prepared" : ""}"></div>
        <div class="sheet-spell-content">
          <div class="sheet-spell-name">
            ${esc(name)}
            ${school ? `<span class="sheet-spell-school text-muted">${esc(school)}</span>` : ""}
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
    if (!abilities.length) return "";

    const entries = abilities.map(ability => {
      const typeBadge = ability.type
        ? `<span class="sheet-ability-type-badge">${esc(ability.type.replace(/_/g, " "))}</span>`
        : "";
      const activeBadge = ability.active
        ? `<span class="sheet-ability-active-badge">Active</span>`
        : "";
      const tags = (ability.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
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
    if (!inventory.length && !hasCurrency) return "";

    const rows = inventory.map(item => {
      const attunedBadge = item.attuned ? `<span class="sheet-attuned-badge">Attuned</span>` : "";
      const typeBadge    = item.type    ? `<span class="sheet-item-type-badge">${esc(item.type)}</span>`    : "";
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

    const currencyOrder = [
      ["pp", "Platinum"], ["gp", "Gold"], ["ep", "Electrum"], ["sp", "Silver"], ["cp", "Copper"]
    ];
    const currencyPills = hasCurrency
      ? currencyOrder
          .filter(([key]) => (currency[key] || 0) > 0)
          .map(([key, label]) => `<span class="sheet-currency-pill"><span class="sheet-currency-amount">${currency[key]}</span><span class="sheet-currency-label">${label}</span></span>`)
          .join("")
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

  function renderResources(dnd, customResources) {
    const hasHpLog   = (dnd.hp?.log || []).length > 0;
    const hasCustom  = customResources.length > 0;
    if (!hasHpLog && !hasCustom) return "";

    const hpLogSection = hasHpLog ? `
      <div class="sheet-resource-block">
        <div class="sheet-resource-header">
          <span class="sheet-resource-name">HP Log</span>
          <span class="sheet-resource-values">${dnd.hp.current} / ${dnd.hp.max} HP</span>
        </div>
        <div class="sheet-resource-log">
          ${(dnd.hp.log || []).slice(0, 10).map(entry => renderLogEntry(entry)).join("")}
          ${dnd.hp.log.length > 10 ? `<div class="text-muted text-sm" style="padding:var(--space-1) 0">…${dnd.hp.log.length - 10} earlier entries</div>` : ""}
        </div>
      </div>
    ` : "";

    const customSections = customResources.map(res => {
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
            ${(res.log || []).slice(0, 6).map(entry => renderLogEntry(entry)).join("")}
            ${res.log.length > 6 ? `<div class="text-muted text-sm" style="padding:var(--space-1) 0">…${res.log.length - 6} earlier entries</div>` : ""}
          </div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📊 Resources</h2>
        ${hpLogSection}
        ${customSections}
      </section>
    `;
  }

  function renderLogEntry(entry) {
    const sign      = entry.delta >= 0 ? "+" : "";
    const deltaClass = entry.delta >= 0 ? "sheet-log-positive" : "sheet-log-negative";
    return `
      <div class="sheet-log-entry">
        <span class="sheet-log-delta ${deltaClass}">${sign}${entry.delta}</span>
        <span class="sheet-log-reason">${esc(entry.reason || "")}</span>
        <span class="sheet-log-date text-muted">${esc(entry.date || "")}</span>
      </div>
    `;
  }

  // ─── Feats & Multiclass ──────────────────────────────────────────────────────

  function renderFeatsAndMulticlass(dnd) {
    const feats      = dnd.feats      || [];
    const multiclass = dnd.multiclass || [];
    if (!feats.length && !multiclass.length) return "";

    const featEntries = feats.map(feat => `
      <div class="sheet-feat-entry">
        <span class="sheet-feat-name">${esc(feat.name || "(Unnamed feat)")}</span>
        ${feat.description ? `<div class="sheet-feat-desc text-sm text-muted">${esc(feat.description)}</div>` : ""}
      </div>
    `).join("");

    const multiEntries = multiclass.map(mc => `
      <div class="sheet-multiclass-entry">
        <span class="sheet-multiclass-class">${esc(mc.class || "")}</span>
        ${mc.subclass ? `<span class="text-muted"> / ${esc(mc.subclass)}</span>` : ""}
        ${mc.level    ? `<span class="sheet-multiclass-level"> — Lv.${mc.level}</span>` : ""}
      </div>
    `).join("");

    return `
      <section class="sheet-section">
        ${multiclass.length ? `
        <h2 class="sheet-section-title">🔀 Multiclass</h2>
        <div class="sheet-multiclass-list">${multiEntries}</div>
        ` : ""}
        ${feats.length ? `
        <h2 class="sheet-section-title" style="margin-top:var(--space-4)">🏅 Feats</h2>
        <div class="sheet-feat-list">${featEntries}</div>
        ` : ""}
      </section>
    `;
  }

  // ─── Notes ───────────────────────────────────────────────────────────────────

  function renderNotes(character) {
    if (!character.notes) return "";
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
