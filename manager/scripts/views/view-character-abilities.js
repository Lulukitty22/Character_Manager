/**
 * view-character-abilities.js
 * General ability / trait section rendering.
 */

const ViewCharacterAbilities = (() => {

  const esc = ViewCharacterUtils.esc;
  const renderMechanicChips = ViewCharacterUtils.renderMechanicChips;

  function render(abilities) {
    if (!abilities || !abilities.length) return "";

    const entries = abilities.map(ability => {
      const tags = (ability.tags || []).map(t => `<span class="sheet-tag">${esc(t)}</span>`).join("");
      const mechanics = [
        ability.type ? { label: "Type", value: ability.type.replace(/_/g, " "), kind: abilityKind(ability.type) } : null,
        ability.active ? { label: "Active", kind: "positive" } : null,
        ...(ability.addons?.mechanics || []),
      ].filter(Boolean);

      return `
        <details class="sheet-ability-entry sheet-record-card sheet-compact-record" data-sheet-record="${ViewCharacterUtils.encodeDataAttr(buildAbilityViewerRecord(ability, mechanics))}">
          <summary class="sheet-compact-summary">
            <div class="sheet-ability-content">
              <div class="sheet-ability-header sheet-record-card-header">
                <span class="sheet-ability-name">${esc(ability.name || "(Unnamed)")}</span>
                <div class="sheet-record-card-actions">
                  <button type="button" class="sheet-inline-button sheet-open-record-viewer">View</button>
                </div>
              </div>
              ${renderMechanicChips(mechanics)}
            </div>
          </summary>
          <div class="sheet-compact-body">
            ${ability.description ? `<div class="sheet-ability-desc text-sm">${esc(ability.description)}</div>` : ""}
            ${tags ? `<div class="sheet-ability-tags">${tags}</div>` : ""}
          </div>
        </details>`;
    }).join("");

    return `
      <section class="sheet-section">
        <h2 class="sheet-section-title">⚡ Abilities &amp; Traits</h2>
        <div class="sheet-ability-list">${entries}</div>
      </section>
    `;
  }

  function abilityKind(type) {
    if (["action", "bonus_action", "reaction", "legendary", "lair"].includes(type)) return "action";
    if (type === "passive") return "duration";
    return "neutral";
  }

  function buildAbilityViewerRecord(ability, mechanics) {
    return {
      kicker: "Ability",
      title: ability.name || "(Unnamed Ability)",
      subtitle: ability.type ? ability.type.replace(/_/g, " ") : "",
      description: ability.description || "",
      chips: mechanics,
      raw: ability,
    };
  }

  function wireInteractive(containerEl) {
    containerEl.querySelectorAll(".sheet-ability-entry .sheet-open-record-viewer").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const row = button.closest(".sheet-ability-entry");
        ViewCharacterUtils.openRecordViewer(ViewCharacterUtils.decodeDataAttr(row?.dataset.sheetRecord, {}));
      });
    });
  }

  return { render, wireInteractive };

})();
