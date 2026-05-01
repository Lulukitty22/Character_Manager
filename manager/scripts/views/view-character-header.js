/**
 * view-character-header.js
 * Character sheet header shell.
 */

const ViewCharacterHeader = (() => {

  const esc = ViewCharacterUtils.esc;

  function render(character) {
    const identity = character.identity || {};
    const dnd = character.dnd || null;

    const presentation = Schema.getCharacterPresentation(character);
    const name = identity.name || "(Unnamed)";
    const aliases = identity.aliases || [];
    const tags = identity.tags || [];

    const subtitleParts = [];
    if (dnd?.class) {
      const classStr = [dnd.class, dnd.subclass].filter(Boolean).join(" / ");
      subtitleParts.push(dnd.level ? `${classStr} — Level ${dnd.level}` : classStr);
      const multiclass = (dnd.multiclass || []).map(mc =>
        [mc.class, mc.subclass, mc.level ? `Lv.${mc.level}` : ""].filter(Boolean).join(" / ")
      );
      subtitleParts.push(...multiclass);
    }
    if (identity.race) subtitleParts.push(identity.race);
    if (dnd?.background) subtitleParts.push(dnd.background);
    if (dnd?.alignment) subtitleParts.push(dnd.alignment);

    const tagBadges = tags.map(tag => `<span class="sheet-tag">${esc(tag)}</span>`).join("");
    const aliasBadges = aliases.map(alias => `<span class="sheet-alias">"${esc(alias)}"</span>`).join(" ");
    const subtitleHTML = subtitleParts.map(part => `<span class="sheet-subtitle-item">${esc(part)}</span>`).join("");

    return `
      <div class="sheet-header">
        <div class="sheet-type-badge">${presentation.icon} ${esc(presentation.label)}</div>
        <h1 class="sheet-character-name">${esc(name)}</h1>
        ${aliasBadges ? `<div class="sheet-aliases">${aliasBadges}</div>` : ""}
        ${subtitleHTML ? `<div class="sheet-subtitle-row">${subtitleHTML}</div>` : ""}
        ${tagBadges ? `<div class="sheet-tags">${tagBadges}</div>` : ""}
      </div>
    `;
  }

  return { render };

})();
