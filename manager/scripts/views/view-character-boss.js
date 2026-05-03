/**
 * view-character-boss.js
 * Boss toggle UI and boss-specific sections.
 */

const ViewCharacterBoss = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderMechanicChips = ViewCharacterUtils.renderMechanicChips;

  function renderToggleBar(boss) {
    const isActive = boss.bossActive ?? false;
    const stateModel = boss.addons?.stateModel || {};
    const activeLabel = stateModel.bossLabel || "Boss Mode Active";
    const tamedLabel = stateModel.tamedLabel || "Tamed Mode";

    return `
      <div class="sheet-boss-toggle-bar">
        <button class="sheet-boss-toggle-btn ${isActive ? "active" : ""}">
          ${esc(isActive ? activeLabel : tamedLabel)}
        </button>
        <span class="text-muted text-sm">Click to preview the other state</span>
      </div>
    `;
  }

  function wireInteractive(containerEl, character) {
    const sheetRoot = containerEl.querySelector(".sheet-root");
    const toggleBtn = containerEl.querySelector(".sheet-boss-toggle-btn");
    if (!toggleBtn || !sheetRoot || !character.boss) return;

    applyBossToggle(sheetRoot, character, sheetRoot.dataset.bossActive === "true");

    toggleBtn.addEventListener("click", () => {
      const isActive = sheetRoot.dataset.bossActive === "true";
      const newActive = !isActive;
      sheetRoot.dataset.bossActive = String(newActive);
      applyBossToggle(sheetRoot, character, newActive);
    });
  }

  function applyBossToggle(sheetRoot, character, bossActive) {
    const boss = character.boss || {};
    const stateModel = boss.addons?.stateModel || {};
    const activeLabel = stateModel.bossLabel || "Boss Mode Active";
    const tamedLabel = stateModel.tamedLabel || "Tamed Mode";

    sheetRoot.classList.toggle("is-boss-active", bossActive);
    sheetRoot.classList.toggle("is-tamed-active", !bossActive);

    const btn = sheetRoot.querySelector(".sheet-boss-toggle-btn");
    if (btn) {
      btn.textContent = bossActive ? activeLabel : tamedLabel;
      btn.classList.toggle("active", bossActive);
    }

    const hp = bossActive ? (boss.bossHp || { current: 0, max: 0 }) : (boss.defaultHp || { current: 0, max: 0 });
    const percent = hp.max > 0 ? Math.round((hp.current / hp.max) * 100) : 0;
    const hpClass = percent >= 60 ? "" : percent >= 30 ? "medium" : "low";

    const hpCurrentEl = sheetRoot.querySelector(".sheet-hp-current");
    const hpMaxEl = sheetRoot.querySelector(".sheet-hp-max");
    const hpBarEl = sheetRoot.querySelector(".hp-bar-fill");
    if (hpCurrentEl) hpCurrentEl.textContent = hp.current;
    if (hpMaxEl) hpMaxEl.textContent = hp.max;
    if (hpBarEl) {
      hpBarEl.style.width = `${percent}%`;
      hpBarEl.className = `hp-bar-fill ${hpClass}`;
    }

    sheetRoot.querySelectorAll(".sheet-boss-only").forEach(el => {
      el.style.display = bossActive ? "" : "none";
    });
    sheetRoot.querySelectorAll(".sheet-tamed-only").forEach(el => {
      el.style.display = bossActive ? "none" : "";
    });
  }

  function renderAttacks(boss, dnd = null) {
    const isActive = boss.bossActive ?? false;
    const attacks = boss.attacks || [];
    if (!attacks.length) return "";

    const rows = attacks.map(attack => {
      const toHit = getAttackToHit(attack, dnd, boss);
      const hitBonus = Schema.formatModifier(toHit.boss);
      const advantage = attack.advantage || toHit.advantage ? `<span class="sheet-tag">Advantage</span>` : "";
      const dmgParts = (attack.damage || []).map(roll =>
        `${roll.dice}${roll.bonus ? `+${roll.bonus}` : ""} ${esc(roll.type)}`
      ).join(" + ");
      const avgDmg = attack.avgDamage > 0 ? `(avg ${attack.avgDamage})` : "";
      const formula = renderAttackBreakdown(toHit.breakdown, isActive, boss);
      const mechanics = renderMechanicChips([
        attack.reach ? { label: "Reach", value: attack.reach, kind: "range" } : null,
        dmgParts ? { label: "Damage", value: `${dmgParts} ${avgDmg}`.trim(), kind: "damage" } : null,
        attack.onHit ? {
          label: "On Hit",
          kind: "action",
          description: attack.onHit,
        } : null,
        ...(attack.addons?.mechanics || []),
      ].filter(Boolean));

      return `
        <div class="sheet-attack-row">
          <div class="sheet-attack-header">
            <span class="sheet-attack-name">${esc(attack.name || "(Unnamed)")}</span>
            ${advantage}
          </div>
          <div class="sheet-attack-stats text-sm">
            <span><strong>To Hit:</strong> ${hitBonus}</span>
            ${toHit.tamed !== toHit.boss ? `<span><strong>Tamed:</strong> ${Schema.formatModifier(toHit.tamed)}</span>` : ""}
            <span><strong>Reach:</strong> ${esc(attack.reach || "5 ft")}</span>
            ${dmgParts ? `<span><strong>Damage:</strong> ${dmgParts} ${avgDmg}</span>` : ""}
          </div>
          ${formula}
          ${mechanics}
          ${attack.onHit ? `<div class="sheet-attack-onhit text-sm text-muted">On hit: ${esc(attack.onHit)}</div>` : ""}
          ${attack.description ? `<div class="sheet-attack-desc text-sm">${esc(attack.description)}</div>` : ""}
        </div>`;
    }).join("");

    const actionEconomy = renderActionEconomy(boss);

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">Attacks</h2>
        ${actionEconomy}
        <div class="sheet-attack-list">${rows}</div>
      </section>
    `;
  }

  function renderBossDefences(boss) {
    const isActive = boss.bossActive ?? false;
    const resistances = parseBadgeList(boss.resistances);
    const immunities = parseBadgeList(boss.immunities);
    const condImmune = parseBadgeList(boss.conditionImmunities);
    const weaknesses = boss.weaknesses || [];

    if (!resistances.length && !immunities.length && !condImmune.length && !weaknesses.length) return "";

    const resistBadges = renderDefenceChips(resistances, "resistance");
    const immuneBadges = renderDefenceChips(immunities, "immunity");
    const condBadges = renderDefenceChips(condImmune, "condition");
    const weakEntries = renderDefenceChips(weaknesses.map(w => ({
      label: w.label || w.name || "Weakness",
      description: w.description || "",
      kind: w.kind || "negative",
      relatedRoll: w.relatedRoll || "",
    })), "negative");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">Defences</h2>
        ${resistBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Resistances</span><div class="sheet-resistance-badges">${resistBadges}</div></div>` : ""}
        ${immuneBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Damage Immunities</span><div class="sheet-resistance-badges">${immuneBadges}</div></div>` : ""}
        ${condBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Condition Immunities</span><div class="sheet-resistance-badges">${condBadges}</div></div>` : ""}
        ${weakEntries ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Weaknesses</span>${weakEntries}</div>` : ""}
      </section>
    `;
  }

  function renderPolymorphTraits(boss) {
    const isActive = boss.bossActive ?? false;
    const traits = boss.polymorphTraits || [];
    if (!traits.length) return "";

    const limit = boss.addons?.calculations?.polymorphTraitLimit;
    const cards = traits.map(trait => `
      <div class="sheet-polymorph-card ${trait.active ? "active" : ""}">
        <div class="sheet-polymorph-name">${esc(trait.name || "(Unnamed)")}</div>
        ${trait.description ? `<div class="sheet-polymorph-desc text-sm">${esc(trait.description)}</div>` : ""}
        ${trait.active ? `<span class="sheet-polymorph-active-badge">Active</span>` : ""}
      </div>
    `).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">Flesh Polymorph Traits</h2>
        ${limit ? `<p class="text-muted text-sm" style="margin-bottom:var(--space-2)">Usually keep up to ${limit} major traits active at once.</p>` : ""}
        <div class="sheet-polymorph-grid">${cards}</div>
      </section>
    `;
  }

  function renderBossSpecialRules(boss) {
    const balanceKnobs = boss.addons?.balanceKnobs || [];
    if (!boss.deathRule && !boss.tamedRule && !balanceKnobs.length) return "";

    const knobRows = balanceKnobs.map(knob => `
      <div class="sheet-special-rule">
        <span class="sheet-special-rule-label">${esc(knob.label || "Balance")}</span>
        <p class="sheet-prose text-sm">${esc(knob.description || "")}</p>
      </div>
    `).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">Special Rules</h2>
        ${boss.deathRule ? `<div class="sheet-special-rule"><span class="sheet-special-rule-label">Death / Vessel Rule</span><p class="sheet-prose text-sm">${esc(boss.deathRule)}</p></div>` : ""}
        ${boss.tamedRule ? `<div class="sheet-special-rule"><span class="sheet-special-rule-label">Tamed Rule</span><p class="sheet-prose text-sm">${esc(boss.tamedRule)}</p></div>` : ""}
        ${knobRows}
      </section>
    `;
  }

  function renderActionEconomy(boss) {
    const action = boss.addons?.calculations?.actionEconomy;
    if (!action) return "";

    const entries = [
      action.attackAction ? ["Attack action", `${action.attackAction} attacks`] : null,
      action.bonusAttack ? ["Bonus attack", `+${action.bonusAttack}`] : null,
      action.legendaryActionAttacks ? ["Legendary action", `+${action.legendaryActionAttacks}`] : null,
      action.maxPressure ? ["Max pressure", `${action.maxPressure} attacks/round`] : null,
    ].filter(Boolean);

    if (!entries.length) return "";

    return `
      <div class="sheet-action-economy">
        ${entries.map(([label, value]) => `
          <div class="sheet-action-economy-item">
            <span>${esc(label)}</span>
            <strong>${esc(value)}</strong>
          </div>
        `).join("")}
      </div>
    `;
  }

  function getAttackToHit(attack, dnd, boss) {
    const formula = attack.toHitFormula || {};
    if (!dnd || !formula.ability) {
      return {
        tamed: Number(attack.tamedToHitBonus ?? attack.toHitBonus ?? 0),
        boss: Number(attack.toHitBonus ?? 0),
        advantage: Boolean(attack.advantage),
        breakdown: null,
      };
    }

    const ability = formula.ability;
    const prof = formula.proficiency ? Number(dnd.proficiencyBonus || 2) : 0;
    const bonusTotal = (formula.bonuses || []).reduce((sum, bonus) => sum + Number(bonus.value || 0), 0);
    const baseScore = Number(dnd.stats?.[ability]?.score ?? 10);
    const bossScore = baseScore + Number(boss?.bossStatBonuses?.[ability] ?? 0);
    const abilityLabel = Schema.ABILITY_NAMES[ability] || ability;
    const tamed = Schema.getAbilityModifier(baseScore) + prof + bonusTotal;
    const bossValue = Schema.getAbilityModifier(bossScore) + prof + bonusTotal;
    const tamedBreakdown = buildAttackBreakdown({
      abilityLabel,
      abilityValue: Schema.getAbilityModifier(baseScore),
      proficiencyValue: prof,
      bonuses: formula.bonuses || [],
      bonusPrefix: "",
      score: baseScore,
    });
    const bossBreakdown = buildAttackBreakdown({
      abilityLabel,
      abilityValue: Schema.getAbilityModifier(bossScore),
      proficiencyValue: prof,
      bonuses: formula.bonuses || [],
      bonusPrefix: "",
      score: bossScore,
    });

    return {
      tamed,
      boss: bossValue,
      advantage: Boolean(attack.advantage || formula.advantageWhenBoss),
      breakdown: {
        tamed: tamedBreakdown,
        boss: bossBreakdown,
      },
    };
  }

  function renderAttackBreakdown(breakdown, bossActive, boss) {
    if (!breakdown) return "";

    const tamedChips = Array.isArray(breakdown) ? breakdown : breakdown.tamed || breakdown.default || [];
    const bossChips = Array.isArray(breakdown) ? breakdown : breakdown.boss || [];

    if (!boss || !bossChips.length || sameChipSet(tamedChips, bossChips)) {
      return `<div class="sheet-attack-formula text-sm text-muted">${renderMechanicChips(tamedChips)}</div>`;
    }

    return `
      <div class="sheet-attack-formula text-sm text-muted">
        <div class="sheet-tamed-only" style="${stateStyle(!bossActive)}">${renderMechanicChips(tamedChips)}</div>
        <div class="sheet-boss-only" style="${stateStyle(bossActive)}">${renderMechanicChips(bossChips)}</div>
      </div>
    `;
  }

  function buildAttackBreakdown(options) {
    const chips = [];

    if (options.abilityLabel) {
      chips.push({
        label: options.abilityLabel,
        value: Schema.formatModifier(Number(options.abilityValue || 0)),
        kind: chipKindForValue(options.abilityValue),
        description: `${options.abilityLabel} modifier from score ${options.score}.`,
      });
    }

    if (Number(options.proficiencyValue || 0)) {
      chips.push({
        label: "Proficiency",
        value: Schema.formatModifier(Number(options.proficiencyValue || 0)),
        kind: chipKindForValue(options.proficiencyValue),
        description: "Proficiency bonus.",
      });
    }

    (options.bonuses || []).forEach(bonus => {
      const value = Number(bonus.value || 0);
      chips.push({
        label: bonus.label || "Bonus",
        value: Schema.formatModifier(value),
        kind: chipKindForValue(value),
        description: bonus.description || `${bonus.label || "Bonus"} bonus.`,
      });
    });

    return chips;
  }

  function parseBadgeList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(",").map(s => s.trim()).filter(Boolean);
  }

  function renderDefenceChips(entries, kind) {
    const chips = (entries || []).map(entry => {
      if (typeof entry === "string") return { label: entry, kind };
      return {
        ...entry,
        label: entry.label || entry.name || entry.description || kind,
        kind: entry.kind || kind,
      };
    });
    return renderMechanicChips(chips, { kind });
  }

  function sameChipSet(left, right) {
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      const a = left[i] || {};
      const b = right[i] || {};
      if (a.kind !== b.kind || a.label !== b.label || String(a.value ?? "") !== String(b.value ?? "")) {
        return false;
      }
    }
    return true;
  }

  function chipKindForValue(value) {
    const number = Number(value || 0);
    if (number < 0) return "negative";
    if (number > 0) return "positive";
    return "neutral";
  }

  function stateStyle(isVisible) {
    return isVisible ? "" : "display:none";
  }

  return {
    renderToggleBar,
    wireInteractive,
    renderAttacks,
    renderBossDefences,
    renderPolymorphTraits,
    renderBossSpecialRules,
  };

})();
