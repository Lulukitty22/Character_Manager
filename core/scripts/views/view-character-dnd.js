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
  const escAttr = ViewCharacterUtils.escAttr;
  const renderMechanicChips = ViewCharacterUtils.renderMechanicChips;
  const ABILITY_ORDER = ["str", "dex", "con", "int", "wis", "cha"];

  const SVG_DIV = `<svg viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg>`;

  function renderCombatBlock(dnd, boss, character = null) {
    const bossActive = boss?.bossActive ?? false;
    const hp = getActiveHp(character, dnd, boss);
    const tamedHp = character && typeof DndCalculations !== "undefined"
      ? DndCalculations.resolveTamedHp(character)
      : normalizeHpPool(boss?.defaultHp || dnd?.hp || {});
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
    const stateOverview = boss ? renderStateOverview(dnd, boss, acPair, initiativePair, spellcasting, tamedHp) : "";
    const hpBreakdown = boss ? renderHpBreakdown(boss) : "";
    const rollCalculator = boss ? renderRollCalculator(boss, spellcasting) : "";
    const hpCalc = character && typeof DndCalculations !== "undefined"
      ? DndCalculations.calculateHitPoints(character)
      : null;
    const hpCalcChips = hpCalc?.parts?.length
      ? renderMechanicChips([
        { label: "Calculated HP", value: hpCalc.total, kind: "positive", description: "Class hit dice plus Constitution and race HP bonuses." },
        ...hpCalc.parts,
      ])
      : "";

    return `
      <section class="ovh-section ovh-combat-section">
        <div class="ovh-section-header">
          <h2>Combat</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>

        <div class="ovh-card">
          <div class="ovh-hp-readout">
            <div class="nums">
              <span class="current">${hp.current}</span>
              <span class="sep">/</span>
              <span class="max">${hp.max}</span>
              <span class="label">HP</span>
              ${dnd.hp?.temp > 0 ? `<span class="temp">+${dnd.hp.temp} temp</span>` : ""}
            </div>
            <div class="ovh-hp-bar-wrap">
              <div class="ovh-hp-bar-fill ${hpClass}" style="width:${percent}%"></div>
            </div>
            ${boss ? `
            <div class="sheet-state-mini-row text-sm">
              <span>Boss HP ${boss.bossHp?.max ?? 0}</span>
              <span>Tamed HP ${tamedHp.max ?? 0}</span>
            </div>` : ""}
            ${hpCalcChips ? `<div class="ovh-hp-calc">${hpCalcChips}</div>` : ""}
          </div>
        </div>

        ${stateOverview ? `<div class="ovh-card">${stateOverview}</div>` : ""}

        <div class="ovh-card">
          <div class="ovh-combat-stats">
            ${renderStateStatBox("Armor Class", acPair.tamed?.value, acPair.boss?.value, bossActive, boss)}
            ${renderStateStatBox("Initiative", formatSigned(initiativePair.tamed), formatSigned(initiativePair.boss), bossActive, boss)}
            <div class="ovh-stat-block">
              <div class="label">Prof. Bonus</div>
              <div class="value">${formatSigned(profBonus)}</div>
            </div>
            ${spellcasting ? `
            ${renderStateStatBox("Spell Save DC", spellcasting.tamedDc, spellcasting.bossDc, bossActive, boss)}
            ${renderStateStatBox("Spell/Flesh Attack", formatSigned(spellcasting.tamedAttack), formatSigned(spellcasting.bossAttack), bossActive, boss)}
            ` : ""}
            ${legendaryCount > 0 ? `
            <div class="ovh-stat-block sheet-boss-only" style="${stateStyle(bossActive, true)}">
              <div class="label">Legendary Actions</div>
              <div class="value">${legendaryCount}</div>
            </div>` : ""}
            ${regenAmount > 0 ? `
            <div class="ovh-stat-block sheet-boss-only" style="${stateStyle(bossActive, true)}">
              <div class="label">Regen / Turn</div>
              <div class="value">${regenAmount}</div>
            </div>` : ""}
          </div>
          ${acModesHTML}
          ${speedParts}
        </div>

        ${hpBreakdown ? `<div class="ovh-card">${hpBreakdown}</div>` : ""}
        ${rollCalculator ? `<div class="ovh-card">${rollCalculator}</div>` : ""}

        ${boss?.regeneration?.disabledBy?.length ? `
        <div class="ovh-card text-sm text-muted sheet-boss-only" style="${stateStyle(bossActive, true)}">
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
        <div class="ovh-ability ${isSpell ? "spotlight" : ""}" title="${esc(label)}">
          <div class="abbr">${abbr}</div>
          <div class="score">${renderStateValue(baseScore, bossScore, bossActive, boss)}</div>
          <div class="mod">${renderStateValue(formatSigned(baseMod), formatSigned(bossMod), bossActive, boss)}</div>
          ${boss ? `
          <div class="sheet-ability-breakdown">
            <span class="sheet-mode-line sheet-mode-tamed">Base ${baseScore} (${formatSigned(baseMod)})</span>
            <span class="sheet-mode-line sheet-mode-boss ${hasBossDelta ? "has-delta" : ""}">
              Boss ${formatSigned(bossBonus)} = ${bossScore} (${formatSigned(bossMod)})
            </span>
          </div>` : ""}
          ${isSpell ? `<div class="spellmark">Spellcasting</div>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="ovh-section ovh-ability-scores-section">
        <div class="ovh-section-header">
          <h2>Ability Scores</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-card">
          <div class="ovh-ability-grid">${boxes}</div>
          ${spellAbil ? `<p class="text-muted text-sm" style="margin-top:var(--space-2)">Spellcasting ability: ${esc(Schema.ABILITY_NAMES[spellAbil] || spellAbil)}</p>` : ""}
        </div>
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
        <div class="ovh-save ${proficient ? "proficient" : ""}">
          <span class="ovh-pip ${proficient ? "prof" : ""}"></span>
          <span class="mod">${renderStateValue(formatSigned(baseTotal), formatSigned(bossTotal), bossActive, boss)}</span>
          <span class="name">${label}</span>
          ${boss && allAdvantage ? `<span class="sheet-state-chip sheet-boss-only" style="${stateStyle(bossActive, true)}">Advantage</span>` : ""}
          ${boss ? `<span class="note text-muted">Base ${formatSigned(baseMod)}${proficient ? ` + prof ${formatSigned(profBonus)}` : ""}; Boss ${formatSigned(bossMod)}${proficient ? ` + prof ${formatSigned(profBonus)}` : ""}</span>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="ovh-section ovh-saves-section">
        <div class="ovh-section-header">
          <h2>Saving Throws</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-card">
          <div class="ovh-saves-grid">${rows}</div>
        </div>
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
      const pipClass = isExpert ? "expertise" : isProficient ? "prof" : "";
      const abilAbbr = Schema.ABILITY_ABBREVIATIONS[ability];
      const advantage = override?.advantageWhenBoss ?? (allAdvantage && isProficient);

      return `
        <div class="ovh-skill ${pipClass}">
          <span class="ovh-pip ${pipClass}"></span>
          <span class="mod">${renderStateValue(formatSigned(displayBase), formatSigned(displayBoss), bossActive, boss)}</span>
          <span class="name">${name}</span>
          <span class="ability-tag">${abilAbbr}</span>
          ${boss && advantage ? `<span class="sheet-state-chip sheet-boss-only" style="${stateStyle(bossActive, true)}">Adv</span>` : ""}
          ${override?.note ? `<span class="note text-muted">${esc(override.note)}</span>` : ""}
        </div>`;
    }).join("");

    return `
      <section class="ovh-section ovh-skills-section">
        <div class="ovh-section-header">
          <h2>Skills</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-card">
          <div class="ovh-skills-grid">${rows}</div>
        </div>
      </section>
    `;
  }

  function renderFeatsAndMulticlass(dnd) {
    const feats = dnd.feats || [];
    const multiclass = dnd.multiclass || [];
    if (!feats.length && !multiclass.length) return "";

    const featEntries = feats.map(feat => {
      const mechanics = Array.isArray(feat.addons?.mechanics) ? feat.addons.mechanics : [];
      return `
        <div class="ovh-record ovh-feat-record">
          <div class="title-block">
            <span class="title">${esc(feat.name || "(Unnamed)")}</span>
            ${ViewCharacterUtils.renderOvhChips(mechanics, { className: "quick-chips" })}
          </div>
          ${feat.description ? `<div class="body"><div class="desc">${esc(feat.description)}</div></div>` : ""}
        </div>`;
    }).join("");

    const multiEntries = multiclass.map(mc => `
      <div class="ovh-row">
        <span class="k">${esc(mc.class || "")}${mc.subclass ? ` / ${esc(mc.subclass)}` : ""}</span>
        ${mc.level ? `<span class="v">Lv.${mc.level}</span>` : ""}
      </div>`).join("");

    return `
      <section class="ovh-section ovh-feats-section">
        <div class="ovh-section-header">
          <h2>Feats &amp; Classes</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-card">
          ${multiclass.length ? `<p class="ovh-group-label">Multiclass</p><div class="ovh-identity-rows">${multiEntries}</div>` : ""}
          ${feats.length ? `${multiclass.length ? `<p class="ovh-group-label" style="margin-top:var(--space-4)">Feats</p>` : ""}<div class="ovh-feat-list">${featEntries}</div>` : ""}
        </div>
      </section>
    `;
  }

  function renderStateOverview(dnd, boss, acPair, initiativePair, spellcasting, tamedHp) {
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
          <div class="sheet-state-card-main">${tamedHp?.max ?? boss.defaultHp?.max ?? dnd.hp?.max ?? 0} HP / AC ${acPair.tamed?.value ?? "-"}</div>
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
        breakdown: spellcasting.dcBreakdown,
      },
      {
        label: "Spell/Flesh Attack",
        tamed: formatSigned(spellcasting.tamedAttack),
        boss: formatSigned(spellcasting.bossAttack),
        breakdown: spellcasting.attackBreakdown,
      },
    ] : [];

    const allRows = [...computedRows, ...rolls];
    const rows = allRows.map(row => {
      const mechanics = [
        row.bossAdvantage ? {
          label: "Advantage",
          kind: "positive",
          description: "Boss-state roll uses advantage unless another rule says otherwise.",
        } : null,
        row.floor ? {
          label: "Floor",
          value: row.floor,
          kind: "positive",
          description: "Any lower d20 result is treated as this value.",
        } : null,
        ...(row.mechanics || []),
      ].filter(Boolean);
      const breakdown = renderRollBreakdown(row, boss, bossActive);

      return `
        <div class="sheet-roll-row">
          <div class="sheet-roll-content">
            <div class="sheet-roll-label">${esc(row.label || "")}</div>
            ${breakdown}
            ${row.note ? `<div class="sheet-roll-note text-muted">${esc(row.note)}</div>` : ""}
            ${renderMechanicChips(mechanics)}
          </div>
          <div class="sheet-roll-values">
            ${renderStateValue(row.tamed ?? row.default ?? "-", row.boss ?? "-", bossActive, boss)}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="sheet-roll-calculator">
        <div class="sheet-subsection-title">Roll Calculator</div>
        ${rows}
      </div>
    `;
  }

  function renderRollBreakdown(row, boss, bossActive) {
    const breakdown = row.breakdown || null;
    if (!breakdown) return "";

    const tamedChips = Array.isArray(breakdown) ? breakdown : breakdown.tamed || breakdown.default || [];
    const bossChips = Array.isArray(breakdown) ? breakdown : breakdown.boss || [];

    if (!boss || !bossChips.length) {
      return renderMechanicChips(tamedChips);
    }

    if (sameChipSet(tamedChips, bossChips)) {
      return renderMechanicChips(tamedChips);
    }

    return `
      <div class="sheet-roll-breakdown">
        <div class="sheet-tamed-only" style="${stateStyle(!bossActive, true)}">
          ${renderMechanicChips(tamedChips)}
        </div>
        <div class="sheet-boss-only" style="${stateStyle(bossActive, true)}">
          ${renderMechanicChips(bossChips)}
        </div>
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
      return `
        <button type="button" class="ovh-ac-mode ${mode.active ? "active" : ""} ${mode.conditional ? "conditional" : ""} ${stateClass}"
                style="${style}" data-ac-id="${escAttr(mode.id || "")}">
          <span class="value">${esc(String(mode.value))}</span>
          <span class="name">${esc(mode.label)}</span>
          ${mode.formula ? `<span class="note">${esc(mode.formula)}</span>` : ""}
        </button>
      `;
    }).join("");

    return `<div class="ovh-ac-modes">${rows}</div>`;
  }

  function renderSpeed(speed) {
    const chips = Object.entries(speed)
      .filter(([, value]) => Number(value) > 0)
      .map(([key, value]) => ({ label: key, value: `${value}ft`, kind: "action" }));
    return chips.length ? ViewCharacterUtils.renderOvhChips(chips, { className: "ovh-chips ovh-speed-chips" }) : "";
  }

  function renderStateStatBox(label, tamedValue, bossValue, bossActive, boss) {
    return `
      <div class="ovh-stat-block">
        <div class="label">${esc(label)}</div>
        <div class="value">${renderStateValue(tamedValue ?? "-", bossValue ?? tamedValue ?? "-", bossActive, boss)}</div>
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

  function getActiveHp(character, dnd, boss) {
    if (character && typeof DndCalculations !== "undefined") {
      return DndCalculations.getActiveHp(character, boss?.bossActive ?? false);
    }
    if (!boss) return normalizeHpPool(dnd.hp || {});
    return boss.bossActive
      ? normalizeHpPool(boss.bossHp || {})
      : normalizeHpPool(boss.defaultHp || dnd.hp || {});
  }

  function normalizeHpPool(pool = {}) {
    return {
      current: Math.max(0, Number(pool.current || 0)),
      max: Math.max(0, Number(pool.max || 0)),
      temp: Math.max(0, Number(pool.temp || 0)),
    };
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
    const abilityName = Schema.ABILITY_NAMES[ability] || ability;
    const abilityAbbr = Schema.ABILITY_ABBREVIATIONS[ability] || ability.toUpperCase();

    const tamedDcBreakdown = buildSpellcastingBreakdown({
      baseLabel: "Base", baseValue: 8,
      abilityLabel: abilityName, abilityValue: baseMod,
      profBonus, bonusLabel, bonusValue: dcBonus,
      bonusDescription: `${bonusLabel} bonus from the spellcasting package.`,
      baseDescription: "Standard spell save DC base.",
      abilityDescription: `${abilityName} modifier from score ${baseScore}.`,
      profDescription: "Proficiency bonus.",
    });
    const bossDcBreakdown = buildSpellcastingBreakdown({
      baseLabel: "Base", baseValue: 8,
      abilityLabel: abilityName, abilityValue: bossMod,
      profBonus, bonusLabel, bonusValue: dcBonus,
      bonusDescription: `${bonusLabel} bonus from the spellcasting package.`,
      baseDescription: "Standard spell save DC base.",
      abilityDescription: `${abilityName} modifier from score ${bossScore}.`,
      profDescription: "Proficiency bonus.",
    });
    const tamedAttackBreakdown = buildSpellcastingBreakdown({
      abilityLabel: abilityName, abilityValue: baseMod,
      profBonus, bonusLabel, bonusValue: attackBonus,
      bonusDescription: `${bonusLabel} bonus from the spellcasting package.`,
      abilityDescription: `${abilityName} modifier from score ${baseScore}.`,
      profDescription: "Proficiency bonus.",
    });
    const bossAttackBreakdown = buildSpellcastingBreakdown({
      abilityLabel: abilityName, abilityValue: bossMod,
      profBonus, bonusLabel, bonusValue: attackBonus,
      bonusDescription: `${bonusLabel} bonus from the spellcasting package.`,
      abilityDescription: `${abilityName} modifier from score ${bossScore}.`,
      profDescription: "Proficiency bonus.",
    });

    return {
      ability,
      tamedDc: 8 + profBonus + baseMod + dcBonus,
      bossDc: 8 + profBonus + bossMod + dcBonus,
      tamedAttack: profBonus + baseMod + attackBonus,
      bossAttack: profBonus + bossMod + attackBonus,
      dcBreakdown: { tamed: tamedDcBreakdown, boss: bossDcBreakdown },
      attackBreakdown: { tamed: tamedAttackBreakdown, boss: bossAttackBreakdown },
      dcNote: `8 + ${abilityAbbr} + proficiency${dcBonus ? ` + ${bonusLabel} ${formatSigned(dcBonus)}` : ""}`,
      attackNote: `${abilityAbbr} + proficiency${attackBonus ? ` + ${bonusLabel} ${formatSigned(attackBonus)}` : ""}`,
    };
  }

  function buildSpellcastingBreakdown(options) {
    const chips = [];

    if (options.baseLabel) {
      chips.push({ label: options.baseLabel, value: options.baseValue, kind: "neutral", description: options.baseDescription || "" });
    }
    if (options.abilityLabel) {
      chips.push({ label: options.abilityLabel, value: formatSigned(options.abilityValue), kind: chipKindForValue(options.abilityValue), description: options.abilityDescription || "" });
    }
    if (options.profBonus) {
      chips.push({ label: "Proficiency", value: formatSigned(options.profBonus), kind: "positive", description: options.profDescription || "Proficiency bonus." });
    }
    if (options.bonusValue) {
      chips.push({ label: options.bonusLabel || "Bonus", value: formatSigned(options.bonusValue), kind: chipKindForValue(options.bonusValue), description: options.bonusDescription || "" });
    }

    return chips;
  }

  function sameChipSet(left, right) {
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      const a = left[i] || {};
      const b = right[i] || {};
      if (a.kind !== b.kind || a.label !== b.label || String(a.value ?? "") !== String(b.value ?? "")) return false;
    }
    return true;
  }

  function chipKindForValue(value) {
    const number = Number(value || 0);
    if (number < 0) return "negative";
    if (number > 0) return "positive";
    return "neutral";
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

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".ovh-ac-modes").forEach(row => {
      row.querySelectorAll(".ovh-ac-mode").forEach(btn => {
        if (btn.dataset.wired === "true") return;
        btn.dataset.wired = "true";
        btn.addEventListener("click", () => {
          row.querySelectorAll(".ovh-ac-mode").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const newAc = btn.querySelector(".value")?.textContent?.trim();
          if (!newAc) return;
          containerEl.querySelectorAll(".ovh-quickstat").forEach(qs => {
            if (qs.querySelector(".label")?.textContent?.trim() === "AC") {
              const valEl = qs.querySelector(".value");
              if (valEl) valEl.textContent = newAc;
            }
          });
        });
      });
    });
  }

  return {
    renderCombatBlock,
    renderAbilityScores,
    renderSavingThrows,
    renderSkills,
    renderFeatsAndMulticlass,
    wireInteractive,
  };

})();
