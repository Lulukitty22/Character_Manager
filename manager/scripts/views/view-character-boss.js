/**
 * view-character-boss.js
 * Boss toggle UI and boss-specific sections.
 */

const ViewCharacterBoss = (() => {

  const esc = ViewCharacterUtils.esc;

  function renderToggleBar(boss) {
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

  function applyBossToggle(sheetRoot, character, bossActive) {
    const boss = character.boss || {};

    const btn = sheetRoot.querySelector(".sheet-boss-toggle-btn");
    if (btn) {
      btn.textContent = bossActive ? "💀 Boss Mode Active" : "🐾 Tamed Mode";
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

  function renderAttacks(boss) {
    const isActive = boss.bossActive ?? false;
    const attacks = boss.attacks || [];
    if (!attacks.length) return "";

    const rows = attacks.map(attack => {
      const hitBonus = Schema.formatModifier(attack.toHitBonus || 0);
      const advantage = attack.advantage ? `<span class="sheet-tag">Advantage</span>` : "";
      const dmgParts = (attack.damage || []).map(roll =>
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
          ${attack.onHit ? `<div class="sheet-attack-onhit text-sm text-muted">On hit: ${esc(attack.onHit)}</div>` : ""}
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

  function renderBossDefences(boss) {
    const isActive = boss.bossActive ?? false;
    const resistances = parseBadgeList(boss.resistances);
    const immunities = parseBadgeList(boss.immunities);
    const condImmune = parseBadgeList(boss.conditionImmunities);
    const weaknesses = boss.weaknesses || [];

    if (!resistances.length && !immunities.length && !condImmune.length && !weaknesses.length) return "";

    const resistBadges = resistances.map(r => `<span class="sheet-resistance-badge resist">${esc(r)}</span>`).join("");
    const immuneBadges = immunities.map(i => `<span class="sheet-resistance-badge immune">${esc(i)}</span>`).join("");
    const condBadges = condImmune.map(c => `<span class="sheet-resistance-badge condition-immune">${esc(c)}</span>`).join("");
    const weakEntries = weaknesses.map(w => `<div class="sheet-weakness-entry text-sm">⚠ ${esc(w.description || "")}</div>`).join("");

    return `
      <section class="sheet-section sheet-boss-only" style="${isActive ? "" : "display:none"}">
        <h2 class="sheet-section-title">🛡 Defences</h2>
        ${resistBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Resistances</span><div class="sheet-resistance-badges">${resistBadges}</div></div>` : ""}
        ${immuneBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Damage Immunities</span><div class="sheet-resistance-badges">${immuneBadges}</div></div>` : ""}
        ${condBadges ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Condition Immunities</span><div class="sheet-resistance-badges">${condBadges}</div></div>` : ""}
        ${weakEntries ? `<div class="sheet-resistance-group"><span class="sheet-resistance-group-label text-muted text-sm">Weaknesses</span><div>${weakEntries}</div></div>` : ""}
      </section>
    `;
  }

  function parseBadgeList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(",").map(s => s.trim()).filter(Boolean);
  }

  function renderPolymorphTraits(boss) {
    const isActive = boss.bossActive ?? false;
    const traits = boss.polymorphTraits || [];
    if (!traits.length) return "";

    const cards = traits.map(trait => `
      <div class="sheet-polymorph-card ${trait.active ? "active" : ""}">
        <div class="sheet-polymorph-name">${esc(trait.name || "(Unnamed)")}</div>
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

  return {
    renderToggleBar,
    wireInteractive,
    renderAttacks,
    renderBossDefences,
    renderPolymorphTraits,
    renderBossSpecialRules,
  };

})();
