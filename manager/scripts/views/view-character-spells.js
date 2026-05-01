/**
 * view-character-spells.js
 * Spell list rendering.
 */

const ViewCharacterSpells = (() => {

  const esc = ViewCharacterUtils.esc;

  function render(spells, spellSlots) {
    if (!spells || !spells.length) return "";

    const grouped = {};
    spells.forEach(spell => {
      const level = spell.level ?? 0;
      if (!grouped[level]) grouped[level] = [];
      grouped[level].push(spell);
    });

    const levelGroups = Object.keys(grouped).map(Number).sort((a, b) => a - b).map(level => {
      const levelLabel = level === 0 ? "Cantrips" : `Level ${level}`;
      const slot = spellSlots[level];
      const slotDisplay = slot ? `<span class="sheet-spell-slot-tracker">${renderSlotPips(slot.current, slot.max)}</span>` : "";
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
      spell.range ? `Range: ${esc(spell.range)}` : "",
      components ? `Components: ${esc(components)}` : "",
      spell.duration ? `Duration: ${esc(spell.duration)}` : "",
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

  return { render };

})();
