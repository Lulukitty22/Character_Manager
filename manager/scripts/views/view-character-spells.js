/**
 * view-character-spells.js
 * Spell list rendering.
 */

const ViewCharacterSpells = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderMechanicChips = ViewCharacterUtils.renderMechanicChips;

  function render(spells, spellSlots = {}) {
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
    const mechanics = [
      ...spellAccessChips(spell),
      spell.castingTime ? { label: "Cast", value: spell.castingTime, kind: "action" } : null,
      spell.range ? { label: "Range", value: spell.range, kind: "range" } : null,
      components ? {
        label: "Components",
        value: components,
        kind: "component",
        description: "Spell components required to cast this spell.",
      } : null,
      spell.duration ? { label: "Duration", value: spell.duration, kind: "duration" } : null,
      spell.addons?.ritual?.enabled ? {
        label: "Ritual",
        kind: "positive",
        description: "Can be cast as a ritual if the caster has the right feature or permission.",
      } : null,
      spell.addons?.concentration?.enabled ? {
        label: "Concentration",
        kind: "requirement",
        description: "Requires concentration; taking damage or losing focus can end the spell.",
      } : null,
      ...spellDamageChips(spell),
      ...(spell.addons?.mechanics || []),
    ].filter(Boolean);
    const mechanicChips = renderMechanicChips(mechanics);
    const tags = (spell.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");

    return `
      <div class="sheet-spell-entry sheet-record-card" data-sheet-record="${ViewCharacterUtils.encodeDataAttr(buildSpellViewerRecord(spell, mechanics))}">
        <div class="sheet-spell-prepared-dot ${spell.prepared ? "prepared" : ""}"></div>
        <div class="sheet-spell-content">
          <div class="sheet-record-card-header">
            <div>
              <div class="sheet-spell-name">
                ${esc(spell.name || "(Unnamed spell)")}
                ${spell.school ? `<span class="sheet-spell-school text-muted">${esc(spell.school)}</span>` : ""}
              </div>
            </div>
            <div class="sheet-record-card-actions">
              <button type="button" class="sheet-inline-button sheet-open-record-viewer">View</button>
            </div>
          </div>
          ${mechanicChips}
          ${spell.description ? `<div class="sheet-spell-desc text-sm">${esc(spell.description)}</div>` : ""}
          ${tags ? `<div class="sheet-spell-tags">${tags}</div>` : ""}
        </div>
      </div>`;
  }

  function spellDamageChips(spell) {
    const damage = spell.addons?.damage || {};
    const area = spell.addons?.area || {};
    const chips = [];

    if (damage.roll) {
      const types = Array.isArray(damage.types) ? damage.types.join(", ") : damage.types || "";
      chips.push({
        label: "Damage",
        value: [damage.roll, types].filter(Boolean).join(" "),
        kind: "damage",
      });
    }

    if (damage.savingThrow) {
      chips.push({
        label: "Save",
        value: damage.savingThrow,
        kind: "requirement",
      });
    }

    if (area.shape || area.size) {
      chips.push({
        label: "Area",
        value: [area.size, area.unit, area.shape].filter(Boolean).join(" "),
        kind: "range",
      });
    }

    return chips;
  }

  function spellAccessChips(spell) {
    const access = spell.access || spell.addons?.access || {};
    const chips = [];

    if (spell.prepared) {
      chips.push({
        label: access.preparedLabel || "Prepared",
        kind: "positive",
        description: "This spell is ready for active use on the sheet.",
      });
    } else if (access.showKnown !== false) {
      chips.push({
        label: access.knownLabel || "Known",
        kind: "neutral",
        description: "Known or available, but not currently marked prepared.",
      });
    }

    if (access.label || access.state) {
      chips.push({
        label: access.label || access.state,
        value: access.value || "",
        kind: access.kind || "neutral",
        description: access.description || access.note || "",
        relatedRoll: access.relatedRoll || "",
      });
    }

    (access.chips || []).forEach(chip => chips.push(chip));
    return chips;
  }

  function buildSpellViewerRecord(spell, mechanics) {
    return {
      kicker: "Spell",
      title: spell.name || "(Unnamed Spell)",
      subtitle: [Number(spell.level || 0) === 0 ? "Cantrip" : `Level ${Number(spell.level || 0)}`, spell.school || ""].filter(Boolean).join(" | "),
      description: spell.description || "",
      chips: mechanics,
      sections: [
        {
          title: "Casting",
          content: [
            spell.castingTime ? `Casting Time: ${spell.castingTime}` : "",
            spell.range ? `Range: ${spell.range}` : "",
            spell.duration ? `Duration: ${spell.duration}` : "",
            (spell.components || []).length ? `Components: ${(spell.components || []).join(", ")}` : "",
          ].filter(Boolean).join("\n"),
        },
      ].filter(section => section.content),
      raw: spell,
    };
  }

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".sheet-spell-entry .sheet-open-record-viewer").forEach(button => {
      button.addEventListener("click", () => {
        const row = button.closest(".sheet-spell-entry");
        ViewCharacterUtils.openRecordViewer(ViewCharacterUtils.decodeDataAttr(row?.dataset.sheetRecord, {}));
      });
    });
  }

  return { render, wireInteractive };

})();
