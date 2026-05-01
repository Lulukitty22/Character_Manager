/**
 * view-character-dnd.js
 * D&D combat, core stats, saves, skills, and feats/multiclass sections.
 */

const ViewCharacterDnd = (() => {

  const esc = ViewCharacterUtils.esc;
  const escAttr = ViewCharacterUtils.escAttr;

  function renderCombatBlock(dnd, boss) {
    const bossActive = boss?.bossActive ?? false;
    const hp = boss
      ? (bossActive ? (boss.bossHp || { current: 0, max: 0 }) : (boss.defaultHp || { current: 0, max: 0 }))
      : (dnd.hp || { current: 0, max: 0 });

    const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";

    const activeAc = (dnd.acModes || []).find(m => m.active) || (dnd.acModes || [])[0];
    const profBonus = dnd.proficiencyBonus || 2;
    const spellAbil = dnd.spellcastingAbility || "";
    const stats = dnd.stats || {};
    const spellScore = spellAbil ? (stats[spellAbil]?.score ?? 10) : 10;
    const spellMod = Schema.getAbilityModifier(spellScore);
    const spellSaveDc = spellAbil ? (8 + profBonus + spellMod) : null;
    const spellAtk = spellAbil ? (profBonus + spellMod) : null;

    const speed = dnd.speed || {};
    const speedParts = Object.entries(speed)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `
        <span class="sheet-speed-item">
          <span class="sheet-speed-value">${value}</span>
          <span class="sheet-speed-label">${key}</span>
        </span>
      `).join("");

    const acModesHTML = (dnd.acModes || []).map(mode => `
      <div class="sheet-ac-mode ${mode.active ? "active" : ""}">
        <span class="sheet-ac-value">${mode.value}</span>
        <span class="sheet-ac-label">${esc(mode.label)}</span>
      </div>
    `).join("");

    const legendaryCount = boss?.legendaryActions || 0;
    const regenAmount = boss?.regeneration?.amount || 0;

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
        ${speedParts ? `<div class="sheet-speed-row">${speedParts}</div>` : ""}

        ${boss?.regeneration?.disabledBy?.length ? `
        <div class="sheet-boss-only text-sm text-muted" style="${bossActive ? "" : "display:none"};margin-top:var(--space-2)">
          ⚠ Regeneration disabled by: ${esc(boss.regeneration.disabledBy.join(", "))}
        </div>` : ""}
      </section>
    `;
  }

  function renderAbilityScores(dnd) {
    const stats = dnd.stats || {};
    const spellAbil = dnd.spellcastingAbility || "";
    const ABBRS = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };
    const FULL = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const boxes = Object.entries(ABBRS).map(([key, abbr]) => {
      const score = stats[key]?.score ?? 10;
      const modifier = Schema.getAbilityModifier(score);
      const isSpell = key === spellAbil;
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

  function renderSavingThrows(dnd) {
    const stats = dnd.stats || {};
    const profBonus = dnd.proficiencyBonus || 2;
    const profList = dnd.savingThrowProficiencies || [];
    const FULL = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

    const rows = Object.entries(FULL).map(([key, label]) => {
      const score = stats[key]?.score ?? 10;
      const baseMod = Schema.getAbilityModifier(score);
      const proficient = profList.includes(key);
      const total = proficient ? baseMod + profBonus : baseMod;
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

  function renderSkills(dnd) {
    const stats = dnd.stats || {};
    const profBonus = dnd.proficiencyBonus || 2;
    const profList = dnd.skillProficiencies || [];

    const rows = Schema.SKILLS.map(({ name, ability }) => {
      const profEntry = profList.find(p => p.skill === name);
      const isProficient = !!profEntry;
      const isExpert = profEntry?.expertise ?? false;
      const score = stats[ability]?.score ?? 10;
      const baseMod = Schema.getAbilityModifier(score);
      const bonus = isExpert ? baseMod + profBonus * 2 : isProficient ? baseMod + profBonus : baseMod;
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

  function renderFeatsAndMulticlass(dnd) {
    const feats = dnd.feats || [];
    const multiclass = dnd.multiclass || [];
    if (!feats.length && !multiclass.length) return "";

    const featEntries = feats.map(feat => `
      <div class="sheet-feat-entry">
        <span class="sheet-feat-name">${esc(feat.name || "(Unnamed)")}</span>
        ${feat.description ? `<div class="sheet-feat-desc text-sm text-muted">${esc(feat.description)}</div>` : ""}
      </div>
    `).join("");

    const multiEntries = multiclass.map(mc => `
      <div class="sheet-multiclass-entry">
        <span class="sheet-multiclass-class">${esc(mc.class || "")}</span>
        ${mc.subclass ? `<span class="text-muted"> / ${esc(mc.subclass)}</span>` : ""}
        ${mc.level ? `<span class="sheet-multiclass-level"> — Lv.${mc.level}</span>` : ""}
      </div>
    `).join("");

    return `
      <section class="sheet-section">
        ${multiclass.length ? `<h2 class="sheet-section-title">🔀 Multiclass</h2><div class="sheet-multiclass-list">${multiEntries}</div>` : ""}
        ${feats.length ? `<h2 class="sheet-section-title" style="margin-top:var(--space-4)">🏅 Feats</h2><div class="sheet-feat-list">${featEntries}</div>` : ""}
      </section>
    `;
  }

  return {
    renderCombatBlock,
    renderAbilityScores,
    renderSavingThrows,
    renderSkills,
    renderFeatsAndMulticlass,
  };

})();
