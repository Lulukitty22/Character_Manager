/**
 * view-character-header.js
 * Sticky head for the sheet — character name (shimmer), subtitle,
 * quickstats (HP/AC/Init/Spd), and tab nav. Replaces the old flat
 * sheet-header block.
 */

const ViewCharacterHeader = (() => {

  const esc = ViewCharacterUtils.esc;

  function pickActiveAc(dnd) {
    const modes = dnd?.acModes || [];
    const active = modes.find(m => m.active) || modes[0];
    return active ? { value: active.value, label: active.label } : { value: dnd?.ac ?? "—", label: "" };
  }

  function hpClass(current, max) {
    if (!max) return "";
    const pct = (current / max) * 100;
    if (pct < 33) return "low";
    if (pct < 66) return "medium";
    return "";
  }

  /**
   * Render the sticky head + tab nav. Tabs are emitted with `data-ovh-tab`
   * attributes; the panel container in view-character.js matches by id.
   */
  function render(character, tabs) {
    const identity = character.identity || {};
    const dnd = character.dnd || null;

    const presentation = Schema.getCharacterPresentation(character);
    const name = identity.name || "(Unnamed)";

    const subtitleParts = [];
    if (identity.race) subtitleParts.push(identity.race);
    if (dnd?.class) {
      const classStr = [dnd.class, dnd.subclass].filter(Boolean).join(" / ");
      subtitleParts.push(dnd.level ? `${classStr} ${dnd.level}` : classStr);
      const multiclass = (dnd.multiclass || []).map(mc =>
        [mc.class, mc.subclass, mc.level ? `Lv.${mc.level}` : ""].filter(Boolean).join(" / ")
      );
      subtitleParts.push(...multiclass);
    }
    if (dnd?.background) subtitleParts.push(dnd.background);
    const subtitle = subtitleParts.join(" • ");

    const hp = dnd?.hp || {};
    const hpClassName = hpClass(hp.current, hp.max);
    const ac = pickActiveAc(dnd);
    const init = dnd?.initiative != null ? (dnd.initiative >= 0 ? `+${dnd.initiative}` : `${dnd.initiative}`) : "—";
    const speed = dnd?.speed?.walk ?? dnd?.speed ?? "—";

    const quickstatsHTML = dnd ? `
      <div class="ovh-quickstats">
        <div class="ovh-quickstat hp ${hpClassName}" title="HP ${hp.current ?? "?"} / ${hp.max ?? "?"}">
          <span class="label">HP</span>
          <span class="value">${hp.current ?? "—"}/${hp.max ?? "—"}</span>
        </div>
        <div class="ovh-quickstat" title="AC${ac.label ? " — " + ac.label : ""}">
          <span class="label">AC</span>
          <span class="value">${ac.value}</span>
        </div>
        <div class="ovh-quickstat" title="Initiative">
          <span class="label">Init</span>
          <span class="value">${init}</span>
        </div>
        <div class="ovh-quickstat" title="Speed">
          <span class="label">Spd</span>
          <span class="value">${speed}</span>
        </div>
      </div>
    ` : "";

    const tabsHTML = (tabs || []).map((t, i) => `
      <button class="ovh-tab ${i === 0 ? "active" : ""}" data-ovh-tab="${esc(t.id)}">
        ${esc(t.label)}
      </button>
    `).join("");

    return `
      <div class="ovh-sticky-head">
        <div class="ovh-head-row">
          <div>
            <div class="sheet-type-badge">${presentation.icon} ${esc(presentation.label)}</div>
            <h1 class="ovh-head-name ovh-shimmer-gold">${esc(name)}</h1>
            ${subtitle ? `<div class="ovh-head-subtitle">${esc(subtitle)}</div>` : ""}
          </div>
          ${quickstatsHTML}
        </div>
        <div class="ovh-tab-row">
          ${tabsHTML}
        </div>
      </div>
    `;
  }

  return { render };

})();
