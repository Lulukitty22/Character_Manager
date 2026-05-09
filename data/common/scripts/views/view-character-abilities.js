/**
 * view-character-abilities.js
 * General ability / trait section rendering.
 */

const ViewCharacterAbilities = (() => {

  const esc = ViewCharacterUtils.esc;

  const SVG_DIV = `<svg viewBox="0 0 600 14" preserveAspectRatio="none" aria-hidden="true"><path d="M0 7 L240 7 M260 7 Q300 -1 340 7 L600 7" stroke="rgba(201,168,76,0.55)" stroke-width="1" fill="none"/><circle cx="300" cy="7" r="2" fill="rgba(201,168,76,0.85)"/></svg>`;

  function render(abilities) {
    if (!abilities || !abilities.length) return "";

    const entries = abilities.map(ability => {
      const mechanics = [
        ability.type ? { label: "Type", value: ability.type.replace(/_/g, " "), kind: abilityKind(ability.type) } : null,
        ability.active ? { label: "Active", kind: "positive" } : null,
        ...(Array.isArray(ability.addons?.mechanics) ? ability.addons.mechanics : []),
      ].filter(Boolean);

      const tags = (ability.tags || []).map(t => ({ label: t, kind: "neutral" }));

      return `
        <details class="ovh-record ovh-ability-record sheet-record-card" data-sheet-record="${ViewCharacterUtils.encodeDataAttr(buildAbilityViewerRecord(ability, mechanics))}">
          <summary class="title-block">
            <span class="title">${esc(ability.name || "(Unnamed)")}</span>
            ${ViewCharacterUtils.renderOvhChips(mechanics, { className: "quick-chips" })}
            <button type="button" class="ovh-view-button sheet-open-record-viewer">View</button>
          </summary>
          <div class="body">
            ${ability.description ? `<div class="desc">${esc(ability.description)}</div>` : ""}
            ${tags.length ? ViewCharacterUtils.renderOvhChips(tags) : ""}
          </div>
        </details>`;
    }).join("");

    return `
      <section class="ovh-section ovh-abilities-section">
        <div class="ovh-section-header">
          <h2>Abilities &amp; Traits</h2>
          <div class="ovh-section-divider">${SVG_DIV}</div>
        </div>
        <div class="ovh-ability-list">${entries}</div>
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

  function wireInteractive(_containerEl) {}

  return { render, wireInteractive };

})();
