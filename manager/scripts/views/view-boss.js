/**
 * view-boss.js
 * Renders a D&D 5e Boss / NPC stat block as an HTML string.
 * The boss-mode toggle button is wired up after the HTML is inserted into the DOM.
 *
 * Exports: ViewBoss.buildHTML(characterData) → HTML string
 *          ViewBoss.wireToggle(containerEl, characterData) → void (call after inserting HTML)
 */

const ViewBoss = (() => {

  // ─── Public Entry Point ──────────────────────────────────────────────────────

  function buildHTML(character) {
    const identity  = character.identity  || {};
    const boss      = character.boss      || {};
    const dnd       = character.dnd       || {};
    const spells    = character.spells    || [];
    const spellSlots = character.spellSlots || {};
    const abilities = character.abilities || [];
    const inventory = character.inventory || [];
    const currency  = character.currency  || {};
    const resources = character.customResources || [];
    const appearance = character.appearance || {};

    return `
      <div class="sheet-root sheet-boss" data-boss-active="${boss.bossActive ? "true" : "false"}">
        ${renderHeader(character, identity, dnd, boss)}
        ${renderBossToggleBar(boss)}
        ${renderIdentityDetails(identity, appearance, character)}
        ${renderCombatBlock(dnd, boss)}
        ${boss.attacks?.length ? renderAttacks(boss) : ""}
        ${renderResistances(boss)}
        ${boss.polymorphTraits?.length ? renderPolymorphTraits(boss) : ""}
        ${renderAbilityScores(dnd, boss)}
        ${renderSavingThrows(dnd)}
        ${renderSpells(spells, spellSlots)}
        ${renderAbilities(abilities)}
        ${renderInventory(inventory, currency)}
        ${renderCustomResources(resources)}
        ${renderSpecialRules(boss)}
        ${renderNotes(character)}
      </div>
    `;
  }

  /**
   * Wire up the boss toggle button after the sheet HTML has been inserted into the DOM.
   * @param {HTMLElement} containerEl - Element containing the rendered sheet HTML
   * @param {Object} characterData    - The full character data object
   */
  function wireToggle(containerEl, characterData) {
    const sheetRoot = containerEl.querySelector(".sheet-boss");
    const toggleBtn = containerEl.querySelector(".sheet-boss-toggle-btn");
    if (!toggleBtn || !sheetRoot) return;

    toggleBtn.addEventListener("click", () => {
      const currentlyActive = sheetRoot.dataset.bossActive === "true";
      const newActive        = !currentlyActive;
      sheetRoot.dataset.bossActive = String(newActive);
      updateBossDisplay(sheetRoot, characterData, newActive);
    });
  }

  function updateBossDisplay(sheetRoot, character, bossActive) {
    const boss = character.boss || {};

    // Update toggle button label
    const btn = sheetRoot.querySelector(".sheet-boss-toggle-btn");
    if (btn) {
      btn.textContent = bossActive ? "💀 Boss Mode Active" : "🐾 Tamed Mode";
      btn.classList.toggle("active", bossActive);
    }

    // Update HP display
    const hp      = bossActive ? (boss.bossHp || { max: 0, current: 0 }) : (boss.defaultHp || { max: 0, current: 0 });
    const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";

    const hpCurrentEl = sheetRoot.querySelector(".sheet-hp-current");
    const hpMaxEl     = sheetRoot.querySelector(".sheet-hp-max");
    const hpBarEl     = sheetRoot.querySelector(".hp-bar-fill");
    if (hpCurrentEl) hpCurrentEl.textContent = hp.current;
    if (hpMaxEl)     hpMaxEl.textContent     = hp.max;
    if (hpBarEl) {
      hpBarEl.style.width = `${percent}%`;
      hpBarEl.className   = `hp-bar-fill ${hpClass}`;
    }

    // Show/hide boss-only sections
    sheetRoot.querySelectorAll(".sheet-boss-only").forEach(el => {
      el.style.display = bossActive ? "" : "none";
    });
    sheetRoot.querySelectorAll(".sheet-tamed-only").forEach(el => {
      el.style.display = bossActive ? "none" : "";
    });
  }

  // ─── Header ──────────────────────────────────────────────────────────────────

  function renderHeader(character, identity, dnd, boss) {
    const name    = identity.name  || "(Unnamed)";
    const race    = identity.race  || "";
    const tags    = identity.tags  || [];
    const aliases = identity.aliases || [];

    const classLine = dnd.class
      ? [dnd.class, dnd.subclass].filter(Boolean).join(" / ") + (dnd.level ? ` — Level ${dnd.level}` : "")
      : "";

    const tagBadges   = tags.map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
    const aliasBadges = aliases.map(a => `<span class="sheet-alias">"${esc(a)}"</span>`).join(" ");

    return `
      <div class="sheet-header">
        <div class="sheet-type-badge">💀 D&amp;D 5e — Boss / NPC</div>
        <h1 class="sheet-character-name">${esc(name)}</h1>
        ${aliasBadges ? `<div class="sheet-aliases">${aliasBadges}</div>` : ""}
        <div class="sheet-subtitle-row">
          ${classLine ? `<span class="sheet-subtitle-item">${esc(classLine)}</span>` : ""}
          ${race      ? `<span class="sheet-subtitle-item">${esc(race)}</span>`      : ""}
          ${dnd.alignment ? `<span class="sheet-subtitle-item">${esc(dnd.alignment)}</span>` : ""}
        </div>
        ${tagBadges ? `<div class="sheet-tags">${tagBadges}</div>` : ""}
      </div>
    `;
  }

  // ─── Boss Toggle Bar ─────────────────────────────────────────────────────────

  function renderBossToggleBar(boss) {
    const isActive = boss.bossActive ?? false;
    return `
      <div class="sheet-boss-toggle-bar">
        <button class="sheet-boss-toggle-btn ${isActive ? "active" : ""}">
          ${isActive ? "💀 Boss Mode Active" : "🐾 Tamed Mode"}
        </button>
        <span class="text-muted text-sm">Click to toggle boss state</span>
      </div>
    `;
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
        ${appearance.description ? `<div class="sheet-prose"><strong>Appearance:</strong> ${esc(appearance.description)}</div>` : ""}
        ${character.personality  ? `<div class="sheet-prose"><strong>Personality:</strong> ${esc(character.personality)}</div>` : ""}
        ${character.backstory    ? `<div class="sheet-prose"><strong>Backstory:</strong> ${esc(character.backstory)}</div>` : ""}
      </section>
    `;
  }

  // ─── Combat Block ────────────────────────────────────────────────────────────

  function renderCombatBlock(dnd, boss) {
    const isActive  = boss.bossActive ?? false;
    const hp        = isActive ? (boss.bossHp || { max: 0, current: 0 }) : (boss.defaultHp || { max: 0, current: 0 });
    const percent   = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass   = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";

    const activeAc  = (dnd.acModes || []).find(m => m.active) || (dnd.acModes || [])[0];
    const profBonus = dnd.proficiencyBonus || 2;

    const speed     = dnd.speed || {};
    const speedParts = Object.entries(speed)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<span class="sheet-speed-item"><span class="sheet-speed-value">${v}</span><span class="sheet-speed-label">${k}</span></span>`)
      .join("");

    const legendaryCount = boss.legendaryActions || 0;

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚔️ Combat</h2>

        <div class="sheet-hp-block">
          <div class="sheet-hp-numbers">
            <span class="sheet-hp-current">${hp.current}</span>
            <span class="sheet-hp-sep">/</span>
            <span class="sheet-hp-max">${hp.max}</span>
            <span class="sheet-hp-label">HP</span>
          </div>
          <div class="hp-bar-track sheet-hp-bar">
            <div class="hp-bar-fill ${hpClass}" style="width:${percent}%"></div>
          </div>
          <div class="sheet-boss-hp-labels text-muted text-sm" style="display:flex;gap:var(--space-4);margin-top:var(--space-1)">
            <span>Boss HP: ${boss.bossHp?.max ?? 0}</span>
            <span>Default HP: ${boss.defaultHp?.max ?? 0}</span>
          </div>
        </div>

        <div class="sheet-combat-row">
          ${activeAc ? `
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${activeAc.value}</div>
            <div class="sheet-stat-label">Armour Class</div>
          </div>` : ""}
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${Schema.formatModifier(dnd.initiative || 0)}</div>
            <div class="sheet-stat-label">Initiative</div>
          </div>
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${Schema.formatModifier(profBonus)}</div>
            <div class="sheet-stat-label">Prof. Bonus</div>
          </div>
          ${legendaryCount > 0 ? `
          <div class="sheet-stat-box sheet-boss-only" style="${isActive ? "" : "display:none"}">
            <div class="sheet-stat-value">${legendaryCount}</div>
            <div class="sheet-stat-label">Legendary Actions</div>
          </div>` : ""}
          ${boss.regeneration?.amount > 0 ? `
          <div class="sheet-stat-box sheet-boss-only" style="${isActive ? "" : "display:none"}">
            <div class="sheet-stat-value">${boss.regeneration.amount}</div>
            <div class="sheet-stat-label">Regen / Turn</div>
          </div>` : ""}
        </div>

        ${speedParts ? `<div class="sheet-speed-row">${speedParts}</div>` : ""}

        ${boss.regeneration?.disabledBy?.length ? `
        <div class="sheet-boss-only text-sm text-muted" style="${isActive ? "" : "display:none"};margin-top:var(--space-2)">
          ⚠ Regeneration disabled by: ${esc(boss.regeneration.disabledBy.join(", "))}
        </div>` : ""}
      </section>
    `;
  }

  // ─── Attacks ─────────────────────────────────────────────────────────────────

  function renderAttacks(boss) {
    const attacks = boss.attacks || [];
    if (!attacks.length) return "";

    const rows = attacks.map(attack => {
      const hitBonus  = Schema.formatModifier(attack.toHitBonus || 0);
      const advantage = attack.advantage ? `<span class="sheet-tag">Advantage</span>` : "";
      const dmgParts  = (attack.damage || []).map(roll =>
        `${roll.dice}${roll.bonus ? `+${roll.bonus}` : ""} ${esc(roll.type)}`
      ).join(" + ");
      const avgDmg = attack.avgDamage > 0 ? `(avg ${attack.avgDamage})` : "";

      return `
        <div class="sheet-attack-row">
          <div class="sheet-attack-header">
            <span class="sheet-attack-name">${esc(attack.name || "(Unnamed)")}</span>
            ${advantage}
          </div>
          <div class="sheet-attack-stats text-sm">
            <span class="sheet-attack-hit"><strong>To Hit:</strong> ${hitBonus}</span>
            <span class="sheet-attack-reach"><strong>Reach:</strong> ${esc(attack.reach || "5 ft")}</span>
            ${dmgParts ? `<span class="sheet-attack-dmg"><strong>Damage:</strong> ${dmgParts} ${avgDmg}</span>` : ""}
          </div>
          ${attack.onHit    ? `<div class="sheet-attack-onhit text-sm text-muted">On hit: ${esc(attack.onHit)}</div>` : ""}
          ${attack.description ? `<div class="sheet-attack-desc text-sm">${esc(attack.description)}</div>` : ""}
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${(boss.bossActive ?? false) ? "" : "display:none"}">
        <h2 class="sheet-section-title">⚔️ Attacks</h2>
        <div class="sheet-attack-list">${rows}</div>
      </section>
    `;
  }

  // ─── Resistances, Immunities, Weaknesses ─────────────────────────────────────

  function renderResistances(boss) {
    const resistances  = parseBadgeList(boss.resistances);
    const immunities   = parseBadgeList(boss.immunities);
    const condImmune   = parseBadgeList(boss.conditionImmunities);
    const weaknesses   = boss.weaknesses || [];
    const isActive     = boss.bossActive ?? false;

    if (!resistances.length && !immunities.length && !condImmune.length && !weaknesses.length) return "";

    const resistBadges  = resistances.map(r => `<span class="sheet-resistance-badge resist">${esc(r)}</span>`).join("");
    const immuneBadges  = immunities.map(i => `<span class="sheet-resistance-badge immune">${esc(i)}</span>`).join("");
    const condBadges    = condImmune.map(c => `<span class="sheet-resistance-badge condition-immune">${esc(c)}</span>`).join("");
    const weakEntries   = weaknesses.map(w => `<div class="sheet-weakness-entry text-sm">⚠ ${esc(w.description || "")}</div>`).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">🛡 Defences</h2>
        ${resistBadges  ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Resistances</span><div class="sheet-resistance-badges">${resistBadges}</div></div>` : ""}
        ${immuneBadges  ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Damage Immunities</span><div class="sheet-resistance-badges">${immuneBadges}</div></div>` : ""}
        ${condBadges    ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Condition Immunities</span><div class="sheet-resistance-badges">${condBadges}</div></div>` : ""}
        ${weakEntries   ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Weaknesses</span><div>${weakEntries}</div></div>` : ""}
      </section>
    `;
  }

  function parseBadgeList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(",").map(s => s.trim()).filter(Boolean);
  }

  // ─── Polymorph Traits ────────────────────────────────────────────────────────

  function renderPolymorphTraits(boss) {
    const traits   = boss.polymorphTraits || [];
    const isActive = boss.bossActive ?? false;
    if (!traits.length) return "";

    const cards = traits.map(trait => `
      <div class="sheet-polymorph-card ${trait.active ? "active" : ""}">
        <div class="sheet-polymorph-name">${esc(trait.name || "(Unnamed trait)")}</div>
        ${trait.description ? `<div class="sheet-polymorph-desc text-sm">${esc(trait.description)}</div>` : ""}
        ${trait.active ? `<span class="sheet-polymorph-active-badge">Active</span>` : ""}
      </div>
    `).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">🔀 Polymorph Traits</h2>
        <div class="sheet-polymorph-grid">${cards}</div>
      </section>
    `;
  }

  // ─── Ability Scores ──────────────────────────────────────────────────────────

  function renderAbilityScores(dnd, boss) {
    const stats        = dnd.stats || {};
    const bossActive   = boss.bossActive ?? false;
    const bonuses      = bossActive ? (boss.bossStatBonuses || {}) : {};
    const abilityNames = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };
    const fullNames    = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const boxes = Object.entries(abilityNames).map(([key, abbr]) => {
      const baseScore = stats[key]?.score ?? 10;
      const bonus     = bonuses[key] ?? 0;
      const score     = baseScore + bonus;
      const modifier  = Schema.getAbilityModifier(score);
      const bonusText = bonus > 0 ? `<span class="sheet-ability-bonus text-muted">+${bonus}</span>` : "";
      return `
        <div class="sheet-ability-box" title="${fullNames[key]}">
          <div class="sheet-ability-abbr">${abbr}</div>
          <div class="sheet-ability-score">${score}${bonusText}</div>
          <div class="sheet-ability-mod">${Schema.formatModifier(modifier)}</div>
        </div>
      `;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎲 Ability Scores${bossActive ? " <span class=\"text-muted text-sm\">(with boss bonuses)</span>" : ""}</h2>
        <div class="sheet-ability-grid">${boxes}</div>
      </section>
    `;
  }

  // ─── Saving Throws ───────────────────────────────────────────────────────────

  function renderSavingThrows(dnd) {
    if (!dnd.stats && !dnd.savingThrowProficiencies?.length) return "";
    const stats        = dnd.stats || {};
    const profBonus    = dnd.proficiencyBonus || 2;
    const profList     = dnd.savingThrowProficiencies || [];
    const abilityNames = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const rows = Object.entries(abilityNames).map(([key, label]) => {
      const score      = stats[key]?.score ?? 10;
      const baseMod    = Schema.getAbilityModifier(score);
      const proficient = profList.includes(key);
      const total      = proficient ? baseMod + profBonus : baseMod;
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

  // ─── Spells ──────────────────────────────────────────────────────────────────

  function renderSpells(spells, spellSlots) {
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
    const components = (spell.components || []).join(", ");
    const details    = [
      spell.castingTime ? `Cast: ${esc(spell.castingTime)}` : "",
      spell.range       ? `Range: ${esc(spell.range)}` : "",
      components        ? `Components: ${esc(components)}` : "",
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
    if (!abilities.length) return "";

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
    if (!inventory.length && !hasCurrency) return "";

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

  // ─── Custom Resources ────────────────────────────────────────────────────────

  function renderCustomResources(resources) {
    if (!resources.length) return "";
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
              const sign  = entry.delta >= 0 ? "+" : "";
              const cls   = entry.delta >= 0 ? "sheet-log-positive" : "sheet-log-negative";
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

  // ─── Special Rules ───────────────────────────────────────────────────────────

  function renderSpecialRules(boss) {
    const hasDeathRule = !!boss.deathRule;
    const hasTamedRule = !!boss.tamedRule;
    if (!hasDeathRule && !hasTamedRule) return "";

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📜 Special Rules</h2>
        ${hasDeathRule ? `
        <div class="sheet-special-rule">
          <span class="sheet-special-rule-label">Death Rule</span>
          <p class="sheet-prose text-sm">${esc(boss.deathRule)}</p>
        </div>` : ""}
        ${hasTamedRule ? `
        <div class="sheet-special-rule">
          <span class="sheet-special-rule-label">Tamed Rule</span>
          <p class="sheet-prose text-sm">${esc(boss.tamedRule)}</p>
        </div>` : ""}
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

  return { buildHTML, wireToggle };

})();
