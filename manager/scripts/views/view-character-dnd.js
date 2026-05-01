/**
 * view-character-dnd.js
 * D&D combat, core stats, saves, skills, and feats/multiclass sections.
 *
 * Boss characters use dnd.stats as their base/tamed body and boss.bossStatBonuses
 * as the temporary overlay. The renderer shows both numbers so the sheet makes
 * the state change obvious instead of burying it in prose.
 */

const ViewCharacterDnd = (() => {

  const esc = ViewCharacterUtils.esc;
  const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

  function renderCombatBlock(dnd, boss) {
    const bossActive = boss?.bossActive ?? false;
    const hp = getActiveHp(dnd, boss);
    const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";
    const profBonus = Number(dnd.proficiencyBonus || 2);
    const acPair = getAcPair(dnd, boss);
    const initiativePair = getInitiativePair(dnd, boss);
    const spellcasting = getSpellcastingPair(dnd, boss);
    const legendaryCount = Number(boss?.legendaryActions || 0);
    const regenAmount = Number(boss?.regeneration?.amount || 0);

    const speedParts = renderSpeed(dnd.speed || {});
    const acModesHTML = renderAcModes(dnd, boss);
    const stateOverview = boss ? renderStateOverview(dnd, boss, acPair, initiativePair, spellcasting) : "";
    const hpBreakdown = boss ? renderHpBreakdown(boss) : "";
    const rollCalculator = boss ? renderRollCalculator(boss, spellcasting) : "";

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">Combat</h2>

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
          <div class="sheet-state-mini-row text-sm">
            <span>Boss HP ${boss.bossHp?.max ?? 0}</span>
            <span>Tamed HP ${boss.defaultHp?.max ?? 0}</span>
          </div>` : ""}
        </div>

        ${stateOverview}

        <div class="sheet-combat-row">
          ${renderStateStatBox("Armor Class", acPair.tamed?.value, acPair.boss?.value, bossActive, boss)}
          ${renderStateStatBox("Initiative", formatSigned(initiativePair.tamed), formatSigned(initiativePair.boss), bossActive, boss)}
          <div class="sheet-stat-box">
            <div class="sheet-stat-value">${formatSigned(profBonus)}</div>
            <div class="sheet-stat-label">Prof. Bonus</div>
          </div>
          ${spellcasting ? `
          ${renderStateStatBox("Spell Save DC", spellcasting.tamedDc, spellcasting.bossDc, bossActive, boss)}
          ${renderStateStatBox("Spell/Flesh Attack", formatSigned(spellcasting.tamedAttack), formatSigned(spellcasting.bossAttack), bossActive, boss)}
          ` : ""}
          ${legendaryCount > 0 ? `
          <div class="sheet-stat-box sheet-boss-only" style="${stateStyle(bossActive, true)}">
            <div class="sheet-stat-value">${legendaryCount}</div>
            <div class="sheet-stat-label">Legendary Actions</div>
          </div>` : ""}
          ${regenAmount > 0 ? `
          <div class="sheet-stat-box sheet-boss-only" style="${stateStyle(bossActive, true)}">
            <div class="sheet-stat-value">${regenAmount}</div>
            <div class="sheet-stat-label">Regen / Turn</div>
          </div>` : ""}
        </div>

        ${acModesHTML}
        ${speedParts}
        ${hpBreakdown}
        ${rollCalculator}

        ${boss?.regeneration?.disabledBy?.length ? `
        <div class="sheet-boss-only text-sm text-muted" style="${stateStyle(bossActive, true)};margin-top:var(--space-2)">
          Regeneration disabled by: ${esc(boss.regeneration.disabledBy.join(", "))}
        </div>` : ""}
      </section>
    `;
  }

  function renderAbilityScores(dnd, boss = null) {
    const stats = dnd.stats || {};
    const spellAbil = dnd.spellcastingAbility || "";
    const bossActive = boss?.bossActive ?? false;

    const boxes = ABILITY_ORDER.map(key => {
      const abbr = Schema.ABILITY_ABBREVIATIONS[key];
      const label = Schema.ABILITY_NAMES[key];
      const baseScore = getBaseScore(stats, key);
      const bossBonus = getBossBonus(boss, key);
      const bossScore = baseScore + bossBonus;
      const baseMod = Schema.getAbilityModifier(baseScore);
      const bossMod = Schema.getAbilityModifier(bossScore);
      const isSpell = key === spellAbil;
      const hasBossDelta = boss && bossBonus !== 0;

      return `
        <div class="sheet-ability-box ${isSpell ? "sheet-ability-spellcasting" : ""}" title="${esc(label)}">
          <div class="sheet-ability-abbr">${abbr}</div>
          <div class="sheet-ability-score">
            ${renderStateValue(baseScore, bossScore, bossActive, boss)}
          </div>
          <div class="sheet-ability-mod">
            ${renderStateValue(formatSigned(baseMod), formatSigned(bossMod), bossActive, boss)}
          </div>
          ${boss ? `
          <div class="sheet-ability-breakdown">
            <span class="sheet-mode-line sheet-mode-tamed">Base ${baseScore} (${formatSigned(baseMod)})</span>
            <span class="sheet-mode-line sheet-mode-boss ${hasBossDelta ? "has-delta" : ""}">
              Boss ${formatSigned(bossBonus)} = ${bossScore} (${formatSigned(bossMod)})
            </span>
          </div>` : ""}
          ${isSpell ? `<div class="sheet-ability-spellmark">Spellcasting</div>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">Ability Scores</h2>
        <div class="sheet-ability-grid">${boxes}</div>
        ${spellAbil ? `<p class="text-muted text-sm" style="margin-top:var(--space-2)">Spellcasting ability: ${esc(Schema.ABILITY_NAMES[spellAbil] || spellAbil)}</p>` : ""}
      </section>
    `;
  }

  function renderSavingThrows(dnd, boss = null) {
    const stats = dnd.stats || {};
    const profBonus = Number(dnd.proficiencyBonus || 2);
    const profList = dnd.savingThrowProficiencies || [];
    const bossActive = boss?.bossActive ?? false;
    const allAdvantage = Boolean(boss?.addons?.calculations?.allRollsAdvantage);

    const rows = ABILITY_ORDER.map(key => {
      const label = Schema.ABILITY_NAMES[key];
      const baseScore = getBaseScore(stats, key);
      const bossScore = baseScore + getBossBonus(boss, key);
      const baseMod = Schema.getAbilityModifier(baseScore);
      const bossMod = Schema.getAbilityModifier(bossScore);
      const proficient = profList.includes(key);
      const baseTotal = baseMod + (proficient ? profBonus : 0);
      const bossTotal = bossMod + (proficient ? profBonus : 0);

      return `
        <div class="sheet-save-row">
          <span class="sheet-prof-dot ${proficient ? "proficient" : ""}"></span>
          <span class="sheet-save-bonus">${renderStateValue(formatSigned(baseTotal), formatSigned(bossTotal), bossActive, boss)}</span>
          <span class="sheet-save-label">${label}</span>
          ${boss && allAdvantage ? `<span class="sheet-state-chip sheet-boss-only" style="${stateStyle(bossActive, true)}">Advantage</span>` : ""}
          ${boss ? `<span class="sheet-save-breakdown text-muted">Base ${formatSigned(baseMod)}${proficient ? ` + prof ${formatSigned(profBonus)}` : ""}; Boss ${formatSigned(bossMod)}${proficient ? ` + prof ${formatSigned(profBonus)}` : ""}</span>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="sheet-section sheet-section-half">
        <h2 class="sheet-section-title">Saving Throws</h2>
        <div class="sheet-save-list">${rows}</div>
      </section>
    `;
  }

  function renderSkills(dnd, boss = null) {
    const stats = dnd.stats || {};
    const profBonus = Number(dnd.proficiencyBonus || 2);
    const profList = dnd.skillProficiencies || [];
    const bossActive = boss?.bossActive ?? false;
    const skillOverrides = boss?.addons?.calculations?.skillOverrides || {};
    const allAdvantage = Boolean(boss?.addons?.calculations?.allRollsAdvantage);

    const rows = Schema.SKILLS.map(({ name, ability }) => {
      const profEntry = profList.find(p => p.skill === name);
      const isProficient = !!profEntry;
      const isExpert = profEntry?.expertise ?? false;
      const baseScore = getBaseScore(stats, ability);
      const bossScore = baseScore + getBossBonus(boss, ability);
      const baseMod = Schema.getAbilityModifier(baseScore);
      const bossMod = Schema.getAbilityModifier(bossScore);
      const baseBonus = isExpert ? baseMod + profBonus * 2 : isProficient ? baseMod + profBonus : baseMod;
      const bossBonus = isExpert ? bossMod + profBonus * 2 : isProficient ? bossMod + profBonus : bossMod;
      const override = skillOverrides[name] || null;
      const displayBase = override?.tamedBonus ?? baseBonus;
      const displayBoss = override?.bossBonus ?? bossBonus;
      const dotClass = isExpert ? "expert" : isProficient ? "proficient" : "";
      const abilAbbr = Schema.ABILITY_ABBREVIATIONS[ability];
      const advantage = override?.advantageWhenBoss ?? (allAdvantage && isProficient);

      return `
        <div class="sheet-skill-row">
          <span class="sheet-prof-dot ${dotClass}"></span>
          <span class="sheet-skill-bonus">${renderStateValue(formatSigned(displayBase), formatSigned(displayBoss), bossActive, boss)}</span>
          <span class="sheet-skill-label">${name}</span>
          <span class="sheet-skill-ability text-muted">${abilAbbr}</span>
          ${boss && advantage ? `<span class="sheet-state-chip sheet-boss-only" style="${stateStyle(bossActive, true)}">Adv</span>` : ""}
          ${override?.note ? `<span class="sheet-skill-note text-muted">${esc(override.note)}</span>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="sheet-section sheet-section-half">
        <h2 class="sheet-section-title">Skills</h2>
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
        ${mc.level ? `<span class="sheet-multiclass-level"> - Lv.${mc.level}</span>` : ""}
      </div>
    `).join("");

    return `
      <section class="sheet-section">
        ${multiclass.length ? `<h2 class="sheet-section-title">Multiclass</h2><div class="sheet-multiclass-list">${multiEntries}</div>` : ""}
        ${feats.length ? `<h2 class="sheet-section-title" style="margin-top:var(--space-4)">Feats</h2><div class="sheet-feat-list">${featEntries}</div>` : ""}
      </section>
    `;
  }

  function renderStateOverview(dnd, boss, acPair, initiativePair, spellcasting) {
    const bossActive = boss.bossActive ?? false;
    const stateModel = boss.addons?.stateModel || {};
    const tamedLabel = stateModel.tamedLabel || "Tamed / Default";
    const bossLabel = stateModel.bossLabel || "Boss Presence";
    const bonusText = ABILITY_ORDER
      .map(key => `${Schema.ABILITY_ABBREVIATIONS[key]} ${formatSigned(getBossBonus(boss, key))}`)
      .join(", ");

    return `
      <div class="sheet-state-grid">
        <div class="sheet-state-card sheet-mode-tamed ${bossActive ? "" : "active"}">
          <div class="sheet-state-card-label">${esc(tamedLabel)}</div>
          <div class="sheet-state-card-main">${boss.defaultHp?.max ?? dnd.hp?.max ?? 0} HP / AC ${acPair.tamed?.value ?? "-"}</div>
          <div class="sheet-state-card-sub">Initiative ${formatSigned(initiativePair.tamed)}; Spell DC ${spellcasting?.tamedDc ?? "-"}</div>
        </div>
        <div class="sheet-state-card sheet-mode-boss ${bossActive ? "active" : ""}">
          <div class="sheet-state-card-label">${esc(bossLabel)}</div>
          <div class="sheet-state-card-main">${boss.bossHp?.max ?? 0} HP / AC ${acPair.boss?.value ?? "-"}</div>
          <div class="sheet-state-card-sub">Initiative ${formatSigned(initiativePair.boss)}; Spell DC ${spellcasting?.bossDc ?? "-"}</div>
          <div class="sheet-state-card-sub">${esc(bonusText)}</div>
        </div>
      </div>
    `;
  }

  function renderHpBreakdown(boss) {
    const breakdown = boss.addons?.hpBreakdown || [];
    if (!breakdown.length) return "";

    const rows = breakdown.map(group => `
      <div class="sheet-breakdown-card sheet-mode-${esc(group.state || "neutral")}">
        <div class="sheet-breakdown-title">${esc(group.label || "HP")}: ${group.total ?? ""}</div>
        ${(group.parts || []).map(part => `<div class="sheet-breakdown-line text-sm"><span>${esc(part.label || "")}</span><strong>${esc(part.value ?? "")}</strong></div>`).join("")}
        ${group.note ? `<div class="sheet-breakdown-note text-muted text-sm">${esc(group.note)}</div>` : ""}
      </div>
    `).join("");

    return `<div class="sheet-breakdown-grid">${rows}</div>`;
  }

  function renderRollCalculator(boss, spellcasting) {
    const rolls = boss.addons?.calculations?.rolls || [];
    if (!rolls.length && !spellcasting) return "";
    const bossActive = boss.bossActive ?? false;

    const computedRows = spellcasting ? [
      {
        label: "Spell Save DC",
        tamed: spellcasting.tamedDc,
        boss: spellcasting.bossDc,
        note: spellcasting.dcNote,
      },
      {
        label: "Spell/Flesh Attack",
        tamed: formatSigned(spellcasting.tamedAttack),
        boss: formatSigned(spellcasting.bossAttack),
        note: spellcasting.attackNote,
      },
    ] : [];

    const allRows = [...computedRows, ...rolls];
    const rows = allRows.map(row => `
      <div class="sheet-roll-row">
        <div>
          <div class="sheet-roll-label">${esc(row.label || "")}</div>
          ${row.note ? `<div class="sheet-roll-note text-muted">${esc(row.note)}</div>` : ""}
        </div>
        <div class="sheet-roll-values">
          ${renderStateValue(row.tamed ?? row.default ?? "-", row.boss ?? "-", bossActive, boss)}
          ${row.bossAdvantage ? `<span class="sheet-state-chip sheet-boss-only" style="${stateStyle(bossActive, true)}">Advantage</span>` : ""}
          ${row.floor ? `<span class="sheet-state-chip">Floor ${esc(row.floor)}</span>` : ""}
        </div>
      </div>
    `).join("");

    return `
      <div class="sheet-roll-calculator">
        <div class="sheet-subsection-title">Roll Calculator</div>
        ${rows}
      </div>
    `;
  }

  function renderAcModes(dnd, boss) {
    const modes = dnd.acModes || [];
    if (!modes.length) return "";

    const bossActive = boss?.bossActive ?? false;
    const rows = modes.map(mode => {
      const state = mode.state || "all";
      const stateClass = state === "boss" ? "sheet-boss-only" : state === "tamed" ? "sheet-tamed-only" : "";
      const style = state === "boss" ? stateStyle(bossActive, true) : state === "tamed" ? stateStyle(!bossActive, true) : "";
      const conditional = mode.conditional ? `<span class="sheet-state-chip">Conditional</span>` : "";
      return `
        <div class="sheet-ac-mode ${mode.active ? "active" : ""} ${stateClass}" style="${style}">
          <span class="sheet-ac-value">${mode.value}</span>
          <span class="sheet-ac-label">${esc(mode.label)}</span>
          ${mode.formula ? `<span class="sheet-ac-formula text-muted">${esc(mode.formula)}</span>` : ""}
          ${conditional}
        </div>
      `;
    }).join("");

    return `<div class="sheet-ac-modes">${rows}</div>`;
  }

  function renderSpeed(speed) {
    const parts = Object.entries(speed)
      .filter(([, value]) => Number(value) > 0)
      .map(([key, value]) => `
        <span class="sheet-speed-item">
          <span class="sheet-speed-value">${value}</span>
          <span class="sheet-speed-label">${esc(key)}</span>
        </span>
      `).join("");

    return parts ? `<div class="sheet-speed-row">${parts}</div>` : "";
  }

  function renderStateStatBox(label, tamedValue, bossValue, bossActive, boss) {
    return `
      <div class="sheet-stat-box">
        <div class="sheet-stat-value">${renderStateValue(tamedValue ?? "-", bossValue ?? tamedValue ?? "-", bossActive, boss)}</div>
        <div class="sheet-stat-label">${esc(label)}</div>
      </div>
    `;
  }

  function renderStateValue(tamedValue, bossValue, bossActive, boss) {
    if (!boss) return esc(tamedValue);
    return `
      <span class="sheet-tamed-only" style="${stateStyle(!bossActive, true)}">${esc(tamedValue)}</span>
      <span class="sheet-boss-only" style="${stateStyle(bossActive, true)}">${esc(bossValue)}</span>
    `;
  }

  function getActiveHp(dnd, boss) {
    if (!boss) return dnd.hp || { current: 0, max: 0 };
    return boss.bossActive
      ? (boss.bossHp || { current: 0, max: 0 })
      : (boss.defaultHp || { current: 0, max: 0 });
  }

  function getAcPair(dnd, boss) {
    return {
      tamed: getAcForState(dnd, "tamed"),
      boss: boss ? getAcForState(dnd, "boss") : getAcForState(dnd, "tamed"),
    };
  }

  function getAcForState(dnd, state) {
    const modes = dnd.acModes || [];
    const stateModes = modes.filter(mode => !mode.state || mode.state === state || (Array.isArray(mode.states) && mode.states.includes(state)));
    return stateModes.find(mode => mode.active && !mode.conditional)
      || stateModes.find(mode => !mode.conditional)
      || modes.find(mode => mode.active)
      || modes[0]
      || null;
  }

  function getInitiativePair(dnd, boss) {
    const config = dnd.addons?.initiative || boss?.addons?.calculations?.initiative || {};
    if (!boss && typeof dnd.initiative === "number") return { tamed: Number(dnd.initiative), boss: Number(dnd.initiative) };

    const ability = config.ability || "dex";
    const bonus = Number(config.bonus || 0);
    const baseScore = getBaseScore(dnd.stats || {}, ability);
    return {
      tamed: Schema.getAbilityModifier(baseScore) + bonus,
      boss: Schema.getAbilityModifier(baseScore + getBossBonus(boss, ability)) + bonus,
    };
  }

  function getSpellcastingPair(dnd, boss) {
    const ability = dnd.spellcastingAbility || dnd.addons?.spellcasting?.ability;
    if (!ability) return null;

    const profBonus = Number(dnd.proficiencyBonus || 2);
    const config = {
      ...(dnd.addons?.spellcasting || {}),
      ...(boss?.addons?.calculations?.spellcasting || {}),
    };
    const dcBonus = Number(config.dcBonus || 0);
    const attackBonus = Number(config.attackBonus || 0);
    const bonusLabel = config.bonusLabel || "Bonus";
    const baseScore = getBaseScore(dnd.stats || {}, ability);
    const bossScore = baseScore + getBossBonus(boss, ability);
    const baseMod = Schema.getAbilityModifier(baseScore);
    const bossMod = Schema.getAbilityModifier(bossScore);

    return {
      ability,
      tamedDc: 8 + profBonus + baseMod + dcBonus,
      bossDc: 8 + profBonus + bossMod + dcBonus,
      tamedAttack: profBonus + baseMod + attackBonus,
      bossAttack: profBonus + bossMod + attackBonus,
      dcNote: `8 + ${Schema.ABILITY_ABBREVIATIONS[ability]} + proficiency${dcBonus ? ` + ${bonusLabel} ${formatSigned(dcBonus)}` : ""}`,
      attackNote: `${Schema.ABILITY_ABBREVIATIONS[ability]} + proficiency${attackBonus ? ` + ${bonusLabel} ${formatSigned(attackBonus)}` : ""}`,
    };
  }

  function getBaseScore(stats, ability) {
    return Number(stats?.[ability]?.score ?? 10);
  }

  function getBossBonus(boss, ability) {
    return Number(boss?.bossStatBonuses?.[ability] ?? 0);
  }

  function formatSigned(value) {
    const number = Number(value || 0);
    return Schema.formatModifier(number);
  }

  function stateStyle(isVisible, includeDisplay) {
    if (!includeDisplay) return "";
    return isVisible ? "" : "display:none";
  }

  return {
    renderCombatBlock,
    renderAbilityScores,
    renderSavingThrows,
    renderSkills,
    renderFeatsAndMulticlass,
  };

})();
