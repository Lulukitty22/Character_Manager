/**
 * view-character-abilities.js
 * General ability / trait section rendering.
 */

const ViewCharacterAbilities = (() => {

  const esc = ViewCharacterUtils.esc;

  function render(abilities) {
    if (!abilities || !abilities.length) return "";

    const entries = abilities.map(ability => {
      const typeBadge = ability.type ? `<span class="sheet-ability-type-badge">${esc(ability.type.replace(/_/g, " "))}</span>` : "";
      const activeBadge = ability.active ? `<span class="sheet-ability-active-badge">Active</span>` : "";
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
        </div>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚡ Abilities &amp; Traits</h2>
        <div class="sheet-ability-list">${entries}</div>
      </section>
    `;
  }

  return { render };

})();
