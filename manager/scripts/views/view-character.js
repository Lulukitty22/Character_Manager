/**
 * view-character.js
 * Unified character sheet renderer — replaces view-dnd5e.js, view-boss.js, view-oc.js.
 *
 * Every section is optional. A section renders only when data for it exists on the character.
 * No type-gating — a Roblox OC with D&D stats renders both blocks; a plain OC with no
 * D&D block simply skips it. The renderer follows the data.
 *
 * Exports:
 *   ViewCharacter.buildHTML(character)          → HTML string
 *   ViewCharacter.wireInteractive(containerEl, character) → void (call after inserting HTML)
 */

const ViewCharacter = (() => {

  // ─── Public Entry Points ─────────────────────────────────────────────────────

  function buildHTML(character) {
    const identity   = character.identity         || {};
    const appearance = character.appearance       || {};
    const dnd        = character.dnd              || null;
    const boss       = character.boss             || null;
    const roblox     = character.roblox           || null;
    const spells     = character.spells           || [];
    const spellSlots = character.spellSlots       || {};
    const abilities  = character.abilities        || [];
    const inventory  = character.inventory        || [];
    const currency   = character.currency         || {};
    const resources  = character.customResources  || [];

    return `
      <div class="sheet-root" data-boss-active="${boss?.bossActive ? "true" : "false"}">
        ${renderHeader(character, identity, dnd, boss)}
        ${boss ? renderBossToggleBar(boss) : ""}
        ${renderIdentityDetails(identity, appearance, character)}
        ${dnd  ? renderDndCombatBlock(dnd, boss) : ""}
        ${dnd  ? renderAbilityScores(dnd) : ""}
        ${dnd  ? renderSavingThrows(dnd) : ""}
        ${dnd  ? renderSkills(dnd) : ""}
        ${boss && boss.attacks?.length ? renderAttacks(boss) : ""}
        ${boss ? renderBossDefences(boss) : ""}
        ${boss && boss.polymorphTraits?.length ? renderPolymorphTraits(boss) : ""}
        ${boss ? renderBossSpecialRules(boss) : ""}
        ${dnd  ? renderFeatsAndMulticlass(dnd) : ""}
        ${roblox ? renderRobloxSection(roblox) : ""}
        ${spells.length ? renderSpells(spells, spellSlots) : ""}
        ${abilities.length ? renderAbilities(abilities) : ""}
        ${hasInventoryContent(inventory, currency) ? renderInventory(inventory, currency) : ""}
        ${hasResourceContent(dnd, resources) ? renderResources(dnd, resources) : ""}
        ${character.notes ? renderNotes(character.notes) : ""}
      </div>
    `;
  }

  /**
   * Wire interactive elements (boss toggle) after the HTML has been inserted into the DOM.
   * @param {HTMLElement} containerEl - Element containing the rendered sheet HTML
   * @param {Object} character        - The full character data object
   */
  function wireInteractive(containerEl, character) {
    const sheetRoot = containerEl.querySelector(".sheet-root");
    const toggleBtn = containerEl.querySelector(".sheet-boss-toggle-btn");
    if (!toggleBtn || !sheetRoot || !character.boss) return;

    toggleBtn.addEventListener("click", () => {
      const isActive = sheetRoot.dataset.bossActive === "true";
      const newActive = !isActive;
      sheetRoot.dataset.bossActive = String(newActive);
      applyBossToggle(sheetRoot, character, newActive);
    });
  }

  // ─── Boss Toggle Logic ───────────────────────────────────────────────────────

  function applyBossToggle(sheetRoot, character, bossActive) {
    const boss = character.boss || {};

    // Toggle button label
    const btn = sheetRoot.querySelector(".sheet-boss-toggle-btn");
    if (btn) {
      btn.textContent = bossActive ? "💀 Boss Mode Active" : "🐾 Tamed Mode";
      btn.classList.toggle("active", bossActive);
    }

    // HP display
    const hp      = bossActive ? (boss.bossHp || { current: 0, max: 0 }) : (boss.defaultHp || { current: 0, max: 0 });
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

    // Show / hide boss-only and tamed-only elements
    sheetRoot.querySelectorAll(".sheet-boss-only").forEach(el => {
      el.style.display = bossActive ? "" : "none";
    });
    sheetRoot.querySelectorAll(".sheet-tamed-only").forEach(el => {
      el.style.display = bossActive ? "none" : "";
    });
  }

  // ─── Header ──────────────────────────────────────────────────────────────────

  function renderHeader(character, identity, dnd, boss) {
    const name    = identity.name    || "(Unnamed)";
    const aliases = identity.aliases || [];
    const tags    = identity.tags    || [];

    const typeLabel = Schema.CHARACTER_TYPE_LABELS[character.type] || "Character";
    const typeIcon  = Schema.CHARACTER_TYPE_ICONS[character.type]  || "✨";

    // Build a descriptive subtitle from whatever data exists
    const subtitleParts = [];
    if (dnd?.class) {
      const classStr = [dnd.class, dnd.subclass].filter(Boolean).join(" / ");
      subtitleParts.push(dnd.level ? `${classStr} — Level ${dnd.level}` : classStr);
      const multiclass = (dnd.multiclass || []).map(mc =>
        [mc.class, mc.subclass, mc.level ? `Lv.${mc.level}` : ""].filter(Boolean).join(" / ")
      );
      subtitleParts.push(...multiclass);
    }
    if (identity.race)       subtitleParts.push(identity.race);
    if (dnd?.background)     subtitleParts.push(dnd.background);
    if (dnd?.alignment)      subtitleParts.push(dnd.alignment);

    const tagBadges   = tags.map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
    const aliasBadges = aliases.map(a => `<span class="sheet-alias">"${esc(a)}"</span>`).join(" ");
    const subtitleHTML = subtitleParts.map(p => `<span class="sheet-subtitle-item">${esc(p)}</span>`).join("");

    return `
      <div class="sheet-header">
        <div class="sheet-type-badge">${typeIcon} ${esc(typeLabel)}</div>
        <h1 class="sheet-character-name">${esc(name)}</h1>
        ${aliasBadges ? `<div class="sheet-aliases">${aliasBadges}</div>` : ""}
        ${subtitleHTML ? `<div class="sheet-subtitle-row">${subtitleHTML}</div>` : ""}
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
    const infoFields = [
      ["Race",   identity.race],
      ["Age",    identity.age],
      ["Height", identity.height],
      ["Origin", identity.origin],
    ].filter(([, v]) => v);

    const identityRows = infoFields.map(([label, value]) =>
      `<div class="sheet-identity-row">
        <span class="sheet-identity-label">${label}</span>
        <span class="sheet-identity-value">${esc(value)}</span>
      </div>`
    ).join("");

    const images = (appearance.images || []).filter(img => img.url);
    const imageGallery = images.length
      ? `<div class="sheet-image-gallery">${images.map(img => `
          <figure class="sheet-image-figure">
            <img src="${escAttr(img.url)}" alt="${escAttr(img.label || "")}" class="sheet-image" loading="lazy" />
            ${img.label ? `<figcaption class="sheet-image-caption">${esc(img.label)}</figcaption>` : ""}
          </figure>`).join("")}</div>`
      : "";

    const hasContent = identityRows || imageGallery || appearance.description
                       || character.personality || character.backstory;
    if (!hasContent) return "";

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

  // ─── D&D Combat Block ────────────────────────────────────────────────────────

  function renderDndCombatBlock(dnd, boss) {
    // HP source: boss object if present and active, otherwise dnd.hp
    const bossActive = boss?.bossActive ?? false;
    const hp = boss
      ? (bossActive ? (boss.bossHp || { current: 0, max: 0 }) : (boss.defaultHp || { current: 0, max: 0 }))
      : (dnd.hp || { current: 0, max: 0 });

    const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";

    const activeAc  = (dnd.acModes || []).find(m => m.active) || (dnd.acModes || [])[0];
    const profBonus = dnd.proficiencyBonus || 2;
    const spellAbil = dnd.spellcastingAbility || "";
    const stats     = dnd.stats || {};
    const spellScore = spellAbil ? (stats[spellAbil]?.score ?? 10) : 10;
    const spellMod   = Schema.getAbilityModifier(spellScore);
    const spellSaveDc = spellAbil ? (8 + profBonus + spellMod) : null;
    const spellAtk    = spellAbil ? (profBonus + spellMod) : null;

    const speed = dnd.speed || {};
    const speedParts = Object.entries(speed)
      .filter(([, v]) => v > 0)
      .map(([k, v]) =>
        `<span class="sheet-speed-item">
          <span class="sheet-speed-value">${v}</span>
          <span class="sheet-speed-label">${k}</span>
        </span>`
      ).join("");

    // AC modes list
    const acModesHTML = (dnd.acModes || []).map(m => `
      <div class="sheet-ac-mode ${m.active ? "active" : ""}">
        <span class="sheet-ac-value">${m.value}</span>
        <span class="sheet-ac-label">${esc(m.label)}</span>
      </div>`
    ).join("");

    // Extra boss stats (only when boss mode active)
    const legendaryCount = boss?.legendaryActions || 0;
    const regenAmount    = boss?.regeneration?.amount || 0;

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚔️ Combat</h2>

        <div class="sheet-hp-block">
          <div class="sheet-hp-numbers">
            <span class="sheet-hp-current">${hp.current}</span>
            <span class="sheet-hp-sep">/</span>
            <span class="sheet-hp-max">${hp.max}</span>
            <span class="sheet-hp-label">HP</span>
            ${dnd.hp?.temp > 0 ? `<span class="sheet-hp-temp">+${dnd.hp.temp} temp</span>` : ""}
          </div>
          <div class="hp-bar-track sheet-hp-bar">
            <div class="hp-bar-fill ${hpClass}" style="width:${percent}%"></div>
          </div>
          ${boss ? `
          <div class="text-muted text-sm" style="display:flex;gap:var(--space-4);margin-top:var(--space-1)">
            <span>Boss HP: ${boss.bossHp?.max ?? 0}</span>
            <span>Default HP: ${boss.defaultHp?.max ?? 0}</span>
          </div>` : ""}
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
          ${spellSaveDc !== null ? `
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${spellSaveDc}</div>
            <div class="sheet-stat-label">Spell Save DC</div>
          </div>
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${Schema.formatModifier(spellAtk)}</div>
            <div class="sheet-stat-label">Spell Attack</div>
          </div>` : ""}
          ${legendaryCount > 0 ? `
          <div class="sheet-stat-box sheet-boss-only" style="${bossActive ? "" : "display:none"}">
            <div class="sheet-stat-value">${legendaryCount}</div>
            <div class="sheet-stat-label">Legendary Actions</div>
          </div>` : ""}
          ${regenAmount > 0 ? `
          <div class="sheet-stat-box sheet-boss-only" style="${bossActive ? "" : "display:none"}">
            <div class="sheet-stat-value">${regenAmount}</div>
            <div class="sheet-stat-label">Regen / Turn</div>
          </div>` : ""}
        </div>

        ${acModesHTML ? `<div class="sheet-ac-modes">${acModesHTML}</div>` : ""}
        ${speedParts  ? `<div class="sheet-speed-row">${speedParts}</div>` : ""}

        ${boss?.regeneration?.disabledBy?.length ? `
        <div class="sheet-boss-only text-sm text-muted" style="${bossActive ? "" : "display:none"};margin-top:var(--space-2)">
          ⚠ Regeneration disabled by: ${esc(boss.regeneration.disabledBy.join(", "))}
        </div>` : ""}
      </section>
    `;
  }

  // ─── Ability Scores ──────────────────────────────────────────────────────────

  function renderAbilityScores(dnd) {
    const stats     = dnd.stats || {};
    const spellAbil = dnd.spellcastingAbility || "";
    const ABBRS     = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };
    const FULL      = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const boxes = Object.entries(ABBRS).map(([key, abbr]) => {
      const score    = stats[key]?.score ?? 10;
      const modifier = Schema.getAbilityModifier(score);
      const isSpell  = key === spellAbil;
      return `
        <div class="sheet-ability-box ${isSpell ? "sheet-ability-spellcasting" : ""}" title="${FULL[key]}">
          <div class="sheet-ability-abbr">${abbr}</div>
          <div class="sheet-ability-score">${score}</div>
          <div class="sheet-ability-mod">${Schema.formatModifier(modifier)}</div>
          ${isSpell ? `<div class="sheet-ability-spellmark">✦</div>` : ""}
        </div>`;
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
    const stats     = dnd.stats || {};
    const profBonus = dnd.proficiencyBonus || 2;
    const profList  = dnd.savingThrowProficiencies || [];
    const FULL      = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const rows = Object.entries(FULL).map(([key, label]) => {
      const score      = stats[key]?.score ?? 10;
      const baseMod    = Schema.getAbilityModifier(score);
      const proficient = profList.includes(key);
      const total      = proficient ? baseMod + profBonus : baseMod;
      return `
        <div class="sheet-save-row">
          <span class="sheet-prof-dot ${proficient ? "proficient" : ""}"></span>
          <span class="sheet-save-bonus">${Schema.formatModifier(total)}</span>
          <span class="sheet-save-label">${label}</span>
        </div>`;
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

    const rows = Schema.SKILLS.map(({ name, ability }) => {
      const profEntry    = profList.find(p => p.skill === name);
      const isProficient = !!profEntry;
      const isExpert     = profEntry?.expertise ?? false;
      const score    = stats[ability]?.score ?? 10;
      const baseMod  = Schema.getAbilityModifier(score);
      const bonus    = isExpert ? baseMod + profBonus * 2 : isProficient ? baseMod + profBonus : baseMod;
      const dotClass = isExpert ? "expert" : isProficient ? "proficient" : "";
      const abilAbbr = ability.toUpperCase().slice(0, 3);
      return `
        <div class="sheet-skill-row">
          <span class="sheet-prof-dot ${dotClass}"></span>
          <span class="sheet-skill-bonus">${Schema.formatModifier(bonus)}</span>
          <span class="sheet-skill-label">${name}</span>
          <span class="sheet-skill-ability text-muted">${abilAbbr}</span>
        </div>`;
    }).join("");

    return `
      <section class="sheet-section sheet-section-half">
        <h2 class="sheet-section-title">🎯 Skills</h2>
        <div class="sheet-skill-list">${rows}</div>
      </section>
    `;
  }

  // ─── Boss Attacks ────────────────────────────────────────────────────────────

  function renderAttacks(boss) {
    const isActive = boss.bossActive ?? false;
    const rows = (boss.attacks || []).map(attack => {
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
            <span><strong>To Hit:</strong> ${hitBonus}</span>
            <span><strong>Reach:</strong> ${esc(attack.reach || "5 ft")}</span>
            ${dmgParts ? `<span><strong>Damage:</strong> ${dmgParts} ${avgDmg}</span>` : ""}
          </div>
          ${attack.onHit       ? `<div class="sheet-attack-onhit text-sm text-muted">On hit: ${esc(attack.onHit)}</div>` : ""}
          ${attack.description ? `<div class="sheet-attack-desc text-sm">${esc(attack.description)}</div>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">⚔️ Attacks</h2>
        <div class="sheet-attack-list">${rows}</div>
      </section>
    `;
  }

  // ─── Boss Defences ───────────────────────────────────────────────────────────

  function renderBossDefences(boss) {
    const isActive       = boss.bossActive ?? false;
    const resistances    = parseBadgeList(boss.resistances);
    const immunities     = parseBadgeList(boss.immunities);
    const condImmune     = parseBadgeList(boss.conditionImmunities);
    const weaknesses     = boss.weaknesses || [];

    if (!resistances.length && !immunities.length && !condImmune.length && !weaknesses.length) return "";

    const resistBadges = resistances.map(r => `<span class="sheet-resistance-badge resist">${esc(r)}</span>`).join("");
    const immuneBadges = immunities.map(i => `<span class="sheet-resistance-badge immune">${esc(i)}</span>`).join("");
    const condBadges   = condImmune.map(c => `<span class="sheet-resistance-badge condition-immune">${esc(c)}</span>`).join("");
    const weakEntries  = weaknesses.map(w => `<div class="sheet-weakness-entry text-sm">⚠ ${esc(w.description || "")}</div>`).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">🛡 Defences</h2>
        ${resistBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Resistances</span><div class="sheet-resistance-badges">${resistBadges}</div></div>` : ""}
        ${immuneBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Damage Immunities</span><div class="sheet-resistance-badges">${immuneBadges}</div></div>` : ""}
        ${condBadges   ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Condition Immunities</span><div class="sheet-resistance-badges">${condBadges}</div></div>` : ""}
        ${weakEntries  ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Weaknesses</span><div>${weakEntries}</div></div>` : ""}
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
    const isActive = boss.bossActive ?? false;
    const cards = (boss.polymorphTraits || []).map(trait => `
      <div class="sheet-polymorph-card ${trait.active ? "active" : ""}">
        <div class="sheet-polymorph-name">${esc(trait.name || "(Unnamed)")}</div>
        ${trait.description ? `<div class="sheet-polymorph-desc text-sm">${esc(trait.description)}</div>` : ""}
        ${trait.active ? `<span class="sheet-polymorph-active-badge">Active</span>` : ""}
      </div>`
    ).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">🔀 Polymorph Traits</h2>
        <div class="sheet-polymorph-grid">${cards}</div>
      </section>
    `;
  }

  // ─── Boss Special Rules ──────────────────────────────────────────────────────

  function renderBossSpecialRules(boss) {
    if (!boss.deathRule && !boss.tamedRule) return "";
    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📜 Special Rules</h2>
        ${boss.deathRule ? `<div class="sheet-special-rule"><span class="sheet-special-rule-label">Death Rule</span><p class="sheet-prose text-sm">${esc(boss.deathRule)}</p></div>` : ""}
        ${boss.tamedRule ? `<div class="sheet-special-rule"><span class="sheet-special-rule-label">Tamed Rule</span><p class="sheet-prose text-sm">${esc(boss.tamedRule)}</p></div>` : ""}
      </section>
    `;
  }

  // ─── Feats & Multiclass ──────────────────────────────────────────────────────

  function renderFeatsAndMulticlass(dnd) {
    const feats      = dnd.feats      || [];
    const multiclass = dnd.multiclass || [];
    if (!feats.length && !multiclass.length) return "";

    const featEntries = feats.map(feat => `
      <div class="sheet-feat-entry">
        <span class="sheet-feat-name">${esc(feat.name || "(Unnamed)")}</span>
        ${feat.description ? `<div class="sheet-feat-desc text-sm text-muted">${esc(feat.description)}</div>` : ""}
      </div>`
    ).join("");

    const multiEntries = multiclass.map(mc => `
      <div class="sheet-multiclass-entry">
        <span class="sheet-multiclass-class">${esc(mc.class || "")}</span>
        ${mc.subclass ? `<span class="text-muted"> / ${esc(mc.subclass)}</span>` : ""}
        ${mc.level    ? `<span class="sheet-multiclass-level"> — Lv.${mc.level}</span>` : ""}
      </div>`
    ).join("");

    return `
      <section class="sheet-section">
        ${multiclass.length ? `<h2 class="sheet-section-title">🔀 Multiclass</h2><div class="sheet-multiclass-list">${multiEntries}</div>` : ""}
        ${feats.length ? `<h2 class="sheet-section-title" style="margin-top:var(--space-4)">🏅 Feats</h2><div class="sheet-feat-list">${featEntries}</div>` : ""}
      </section>
    `;
  }

  // ─── Roblox Section ──────────────────────────────────────────────────────────

  function renderRobloxSection(roblox) {
    const catalogItems   = roblox.catalogItems   || [];
    const outfitCommands = roblox.outfitCommands || "";
    if (!catalogItems.length && !outfitCommands) return "";

    // Group items by category
    const grouped = {};
    catalogItems.forEach(item => {
      const cat = item.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    const categoryOrder = ["hair", "hat", "face", "shirt", "pants", "shoes", "accessory", "gear", "other"];
    const sorted = [
      ...categoryOrder.filter(c => grouped[c]),
      ...Object.keys(grouped).filter(c => !categoryOrder.includes(c)),
    ];

    const catalogHTML = sorted.map(cat => {
      const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
      const links = grouped[cat].map(item =>
        item.url
          ? `<a href="${escAttr(item.url)}" class="sheet-roblox-item-link" target="_blank" rel="noopener noreferrer">${esc(item.name || "(Unnamed)")}</a>`
          : `<span class="sheet-roblox-item-name">${esc(item.name || "(Unnamed)")}</span>`
      ).join("");
      return `
        <div class="sheet-roblox-category">
          <span class="sheet-roblox-category-label">${esc(catLabel)}</span>
          <div class="sheet-roblox-item-list">${links}</div>
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎮 Roblox Outfit</h2>
        ${catalogItems.length ? `<div class="sheet-roblox-catalog">${catalogHTML}</div>` : ""}
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

    const levelGroups = Object.keys(grouped).map(Number).sort((a, b) => a - b).map(level => {
      const levelLabel = level === 0 ? "Cantrips" : `Level ${level}`;
      const slot = spellSlots[level];
      const slotDisplay = slot
        ? `<span class="sheet-spell-slot-tracker">${renderSlotPips(slot.current, slot.max)}</span>`
        : "";
      const entries = grouped[level].map(spell => renderSpellEntry(spell)).join("");
      return `
        <div class="sheet-spell-level-group">
          <div class="sheet-spell-level-header">
            <span class="sheet-spell-level-label">${levelLabel}</span>
            ${slotDisplay}
          </div>
          ${entries}
        </div>`;
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
    const details = [
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
      </div>`;
  }

  // ─── Abilities ───────────────────────────────────────────────────────────────

  function renderAbilities(abilities) {
    const entries = abilities.map(ability => {
      const typeBadge   = ability.type   ? `<span class="sheet-ability-type-badge">${esc(ability.type.replace(/_/g, " "))}</span>` : "";
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
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚡ Abilities &amp; Traits</h2>
        <div class="sheet-ability-list">${entries}</div>
      </section>
    `;
  }

  // ─── Inventory ───────────────────────────────────────────────────────────────

  function hasInventoryContent(inventory, currency) {
    return inventory.length > 0 || Object.values(currency || {}).some(v => v > 0);
  }

  function renderInventory(inventory, currency) {
    const rows = inventory.map(item => {
      const qty          = item.quantity != null && item.quantity !== 1 ? `<span class="sheet-item-qty">×${item.quantity}</span>` : "";
      const typeBadge    = item.type    ? `<span class="sheet-item-type-badge">${esc(item.type)}</span>` : "";
      const attunedBadge = item.attuned ? `<span class="sheet-attuned-badge">Attuned</span>` : "";
      const tags         = (item.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
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
        </div>`;
    }).join("");

    const currencyOrder = [["pp","Platinum"],["gp","Gold"],["ep","Electrum"],["sp","Silver"],["cp","Copper"]];
    const currencyPills = currencyOrder
      .filter(([k]) => (currency?.[k] || 0) > 0)
      .map(([k, label]) =>
        `<span class="sheet-currency-pill">
          <span class="sheet-currency-amount">${currency[k]}</span>
          <span class="sheet-currency-label">${label}</span>
        </span>`
      ).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">🎒 Inventory</h2>
        ${currencyPills ? `<div class="sheet-currency-row">${currencyPills}</div>` : ""}
        ${rows ? `<div class="sheet-item-list">${rows}</div>` : ""}
      </section>
    `;
  }

  // ─── Resources ───────────────────────────────────────────────────────────────

  function hasResourceContent(dnd, resources) {
    return (dnd?.hp?.log?.length > 0) || resources.length > 0;
  }

  function renderResources(dnd, customResources) {
    const hpLogSection = (dnd?.hp?.log?.length > 0) ? `
      <div class="sheet-resource-block">
        <div class="sheet-resource-header">
          <span class="sheet-resource-name">HP Log</span>
          <span class="sheet-resource-values">${dnd.hp.current} / ${dnd.hp.max} HP</span>
        </div>
        <div class="sheet-resource-log">
          ${dnd.hp.log.slice(0, 10).map(e => renderLogEntry(e)).join("")}
          ${dnd.hp.log.length > 10 ? `<div class="text-muted text-sm">…${dnd.hp.log.length - 10} earlier entries</div>` : ""}
        </div>
      </div>` : "";

    const customBlocks = customResources.map(res => {
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
            ${res.log.slice(0, 6).map(e => renderLogEntry(e)).join("")}
            ${res.log.length > 6 ? `<div class="text-muted text-sm">…${res.log.length - 6} earlier entries</div>` : ""}
          </div>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📊 Resources</h2>
        ${hpLogSection}
        ${customBlocks}
      </section>
    `;
  }

  function renderLogEntry(entry) {
    const sign = entry.delta >= 0 ? "+" : "";
    const cls  = entry.delta >= 0 ? "sheet-log-positive" : "sheet-log-negative";
    return `
      <div class="sheet-log-entry">
        <span class="sheet-log-delta ${cls}">${sign}${entry.delta}</span>
        <span class="sheet-log-reason">${esc(entry.reason || "")}</span>
        <span class="sheet-log-date text-muted">${esc(entry.date || "")}</span>
      </div>`;
  }

  // ─── Notes ───────────────────────────────────────────────────────────────────

  function renderNotes(notes) {
    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">📝 Notes</h2>
        <div class="sheet-prose sheet-notes">${esc(notes)}</div>
      </section>
    `;
  }

  // ─── Escape Helpers ──────────────────────────────────────────────────────────

  function esc(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function escAttr(text) {
    return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  return { buildHTML, wireInteractive };

})();
